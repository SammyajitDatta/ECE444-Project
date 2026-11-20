import hashlib
import socket
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path, PurePath
from types import SimpleNamespace
from unittest.mock import Mock, patch

import psycopg
import pytest
import werkzeug.formparser
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from werkzeug.datastructures import FileStorage

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
with patch('dotenv.load_dotenv'):
    import app as app_module
    import routes
    from models import Application, ApplicationStatus, GoogleIdentity, Job, LoginSession, User, db


@pytest.fixture(autouse=True)
def offline_boundaries(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail('Real network and database operations are disabled in backend tests.')

    for name in ('getaddrinfo', 'gethostbyname', 'gethostbyname_ex', 'create_connection'):
        monkeypatch.setattr(socket, name, blocked)
    for name in ('connect', 'connect_ex', 'bind', 'sendto'):
        monkeypatch.setattr(socket.socket, name, blocked)
    for connector in (sqlite3, sqlite3.dbapi2, psycopg, psycopg.Connection, psycopg.AsyncConnection):
        monkeypatch.setattr(connector, 'connect', blocked)
    for name in ('connect', 'raw_connection'):
        monkeypatch.setattr(Engine, name, blocked)

    monkeypatch.delenv('BRAVE_SEARCH_API_KEY', raising=False)
    monkeypatch.delenv('RESUME_WORKER_TOKEN', raising=False)


@pytest.fixture
def records():
    owner = User(id=1, name='First', email='first@example.test')
    other = User(id=2, name='Second', email='second@example.test')
    job = Job(id=1, title='Software Engineer', company_name='Acme', about='Description')
    application = Application(
        id=1, user_id=owner.id, date_applied=date(2026, 10, 20),
        status=ApplicationStatus.INTERVIEWING, job=job,
    )
    other_application = Application(
        id=2, user_id=other.id, date_applied=date(2026, 10, 19),
        status=ApplicationStatus.APPLIED, job=job,
    )
    login = LoginSession(
        token_hash=hashlib.sha256(b'fixture-session').hexdigest(), user_id=owner.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    return SimpleNamespace(owner=owner, other=other, job=job, application=application,
                           other_application=other_application, login=login)


@pytest.fixture
def db_session(monkeypatch, records):
    session = Mock(spec_set=Session)
    rows = {
        User: {records.owner.id: records.owner, records.other.id: records.other},
        Application: {records.application.id: records.application,
                      records.other_application.id: records.other_application},
        LoginSession: {records.login.token_hash: records.login},
        GoogleIdentity: {},
    }
    session.get.side_effect = lambda model, key: rows[model].get(key)
    monkeypatch.setattr(db, 'session', session)
    return session


@pytest.fixture
def storage(monkeypatch):
    uploads = SimpleNamespace(
        root=PurePath('/unit-test-uploads'), mkdir=Mock(), is_file=Mock(return_value=False),
        save=Mock(), send=Mock(),
    )

    class UploadPath(type(PurePath())):
        def mkdir(self, *args, **kwargs):
            uploads.mkdir(self, *args, **kwargs)

        def is_file(self):
            return uploads.is_file(self)

    monkeypatch.setattr(app_module, 'Path', UploadPath)
    monkeypatch.setattr(routes, 'Path', UploadPath)
    monkeypatch.setattr(routes, 'send_from_directory', uploads.send)
    monkeypatch.setattr(FileStorage, 'save', lambda self, path: uploads.save(self, path))
    monkeypatch.setattr(werkzeug.formparser, 'default_stream_factory', lambda *args, **kwargs: BytesIO())
    return uploads


@pytest.fixture
def database_lifecycle(monkeypatch):
    lifecycle = SimpleNamespace(init=Mock(), create=Mock())
    monkeypatch.setattr(db, 'init_app', lifecycle.init)
    monkeypatch.setattr(db, 'create_all', lifecycle.create)
    return lifecycle


@pytest.fixture
def app(monkeypatch, storage, db_session, database_lifecycle):
    monkeypatch.setenv('PUBLIC_ORIGIN', 'http://localhost:5173')
    monkeypatch.setenv('DATABASE_URL', 'postgresql://app:fake@unit-test.invalid/applypilot')
    return app_module.create_app({
        'TESTING': True, 'SECRET_KEY': 'test-only', 'UPLOAD_FOLDER': storage.root,
        'GOOGLE_CLIENT_ID': 'test-client', 'GOOGLE_CLIENT_SECRET': 'test-secret',
    })


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def signed(client):
    with client.session_transaction() as session:
        session['login_token'] = 'fixture-session'
        session['csrf'] = 'fixture-csrf'
    return client


@pytest.fixture
def headers():
    return {'X-CSRF-Token': 'fixture-csrf'}
