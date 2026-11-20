from unittest.mock import Mock

import pytest
import requests

import outreach
from models import Job, db


OUTREACH_URL = '/api/applications/1/outreach'
POSTING = 'Build and test payroll tooling for small businesses.'
PARAGRAPH = "I'm interested in how your team builds reliable payroll tools for small businesses."


@pytest.fixture
def worker(monkeypatch):
    request = Mock()
    request.return_value.ok = True
    request.return_value.json.return_value = {'paragraph': PARAGRAPH}
    monkeypatch.setattr(outreach, 'request_worker', request)
    return request


def test_outreach_uses_saved_job_and_manually_entered_recruiter(app, signed, headers, worker):
    with app.app_context():
        db.session.get(Job, 1).about = POSTING
        db.session.commit()

    response = signed.post(OUTREACH_URL, headers=headers, json={
        'recruiter_name': '  Priya   Shah  ',
        'background': 'I wrote automated tests for a payroll application.',
        'recruiter_email': 'recruiter@example.test',
        'company': 'Untrusted client company',
        'role': 'Untrusted client role',
    })

    assert response.status_code == 200
    assert response.headers['Cache-Control'] == 'no-store'
    assert worker.call_args.args == ('POST', 'outreach/draft')
    assert worker.call_args.kwargs['json'] == {
        'company': 'Acme',
        'role': 'Software Engineer',
        'description': POSTING,
        'background': 'I wrote automated tests for a payroll application.',
    }
    assert response.json['subject'] == 'Software Engineer at Acme'
    assert response.json['body'].startswith('Hi Priya Shah,\n\n')
    assert PARAGRAPH in response.json['body']
    assert response.json['body'].endswith('Thanks,\nFirst')
    assert len(response.json['body'].split()) < 100


def test_outreach_allows_pasted_description_when_saved_description_missing(app, signed, headers, worker):
    with app.app_context():
        db.session.get(Job, 1).about = None
        db.session.commit()

    missing = signed.post(OUTREACH_URL, headers=headers, json={})
    assert missing.status_code == 400 and 'job description' in missing.json['error']
    worker.assert_not_called()

    response = signed.post(OUTREACH_URL, headers=headers, json={'description': POSTING})
    assert response.status_code == 200
    assert response.json['body'].startswith('Hello,\n\n')
    assert worker.call_args.kwargs['json']['description'] == POSTING
    assert worker.call_args.kwargs['json']['background'] == ''


@pytest.mark.parametrize('data', [
    [],
    {'description': ' '},
    {'description': 'x' * 20_001},
    {'recruiter_name': 123},
    {'recruiter_name': 'x' * 101},
    {'background': ['A project']},
    {'background': 'x' * 801},
])
def test_outreach_rejects_invalid_input(signed, headers, worker, data):
    response = signed.post(OUTREACH_URL, headers=headers, json=data)
    assert response.status_code == 400
    worker.assert_not_called()


def test_outreach_requires_session_csrf_and_owned_application(app, signed, headers, worker):
    assert app.test_client().post(OUTREACH_URL, json={}).status_code == 401
    assert signed.post(OUTREACH_URL, json={}).status_code == 403
    assert signed.post('/api/applications/2/outreach', headers=headers, json={}).status_code == 404
    worker.assert_not_called()


def test_outreach_reports_worker_unavailable(signed, headers, worker):
    worker.side_effect = requests.Timeout
    response = signed.post(OUTREACH_URL, headers=headers, json={})
    assert response.status_code == 503
    assert 'unavailable' in response.json['error']


def test_outreach_reports_missing_gemini_configuration(signed, headers, worker):
    worker.return_value.ok = False
    worker.return_value.status_code = 503
    worker.return_value.json.return_value = {'error': 'Gemini is not configured.'}
    response = signed.post(OUTREACH_URL, headers=headers, json={})
    assert response.status_code == 503
    assert response.json['error'] == 'Gemini is not configured.'


def test_outreach_rejects_empty_worker_draft(signed, headers, worker):
    worker.return_value.json.return_value = {'paragraph': ' '}
    response = signed.post(OUTREACH_URL, headers=headers, json={})
    assert response.status_code == 502
    assert 'subject' not in response.json
