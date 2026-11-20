from datetime import date
from io import BytesIO
from pathlib import PurePath
from uuid import UUID

import pytest
from flask import Response
from sqlalchemy.dialects import postgresql

import routes
from models import Application, ApplicationStatus, Job


APPLICATIONS = '/api/applications'


def test_list_scopes_filters_and_paginates_sql_without_executing_it(signed, records, db_session):
    db_session.scalar.return_value = 5
    db_session.scalars.return_value.all.return_value = [records.application]
    response = signed.get(APPLICATIONS + (
        '?page=3&per_page=2&status=applied,offer&status=interviewing'
        '&date_from=2026-10-01&date_to=2026-10-31'
    ))

    assert response.status_code == 200
    assert response.json == {
        'items': [records.application.to_dict()], 'page': 3, 'per_page': 2,
        'total': 5, 'total_pages': 3,
    }
    count = db_session.scalar.call_args.args[0].compile(dialect=postgresql.dialect())
    query = db_session.scalars.call_args.args[0].compile(dialect=postgresql.dialect())
    for statement in (count, query):
        sql = str(statement)
        assert 'applications.user_id = ' in sql
        assert 'applications.status IN ' in sql
        assert 'applications.date_applied >= ' in sql
        assert 'applications.date_applied <= ' in sql
        assert any(key.startswith('user_id_') and value == records.owner.id for key, value in statement.params.items())
        assert [ApplicationStatus.APPLIED, ApplicationStatus.OFFER, ApplicationStatus.INTERVIEWING] in statement.params.values()
        assert {str(value) for value in statement.params.values()} >= {'2026-10-01', '2026-10-31'}
    assert 'ORDER BY applications.date_applied DESC, applications.id DESC' in str(query)
    assert query.params['param_1'] == 2
    assert query.params['param_2'] == 4


def test_list_default_pagination_with_no_matches(signed, db_session):
    db_session.scalar.return_value = None
    db_session.scalars.return_value.all.return_value = []
    assert signed.get(APPLICATIONS).json == {
        'items': [], 'page': 1, 'per_page': 12, 'total': 0, 'total_pages': 1,
    }


@pytest.mark.parametrize('query, error', [
    ('page=zero', 'integer'),
    ('page=0', 'out of range'),
    ('per_page=101', 'out of range'),
    ('status=fake', 'Valid statuses'),
    ('date_from=2026/10/01', 'YYYY-MM-DD'),
    ('date_from=2026-10-31&date_to=2026-10-01', 'must not be after'),
])
def test_list_rejects_invalid_filters(signed, db_session, query, error):
    response = signed.get(f'{APPLICATIONS}?{query}')
    assert response.status_code == 400
    assert error in response.json['error']
    db_session.scalar.assert_not_called()
    db_session.scalars.assert_not_called()


def test_detail_serializes_owned_application(signed, records):
    response = signed.get(f'{APPLICATIONS}/{records.application.id}')
    assert response.status_code == 200
    assert response.json == records.application.to_dict()
    assert response.json['job']['required_skills'] == []


@pytest.mark.parametrize('application_id', [2, 999])
def test_application_routes_do_not_disclose_other_or_missing_records(signed, headers, db_session, storage, application_id):
    path = f'{APPLICATIONS}/{application_id}'
    for response in (
        signed.get(path),
        signed.get(f'{path}/files/resume'),
        signed.patch(f'{path}/status', json={'status': 'offer'}, headers=headers),
        signed.post(f'{path}/research', json={}, headers=headers),
        signed.post(f'{path}/interview', json={}, headers=headers),
    ):
        assert response.status_code == 404
        assert response.json == {'error': f'Application {application_id} not found'}
    db_session.commit.assert_not_called()
    storage.is_file.assert_not_called()
    storage.send.assert_not_called()


@pytest.mark.parametrize('kind, stored', [('resume', False), ('cover_letter', True), ('unknown', False)])
def test_download_returns_404_for_missing_document_or_kind(signed, records, storage, kind, stored):
    if stored:
        records.application.cover_letter_path = '1/missing.pdf'
    response = signed.get(f'{APPLICATIONS}/1/files/{kind}')
    assert response.status_code == 404
    storage.send.assert_not_called()


@pytest.mark.parametrize('kind', ['resume', 'cover_letter', 'transcript'])
def test_download_uses_safe_attachment_name(signed, records, storage, kind):
    setattr(records.application, f'{kind}_path', '1/stored.pdf')
    records.job.company_name = 'Acme / North'
    storage.is_file.return_value = True
    storage.send.return_value = Response(b'fixture file', mimetype='application/pdf')

    response = signed.get(f'{APPLICATIONS}/1/files/{kind}')
    assert response.status_code == 200
    assert response.data == b'fixture file'
    storage.is_file.assert_called_once_with(storage.root / '1' / 'stored.pdf')
    storage.send.assert_called_once_with(
        storage.root, '1/stored.pdf', as_attachment=True,
        download_name=f'{kind}_Acme_North_Software_Engineer.pdf',
    )


