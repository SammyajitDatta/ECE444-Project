import hashlib
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app
from models import db, User, Job, Application, ApplicationStatus, LoginSession

@pytest.fixture
def app(tmp_path):
  app = create_app({'TESTING':True, 'SECRET_KEY':'test-only',
    'SQLALCHEMY_DATABASE_URI':'sqlite://', 'UPLOAD_FOLDER': str(tmp_path),
    'GOOGLE_CLIENT_ID':'test-client', 'GOOGLE_CLIENT_SECRET':'test-secret'})
  with app.app_context():
    first = User(name='First',email='first@example.test'); second = User(name='Second',email='second@example.test')
    db.session.add_all([first,second]); db.session.flush()
    job=Job(title='Software Engineer', company_name='Acme', about='Description')
    db.session.add(job);db.session.flush()
    from datetime import date
    db.session.add_all([Application(user_id=first.id,job_id=job.id,date_applied=date.today(),status=ApplicationStatus.INTERVIEWING),
      Application(user_id=second.id,job_id=job.id,date_applied=date.today(),status=ApplicationStatus.APPLIED)])
    db.session.add(LoginSession(token_hash=hashlib.sha256(b'fixture-session').hexdigest(),user_id=first.id,
      expires_at=datetime.now(timezone.utc)+timedelta(hours=1)))
    db.session.commit()
  yield app

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
