from datetime import datetime, timedelta, timezone
from hashlib import sha256

import pytest

from database import postgres_url
from models import LoginSession, db


@pytest.mark.parametrize('scheme', ['postgres', 'postgresql', 'postgresql+psycopg'])
def test_postgres_url_uses_psycopg_and_retains_connection_options(scheme):
    url = postgres_url(f'{scheme}://app:test%40pass@localhost:5432/applypilot?sslmode=require')
    assert url.drivername == 'postgresql+psycopg'
    assert url.database == 'applypilot'
    assert url.password == 'test@pass'
    assert url.query['sslmode'] == 'require'


@pytest.mark.parametrize('value', [None, '', 'sqlite:///jobtracker.db', 'postgresql://app@localhost'])
def test_postgres_url_requires_a_postgres_database(value):
    with pytest.raises(RuntimeError, match='DATABASE_URL'):
        postgres_url(value)


def test_database_url_error_does_not_echo_invalid_credentials():
    with pytest.raises(RuntimeError, match='TEST_DATABASE_URL') as error:
        postgres_url('postgresql://app:fake-secret@localhost:not-a-port/applypilot', 'TEST_DATABASE_URL')
    assert 'fake-secret' not in str(error.value)


def test_postgresql_session_expiration(app, signed):
    assert signed.get('/api/applications').status_code == 200
    token_hash = sha256(b'fixture-session').hexdigest()
    with app.app_context():
        record = db.session.get(LoginSession, token_hash)
        assert record.expires_at.utcoffset() is not None
        record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.session.commit()
    assert signed.get('/api/applications').status_code == 401


def test_application_salary_limit_is_validated_before_database_write(signed, headers):
    response = signed.post('/api/applications', headers=headers,
                           data={'title': 'Engineer', 'company_name': 'Acme', 'salary_high': 'x' * 51})
    assert response.status_code == 400
    assert '50 characters' in response.json['error']
    assert signed.get('/api/applications').json['total'] == 1