@pytest.mark.parametrize('body', [[], {}, {'status': None}, {'status': 'made-up'}])
def test_status_update_rejects_invalid_input(signed, headers, records, db_session, body):
    response = signed.patch(f'{APPLICATIONS}/1/status', json=body, headers=headers)
    assert response.status_code == 400
    assert records.application.status == ApplicationStatus.INTERVIEWING
    db_session.commit.assert_not_called()


def test_status_update_commits_only_the_owned_application(signed, headers, records, db_session):
    response = signed.patch(f'{APPLICATIONS}/1/status', json={'status': 'offer'}, headers=headers)
    assert response.status_code == 200
    assert response.json['status'] == 'offer'
    assert records.application.status == ApplicationStatus.OFFER
    assert records.other_application.status == ApplicationStatus.APPLIED
    db_session.commit.assert_called_once_with()


@pytest.mark.parametrize('overrides, error', [
    ({'title': ' '}, 'title'),
    ({'company_name': ''}, 'company_name'),
    ({'title': 'x' * 201}, '200 characters'),
    ({'job_type': 'bad'}, 'Invalid job type'),
    ({'salary_high': 'x' * 51}, '50 characters'),
    ({'about': 'bad\x00text'}, 'null characters'),
    ({'required_skills': '['}, 'must be a JSON array'),
    ({'preferred_skills': '{"skill":"Python"}'}, 'array of strings'),
    ({'perks': '[false]'}, 'array of strings'),
    ({'date_applied': '2026-02-30'}, 'YYYY-MM-DD'),
])
def test_create_rejects_invalid_input_before_saving(signed, headers, db_session, storage, overrides, error):
    data = {'title': 'Engineer', 'company_name': 'Acme', **overrides}
    data['resume'] = (BytesIO(b'resume fixture'), 'resume.pdf')
    response = signed.post(APPLICATIONS, data=data, headers=headers)
    assert response.status_code == 400
    assert error in response.json['error']
    db_session.add.assert_not_called()
    db_session.commit.assert_not_called()
    storage.save.assert_not_called()


def test_create_tracks_application_and_files_without_storage_writes(signed, headers, db_session, storage):
    added = []
    db_session.add.side_effect = added.append

    def assign_job_id():
        added[0].id = 3

    def populate_created_application():
        job, application = added
        application.id = 3
        application.job = job

    db_session.flush.side_effect = assign_job_id
    db_session.commit.side_effect = populate_created_application
    response = signed.post(APPLICATIONS, headers=headers, data={
        'title': '  QA Engineer ', 'company_name': ' Acme ',
        'job_type': 'internship', 'required_skills': '["Python"]', 'preferred_skills': '["React"]',
        'perks': '["Remote"]', 'salary_low': '$25/h', 'salary_high': '$30/h',
        'about': 'Build a steady release pipeline.', 'date_applied': '2026-10-21',
        'resume': (BytesIO(b'resume'), 'resume.PDF'),
        'cover_letter': (BytesIO(b'letter'), 'cover.docx'),
        'transcript': (BytesIO(b'transcript'), 'transcript.pdf'),
    })

    assert response.status_code == 201
    job, application = added
    assert isinstance(job, Job)
    assert isinstance(application, Application)
    assert (application.user_id, application.job_id) == (1, job.id)
    assert response.json['date_applied'] == '2026-10-21'
    assert response.json['status'] == 'applied'
    assert response.json['job'] == {
        'id': 3, 'title': 'QA Engineer', 'company_name': 'Acme', 'job_type': 'internship',
        'salary_low': '$25/h', 'salary_high': '$30/h', 'required_skills': ['Python'],
        'preferred_skills': ['React'], 'perks': ['Remote'], 'about': 'Build a steady release pipeline.',
    }
    paths = []
    for field in ('resume_path', 'cover_letter_path', 'transcript_path'):
        path = PurePath(response.json[field])
        assert path.parent == PurePath('1')
        assert UUID(hex=path.stem).version == 4
        paths.append(storage.root / path)
    assert [call.args[1] for call in storage.save.call_args_list] == paths
    assert [path.suffix for path in paths] == ['.pdf', '.docx', '.pdf']
    db_session.flush.assert_called_once_with()
    db_session.commit.assert_called_once_with()


def test_create_defaults_allow_older_minimal_form_payloads(signed, headers, db_session, storage, monkeypatch):
    class FixedDate(date):
        @classmethod
        def today(cls):
            return cls(2026, 10, 22)

    monkeypatch.setattr(routes, 'date', FixedDate)
    added = []
    db_session.add.side_effect = added.append

    def link_created_job():
        job, application = added
        application.job = job

    db_session.commit.side_effect = link_created_job
    response = signed.post(APPLICATIONS, headers=headers, data={'title': 'Developer', 'company_name': 'Acme'})
    assert response.status_code == 201
    assert response.json['date_applied'] == '2026-10-22'
    assert response.json['status'] == 'applied'
    assert response.json['job']['job_type'] is None
    assert response.json['job']['required_skills'] == []
    assert response.json['resume_path'] is None
    storage.save.assert_not_called()
