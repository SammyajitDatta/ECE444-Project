import hashlib
import os
import sys
from pathlib import Path
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.schema import CreateSchema, DropSchema

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app
from database import postgres_url
from models import db, User, Job, Application, ApplicationStatus, LoginSession


@pytest.fixture(scope='session')
def postgres_engine():
  url = postgres_url(os.environ.get('TEST_DATABASE_URL'), 'TEST_DATABASE_URL')
  engine = create_engine(url)
  try:
    yield engine
  finally:
    engine.dispose()


@pytest.fixture
def database_config(postgres_engine):
  schema = 'applypilot_test_' + uuid4().hex
  with postgres_engine.begin() as connection:
    connection.execute(CreateSchema(schema))
  try:
    yield {
      'SQLALCHEMY_DATABASE_URI': postgres_engine.url,
      'SQLALCHEMY_ENGINE_OPTIONS': {'connect_args': {'options': f'-csearch_path={schema}'}},
    }
  finally:
    with postgres_engine.begin() as connection:
      connection.execute(DropSchema(schema, cascade=True))


@pytest.fixture
def app(tmp_path, database_config):
  app = create_app({'TESTING':True, 'SECRET_KEY':'test-only',
    'UPLOAD_FOLDER': str(tmp_path), 'GOOGLE_CLIENT_ID':'test-client', 'GOOGLE_CLIENT_SECRET':'test-secret',
    **database_config})
  try:
    with app.app_context():
      first = User(name='First',email='first@example.test')
      second = User(name='Second',email='second@example.test')
      db.session.add_all([first,second])
      db.session.flush()
      job=Job(title='Software Engineer', company_name='Acme', about='Description')
      db.session.add(job)
      db.session.flush()
      db.session.add_all([Application(user_id=first.id,job_id=job.id,date_applied=date.today(),status=ApplicationStatus.INTERVIEWING),
        Application(user_id=second.id,job_id=job.id,date_applied=date.today(),status=ApplicationStatus.APPLIED)])
      db.session.add(LoginSession(token_hash=hashlib.sha256(b'fixture-session').hexdigest(),user_id=first.id,
        expires_at=datetime.now(timezone.utc)+timedelta(hours=1)))
      db.session.commit()
    yield app
  finally:
    with app.app_context():
      db.engine.dispose()

@pytest.fixture
def client(app):
  return app.test_client()

@pytest.fixture
def signed(client):
  with client.session_transaction() as s:
    s['login_token']='fixture-session';s['csrf']='fixture-csrf'
  return client

@pytest.fixture
def headers():
  return {'X-CSRF-Token':'fixture-csrf'}
