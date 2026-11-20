"""Google OIDC authentication. Identity is Google's immutable subject, not email."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, current_app, g, jsonify, redirect, request, session
from authlib.integrations.flask_client import OAuth
from sqlalchemy import select
from models import db, User, GoogleIdentity, LoginSession

auth = Blueprint('auth', __name__, url_prefix='/api/auth')

def install_auth(app):
  oauth = OAuth(app)
  oauth.register('google', client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'})
  app.extensions['google_oauth'] = oauth
  app.register_blueprint(auth)

  @app.before_request
  def authenticate():
    if not request.path.startswith('/api/'):
      return None
    g.user = None
    token = session.get('login_token')
    if token:
      record = db.session.get(LoginSession, hashlib.sha256(token.encode()).hexdigest())
      if record and record.expires_at > datetime.now(timezone.utc).replace(tzinfo=None):
        g.user = db.session.get(User, record.user_id)
    public = {'/api/auth/me', '/api/auth/google', '/api/auth/callback'}
    if request.path not in public and not g.user:
      return jsonify(error='Sign in with Google to continue.'), 401
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
      expected = session.get('csrf', '')
      if not expected or not secrets.compare_digest(expected, request.headers.get('X-CSRF-Token', '')):
        return jsonify(error='Session verification failed. Reload and try again.'), 403

  @app.after_request
  def private_response(response):
    if request.path.startswith('/api/'):
      response.headers['Cache-Control'] = 'no-store'
      response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

@auth.get('/me')
def me():
  session.setdefault('csrf', secrets.token_urlsafe(32))
  return jsonify(user=g.user.to_dict() if g.user else None, csrf_token=session['csrf'],
    google_configured=bool(current_app.config['GOOGLE_CLIENT_ID'] and current_app.config['GOOGLE_CLIENT_SECRET']))

@auth.get('/google')
def google_login():
  if not current_app.config['GOOGLE_CLIENT_ID'] or not current_app.config['GOOGLE_CLIENT_SECRET']:
    return jsonify(error='Google sign-in is not configured on the server.'), 503
  return current_app.extensions['google_oauth'].google.authorize_redirect(
    current_app.config['PUBLIC_ORIGIN'] + '/api/auth/callback', prompt='select_account')

@auth.get('/callback')
def callback():
  try:
    # Authlib validates state, ID-token signature, issuer, audience, expiry and nonce.
    token = current_app.extensions['google_oauth'].google.authorize_access_token()
    info = token.get('userinfo', {})
    if not info.get('sub') or info.get('email_verified') is not True or not info.get('email'):
      raise ValueError('Verified Google identity required')
    identity = db.session.get(GoogleIdentity, info['sub'])
    if identity:
      user = db.session.get(User, identity.user_id)
    else:
      # Never silently claim a pre-existing local account just because its email matches.
      if db.session.scalar(select(User).where(User.email == info['email'])):
        return redirect(current_app.config['PUBLIC_ORIGIN'] + '/?auth_error=account_conflict')
      user = User(email=info['email'], name=info.get('name') or info['email'])
      db.session.add(user)
      db.session.flush()
      db.session.add(GoogleIdentity(subject=info['sub'], user_id=user.id))
    raw = secrets.token_urlsafe(32)
    db.session.add(LoginSession(token_hash=hashlib.sha256(raw.encode()).hexdigest(), user_id=user.id,
      expires_at=datetime.now(timezone.utc) + timedelta(hours=8)))
    db.session.commit()
    session.clear()
    session.update(login_token=raw, csrf=secrets.token_urlsafe(32))
    return redirect(current_app.config['PUBLIC_ORIGIN'] + '/')
  except Exception:
    db.session.rollback()
    return redirect(current_app.config['PUBLIC_ORIGIN'] + '/?auth_error=google_failed')

@auth.post('/logout')
def logout():
  raw = session.get('login_token')
  if raw:
    record = db.session.get(LoginSession, hashlib.sha256(raw.encode()).hexdigest())
    if record:
      db.session.delete(record)
      db.session.commit()
  session.clear()
  return jsonify(ok=True)
