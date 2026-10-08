from __future__ import annotations

from pathlib import Path
from typing import Any

from flask import Flask

from models import db
from routes import bp

BASE_DIR = Path(__file__).resolve().parent


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{BASE_DIR / 'data' / 'jobtracker.db'}",
        UPLOAD_FOLDER=str(BASE_DIR / "uploads"),  # the "storage bucket"
        MAX_CONTENT_LENGTH=10 * 1024 * 1024,
    )
    if test_config:
        app.config.update(test_config)

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)
    (BASE_DIR / "data").mkdir(exist_ok=True)

    db.init_app(app)
    app.register_blueprint(bp)

    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=5000)
