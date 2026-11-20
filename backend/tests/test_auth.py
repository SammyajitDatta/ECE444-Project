from datetime import datetime, timedelta, timezone
from hashlib import sha256
from unittest.mock import Mock

import pytest
from flask import redirect

from models import GoogleIdentity, LoginSession, User


@pytest.mark.parametrize('method, path', [
    ('GET', '/api/applications'),
    ('GET', '/api/applications/1'),
    ('GET', '/api/applications/1/files/resume'),
    ('POST', '/api/applications'),
    ('PATCH', '/api/applications/1/status'),
    ('POST', '/api/applications/1/research'),
    ('POST', '/api/applications/1/interview'),
    ('POST', '/api/applications/1/outreach'),
    ('POST', '/api/generate'),
    ('POST', '/api/jobs/parse'),
])
def test_anonymous_cannot_read_or_write(client, method, path):
    response = client.open(path, method=method)
    assert response.status_code == 401
    assert response.headers['Cache-Control'] == 'no-store'
    assert response.headers['X-Content-Type-Options'] == 'nosniff'


def test_me_provides_csrf_and_uses_private_session_cookie(client):
    response = client.get('/api/auth/me')
    assert response.json['user'] is None
    assert response.json['google_configured'] is True
    assert response.json['csrf_token']
    assert 'HttpOnly' in response.headers['Set-Cookie']
    assert 'SameSite=Lax' in response.headers['Set-Cookie']
    assert client.get('/api/auth/me').json['csrf_token'] == response.json['csrf_token']


def test_expired_session_is_rejected(signed, records):
    assert signed.get('/api/auth/me').json['user']['id'] == records.owner.id
    records.login.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    assert signed.get('/api/auth/me').json['user'] is None
    assert signed.get('/api/applications').status_code == 401


def test_csrf_and_logout_revokes_replayed_session(signed, headers, db_session, records):
    assert signed.post('/api/auth/logout').status_code == 403
    assert signed.post('/api/auth/logout', headers={'X-CSRF-Token': 'wrong'}).status_code == 403
    db_session.delete.assert_not_called()

    cookie = signed.get_cookie('session').value
    lookup = db_session.get.side_effect
    def delete_login(record):
        db_session.get.side_effect = lambda model, key: (
            None if model is LoginSession and key == record.token_hash else lookup(model, key)
        )

    db_session.delete.side_effect = delete_login
    assert signed.post('/api/auth/logout', headers=headers).json == {'ok': True}
    db_session.delete.assert_called_once_with(records.login)
    db_session.commit.assert_called_once_with()

    assert signed.get('/api/applications').status_code == 401
    signed.set_cookie('session', cookie)
    assert signed.get('/api/applications').status_code == 401


def test_google_login_uses_configured_callback(app, client, monkeypatch):
    google = app.extensions['google_oauth'].google
    authorize = Mock(return_value=redirect('https://accounts.example.test/consent'))
    monkeypatch.setattr(google, 'authorize_redirect', authorize)
    response = client.get('/api/auth/google')
    assert response.status_code == 302
    authorize.assert_called_once_with('http://localhost:5173/api/auth/callback', prompt='select_account')


def test_google_login_reports_missing_configuration(app, client):
    app.config['GOOGLE_CLIENT_SECRET'] = None
    assert client.get('/api/auth/me').json['google_configured'] is False
    assert client.get('/api/auth/google').status_code == 503


def test_google_callback_registers_user_and_hashed_session(app, client, monkeypatch, db_session):
    google = app.extensions['google_oauth'].google
    monkeypatch.setattr(google, 'authorize_access_token', Mock(return_value={'userinfo': {
        'sub': 'google-sub', 'email': 'new@example.test', 'email_verified': True, 'name': 'New',
    }}))
    db_session.scalar.return_value = None
    added = []

    def add(record):
        if isinstance(record, User):
            record.id = 3
        added.append(record)

    db_session.add.side_effect = add
    response = client.get('/api/auth/callback')
    assert response.status_code == 302
    assert response.location == 'http://localhost:5173/'
    user, identity, login = added
    assert (user.id, user.email, user.name) == (3, 'new@example.test', 'New')
    assert (identity.subject, identity.user_id) == ('google-sub', user.id)
    assert login.user_id == user.id
    assert login.expires_at > datetime.now(timezone.utc)
    with client.session_transaction() as session:
        assert session['csrf']
        assert login.token_hash == sha256(session['login_token'].encode()).hexdigest()
    db_session.commit.assert_called_once_with()


def test_existing_google_subject_keeps_account_after_email_change(app, client, monkeypatch, db_session, records):
    google = app.extensions['google_oauth'].google
    monkeypatch.setattr(google, 'authorize_access_token', Mock(return_value={'userinfo': {
        'sub': 'known-google-sub', 'email': 'changed@example.test', 'email_verified': True,
    }}))
    lookup = db_session.get.side_effect
    identity = GoogleIdentity(subject='known-google-sub', user_id=records.owner.id)
    db_session.get.side_effect = lambda model, key: (
        identity if model is GoogleIdentity and key == identity.subject else lookup(model, key)
    )
    assert client.get('/api/auth/callback').location == 'http://localhost:5173/'
    db_session.scalar.assert_not_called()
    login, = db_session.add.call_args.args
    assert isinstance(login, LoginSession)
    assert login.user_id == records.owner.id


def test_verified_email_collision_does_not_link_accounts(app, client, monkeypatch, db_session, records):
    google = app.extensions['google_oauth'].google
    monkeypatch.setattr(google, 'authorize_access_token', Mock(return_value={'userinfo': {
        'sub': 'unknown-sub', 'email': records.owner.email, 'email_verified': True,
    }}))
    db_session.scalar.return_value = records.owner
    assert 'auth_error=account_conflict' in client.get('/api/auth/callback').location
    assert client.get('/api/auth/me').json['user'] is None
    db_session.add.assert_not_called()
    db_session.commit.assert_not_called()


@pytest.mark.parametrize('result', [
    {},
    {'userinfo': {'sub': 'sub', 'email': 'new@example.test', 'email_verified': False}},
    {'userinfo': {'email': 'new@example.test', 'email_verified': True}},
    {'userinfo': {'sub': 'sub', 'email_verified': True}},
    ValueError('invalid state or token'),
])
def test_callback_rejects_unverified_identity_and_provider_errors(app, client, monkeypatch, db_session, result):
    google = app.extensions['google_oauth'].google
    authorize = Mock(side_effect=result) if isinstance(result, Exception) else Mock(return_value=result)
    monkeypatch.setattr(google, 'authorize_access_token', authorize)
    assert 'auth_error=google_failed' in client.get('/api/auth/callback').location
    assert client.get('/api/auth/me').json['user'] is None
    db_session.commit.assert_not_called()
    db_session.rollback.assert_called_once_with()
