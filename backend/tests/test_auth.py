from unittest.mock import Mock
from models import db, GoogleIdentity, User

def test_anonymous_cannot_read_or_write(client):
  for method, path in [('get','/api/applications'),('get','/api/applications/1'),('post','/api/generate'),('post','/api/jobs/parse'),('get','/api/applications/1/files/resume')]:
    assert getattr(client,method)(path).status_code == 401

def test_identity_isolation(signed,headers):
  assert signed.get('/api/applications').json['total']==1
  assert signed.get('/api/applications/2').status_code==404
  assert signed.patch('/api/applications/2/status',json={'status':'offer'},headers=headers).status_code==404
  assert signed.post('/api/applications/2/research',json={},headers=headers).status_code==404
  assert signed.get('/api/applications/2/files/resume').status_code==404

def test_csrf_and_logout_revokes_replayed_session(app,signed,headers):
  assert signed.post('/api/auth/logout').status_code==403
  assert signed.post('/api/auth/logout',headers={'X-CSRF-Token':'wrong'}).status_code==403
  cookie = signed.get_cookie('session').value
  assert signed.post('/api/auth/logout',headers=headers).status_code==200
  assert signed.get('/api/applications').status_code==401
  signed.set_cookie('session',cookie)
  assert signed.get('/api/applications').status_code==401

def test_google_callback_uses_verified_subject(app,client,monkeypatch):
  google=app.extensions['google_oauth'].google
  monkeypatch.setattr(google,'authorize_access_token',Mock(return_value={'userinfo':{'sub':'google-sub','email':'new@example.test','email_verified':True,'name':'New'}}))
  assert client.get('/api/auth/callback').status_code==302
  assert client.get('/api/auth/me').json['user']['email']=='new@example.test'
  with app.app_context():
    identity=db.session.get(GoogleIdentity,'google-sub'); user_id=identity.user_id
  # Email changes do not create a second account; identity comes from sub.
  monkeypatch.setattr(google,'authorize_access_token',Mock(return_value={'userinfo':{'sub':'google-sub','email':'changed@example.test','email_verified':True}}))
  client.get('/api/auth/callback')
  assert client.get('/api/auth/me').json['user']['id']==user_id

def test_google_failure_and_email_collision_do_not_sign_in(app,client,monkeypatch):
  google=app.extensions['google_oauth'].google
  for info in [{'sub':'x','email':'first@example.test','email_verified':True},{'sub':'x','email':'new@example.test','email_verified':False}]:
    monkeypatch.setattr(google,'authorize_access_token',Mock(return_value={'userinfo':info}))
    assert 'auth_error=' in client.get('/api/auth/callback').location
    assert client.get('/api/auth/me').json['user'] is None
  monkeypatch.setattr(google,'authorize_access_token',Mock(side_effect=ValueError('invalid state or token')))
  assert 'auth_error=' in client.get('/api/auth/callback').location
  assert client.get('/api/auth/me').json['user'] is None

def test_create_and_update_validated(signed,headers):
  assert signed.post('/api/applications', data={'title':'Engineer','company_name':'Acme','job_type':'bad'},headers=headers).status_code==400
  r=signed.post('/api/applications',data={'title':'Engineer','company_name':'Acme','job_type':'internship'},headers=headers)
  assert r.status_code==201
  assert r.json['job']['job_type']=='internship'
  assert signed.patch('/api/applications/'+str(r.json['id'])+'/status',json={'status':'offer'},headers=headers).json['status']=='offer'
