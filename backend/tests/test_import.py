import io
import json
from unittest.mock import Mock

import pytest
from reportlab.pdfgen import canvas

import job_import
from public_web import SourceError


POSTING_TEXT = b'Job title: Developer\nCompany: Acme\nMake useful software for people.'


def test_jsonld_graph_and_review_fields():
    posting = {'@graph': [{'@type': ['Thing', 'JobPosting'], 'title': 'Developer',
        'hiringOrganization': {'name': 'Acme'}, 'description': '<p>Build accessible software applications with a team.</p>',
        'employmentType': ['INTERN'], 'baseSalary': {'value': {'minValue': 20, 'maxValue': 30}},
        'skills': 'Python; SQL, React'}]}
    data = (f'<html><script type="application/ld+json">invalid</script>'
            f'<script type="application/ld+json">{json.dumps(posting)}</script>'
            '<p>Build accessible software applications with a team.</p></html>').encode()

    result = job_import.parse_job(data, 'text/html')
    assert result == {
        'title': 'Developer', 'company_name': 'Acme',
        'job_type': 'internship', 'salary_low': '20', 'salary_high': '30',
        'required_skills': ['Python', 'SQL', 'React'], 'preferred_skills': [], 'perks': [],
        'about': 'Build accessible software applications with a team.',
    }


@pytest.mark.parametrize('employment', [{'invalid': 'shape'}, [{'invalid': 'shape'}]])
def test_unrecognized_employment_metadata_is_left_blank(employment):
    metadata = json.dumps({'@type': 'JobPosting', 'title': 'Developer', 'employmentType': employment})
    html = f'<script type="application/ld+json">{metadata}</script><p>Develop software with our QA team.</p>'
    result = job_import.parse_job(html.encode(), 'text/html')
    assert result['title'] == 'Developer'
    assert result['job_type'] == ''


def test_unstructured_does_not_invent_fields():
    description = b'We want someone to build reliable software for our customers.'
    result = job_import.parse_job(description, 'text/plain')
    assert result['title'] == result['company_name'] == ''
    assert result['about'] == description.decode()


@pytest.mark.parametrize('title_label, company_label', [('Job title', 'Company'), ('Position', 'Employer'), ('Role', 'Company')])
def test_plain_text_labels(title_label, company_label):
    data = f'{title_label}: Developer\n{company_label}: Acme\nBuild accessible applications and reliable software.'
    result = job_import.parse_job(data.encode(), 'text/plain')
    assert (result['title'], result['company_name']) == ('Developer', 'Acme')


def test_visible_text_ignores_non_content_and_bounds_description():
    html = b'<nav>Navigation</nav><script>hidden</script><p>Build useful apps with Acme engineering.</p>'
    assert job_import.content_text(html, 'text/html') == 'Build useful apps with Acme engineering.'
    assert len(job_import.content_text(b'x' * 20_001, 'text/plain')) == 20_000


@pytest.mark.parametrize('filename, data, error', [
    ('bad.pdf', b'bad data', 'Could not read'),
    ('bad.exe', b'anything', 'Upload a PDF, HTML or TXT'),
    ('empty.txt', b'too short', 'Not enough readable text'),
])
def test_upload_rejects_invalid_files(signed, headers, filename, data, error):
    response = signed.post('/api/jobs/parse', data={'file': (io.BytesIO(data), filename)}, headers=headers)
    assert response.status_code == 422
    assert error in response.json['error']


def test_upload_rejects_oversized_file_without_spooling(signed, headers, monkeypatch):
    monkeypatch.setattr(job_import, 'MAX_JOB_UPLOAD_BYTES', len(POSTING_TEXT) - 1)
    response = signed.post('/api/jobs/parse', data={'file': (io.BytesIO(POSTING_TEXT), 'job.txt')}, headers=headers)
    assert response.status_code == 422
    assert '2 MB' in response.json['error']


@pytest.mark.parametrize('data', [{}, {'url': 'https://example.test/job', 'file': True}])
def test_import_requires_exactly_one_source(signed, headers, monkeypatch, data):
    send = Mock()
    monkeypatch.setattr(job_import, 'fetch_public', send)
    payload = dict(data)
    if payload.get('file'):
        payload['file'] = (io.BytesIO(POSTING_TEXT), 'job.txt')
    response = signed.post('/api/jobs/parse', data=payload, headers=headers)
    assert response.status_code == 422
    assert 'Choose either' in response.json['error']
    send.assert_not_called()


@pytest.mark.parametrize(('filename', 'data'), [
    ('job.TXT', POSTING_TEXT),
    ('job.htm', b'<p>The team needs a developer to improve its payroll tools.</p>'),
])
def test_import_handles_file_formats(signed, headers, filename, data):
    response = signed.post('/api/jobs/parse', data={'file': (io.BytesIO(data), filename)}, headers=headers)
    assert response.status_code == 200
    assert response.json['source_url'] is None
    assert 'Review all fields' in response.json['note']


def test_url_import_uses_returned_source_and_parses_content(signed, headers, monkeypatch):
    url = 'https://example.test/job'
    final_url = 'https://example.test/jobs/42'
    fetch = Mock(return_value=(POSTING_TEXT, 'text/plain', final_url))
    monkeypatch.setattr(job_import, 'fetch_public', fetch)
    response = signed.post('/api/jobs/parse', data={'url': f' {url} '}, headers=headers)
    assert response.status_code == 200
    assert response.json['source_url'] == final_url
    assert response.json['job']['title'] == 'Developer'
    fetch.assert_called_once_with(url)


def test_url_import_reports_inaccessible_source(signed, headers, monkeypatch):
    monkeypatch.setattr(job_import, 'fetch_public', Mock(side_effect=SourceError('Source unavailable.')))
    response = signed.post('/api/jobs/parse', data={'url': 'https://example.test/job'}, headers=headers)
    assert response.status_code == 422
    assert response.json == {'error': 'Source unavailable.'}


def test_pdf_text_extraction_in_memory(signed, headers):
    data = io.BytesIO()
    pdf = canvas.Canvas(data)
    pdf.drawString(72, 750, 'Job title: Developer')
    pdf.drawString(72, 730, 'Company: Acme')
    pdf.drawString(72, 710, 'Build useful software with our engineering team.')
    pdf.save()
    data.seek(0)
    response = signed.post('/api/jobs/parse', data={'file': (data, 'job.pdf')}, headers=headers)
    assert response.status_code == 200
    assert response.json['job']['title'] == 'Developer'
    assert response.json['job']['company_name'] == 'Acme'


def test_pdf_page_limit_is_checked_before_extracting_text(monkeypatch):
    page = Mock()
    monkeypatch.setattr(job_import, 'PdfReader', Mock(return_value=Mock(pages=[page] * 31)))
    with pytest.raises(SourceError, match='30 pages'):
        job_import.content_text(b'PDF fixture', 'application/pdf')
    page.extract_text.assert_not_called()
