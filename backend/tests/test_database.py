from datetime import timedelta

import pytest

from app import create_app
from database import postgres_url
from models import LoginSession, User


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
    with pytest.raises(RuntimeError, match='DATABASE_URL') as error:
        postgres_url('postgresql://app:fake-secret@localhost:not-a-port/applypilot')
    assert 'fake-secret' not in str(error.value)


def test_login_session_expiry_column_uses_timezone():
    assert LoginSession.__table__.c.expires_at.type.timezone


def test_created_timestamp_defaults_to_utc():
    assert User.__table__.c.created_at.default.arg(None).utcoffset() == timedelta(0)


def test_app_configures_postgres_lifecycle(app, database_lifecycle, storage):
    assert app.config['SQLALCHEMY_DATABASE_URI'].drivername == 'postgresql+psycopg'
    assert app.config['SQLALCHEMY_ENGINE_OPTIONS']['pool_pre_ping']
    database_lifecycle.init.assert_called_once_with(app)
    database_lifecycle.create.assert_called_once_with()
    storage.mkdir.assert_called_once_with(storage.root, parents=True, exist_ok=True)


def test_app_rejects_missing_database_url_before_initializing(monkeypatch, database_lifecycle, storage):
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setenv('PUBLIC_ORIGIN', 'http://localhost:5173')
    with pytest.raises(RuntimeError, match='DATABASE_URL'):
        create_app()
    database_lifecycle.init.assert_not_called()
    storage.mkdir.assert_not_called()


def test_https_origin_requires_stable_secret(monkeypatch, database_lifecycle):
    monkeypatch.setenv('PUBLIC_ORIGIN', 'https://applypilot.example.test')
    monkeypatch.delenv('FLASK_SECRET_KEY', raising=False)
    with pytest.raises(RuntimeError, match='FLASK_SECRET_KEY'):
        create_app()
    database_lifecycle.init.assert_not_called()
