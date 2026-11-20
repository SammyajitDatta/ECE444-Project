from __future__ import annotations

import os
import secrets
from dotenv import load_dotenv
from pathlib import Path
from typing import Any

from flask import Flask

from models import db
from routes import bp, ApiError, handle_api_error

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('FLASK_SECRET_KEY') or secrets.token_hex(32),
        GOOGLE_CLIENT_ID=os.environ.get('GOOGLE_CLIENT_ID'),
        GOOGLE_CLIENT_SECRET=os.environ.get('GOOGLE_CLIENT_SECRET'),
        PUBLIC_ORIGIN=os.environ.get('PUBLIC_ORIGIN', 'http://localhost:5173').rstrip('/'),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=os.environ.get('PUBLIC_ORIGIN', '').startswith('https://'),
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{BASE_DIR / 'data' / 'jobtracker.db'}",
        UPLOAD_FOLDER=str(BASE_DIR / "uploads"),  # the "storage bucket"
        MAX_CONTENT_LENGTH=10 * 1024 * 1024,
    )
    if app.config['PUBLIC_ORIGIN'].startswith('https://') and not os.environ.get('FLASK_SECRET_KEY') and not test_config:
        raise RuntimeError('Set FLASK_SECRET_KEY before deploying with HTTPS.')
    if test_config:
        app.config.update(test_config)

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
    (BASE_DIR / "data").mkdir(exist_ok=True)

    db.init_app(app)
    from auth import install_auth
    install_auth(app)
    app.register_blueprint(bp)
    app.register_error_handler(ApiError, handle_api_error)
    from job_import import job_import
    app.register_blueprint(job_import)
    from research import research
    app.register_blueprint(research)
    from interview import interview
    app.register_blueprint(interview)
    from resume_proxy import resume_proxy
    app.register_blueprint(resume_proxy)

    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    create_app().run(debug=False, port=5000)
