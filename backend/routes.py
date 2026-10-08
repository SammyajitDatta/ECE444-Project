from __future__ import annotations

import math
from datetime import date
from pathlib import Path
from uuid import uuid4
import json

from flask import Blueprint, Response, jsonify, request, current_app
from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import joinedload

from models import Application, ApplicationStatus, User, Job, db

bp = Blueprint("api", __name__, url_prefix="/api")

DEFAULT_PER_PAGE = 12
MAX_PER_PAGE = 100


class ApiError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@bp.errorhandler(ApiError)
def handle_api_error(err: ApiError) -> tuple[Response, int]:
    return jsonify(error=err.message), err.status_code


def current_user() -> User | None:
    """Placeholder until auth exists: everything runs as the first user."""
    return db.session.get(User, 1)


def _int_arg(name: str, default: int, minimum: int, maximum: int | None = None) -> int:
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        raise ApiError(f"'{name}' must be an integer")
    if value < minimum or (maximum is not None and value > maximum):
        raise ApiError(f"'{name}' is out of range")
    return value


def _date_arg(name: str) -> date | None:
    raw = request.args.get(name)
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise ApiError(f"'{name}' must be a date formatted YYYY-MM-DD")


def _status_arg() -> list[ApplicationStatus]:
    """Accepts ?status=applied,offer and/or repeated ?status=applied&status=offer."""
    raw_values = [part for value in request.args.getlist("status") for part in value.split(",") if part]
    try:
        return [ApplicationStatus(value) for value in raw_values]
    except ValueError as exc:
        valid = ", ".join(s.value for s in ApplicationStatus)
        raise ApiError(f"{exc}. Valid statuses: {valid}")


@bp.get("/applications")
def list_applications() -> Response:
    """Query params: page, per_page, status (comma separated), date_from, date_to (inclusive)."""
    page = _int_arg("page", 1, 1)
    per_page = _int_arg("per_page", DEFAULT_PER_PAGE, 1, MAX_PER_PAGE)
    statuses = _status_arg()
    date_from = _date_arg("date_from")
    date_to = _date_arg("date_to")
    if date_from and date_to and date_from > date_to:
        raise ApiError("'date_from' must not be after 'date_to'")

    user = current_user()
    if user is None:
        return jsonify(items=[], page=page, per_page=per_page, total=0, total_pages=1)

    conditions: list[ColumnElement[bool]] = [Application.user_id == user.id]
    if statuses:
        conditions.append(Application.status.in_(statuses))
    if date_from:
        conditions.append(Application.date_applied >= date_from)
    if date_to:
        conditions.append(Application.date_applied <= date_to)

    total = db.session.scalar(select(func.count()).select_from(Application).where(*conditions)) or 0
    rows = db.session.scalars(
        select(Application)
        .where(*conditions)
        .options(joinedload(Application.job))
        .order_by(Application.date_applied.desc(), Application.id.desc())
        .limit(per_page)
        .offset((page - 1) * per_page)
    ).all()

    return jsonify(
        items=[row.to_dict() for row in rows],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=max(1, math.ceil(total / per_page)),
    )

@bp.patch("/applications/<int:application_id>/status")
def update_application_status(application_id: int) -> Response:
    """Body: {"status": "offer"}. 404 if the application doesn't exist, 400 if the status is invalid."""
    user = current_user()
    application = db.session.get(Application, application_id)
    if application is None or user is None or application.user_id != user.id:
        raise ApiError(f"Application {application_id} not found", 404)

    body = request.get_json(silent=True)
    raw_status = body.get("status") if isinstance(body, dict) else None
    if not isinstance(raw_status, str):
        raise ApiError('Request body must be JSON like {"status": "offer"}')
    try:
        application.status = ApplicationStatus(raw_status)
    except ValueError:
        valid = ", ".join(s.value for s in ApplicationStatus)
        raise ApiError(f"Invalid status '{raw_status}'. Valid statuses: {valid}")

    db.session.commit()
    return jsonify(application.to_dict())


@bp.post("/applications")
def create_application() -> Response:
    """
    Creates a Job and Application together.

    Expects multipart/form-data with:
      Job:
        title
        company_name
        job_type
        salary_low
        salary_high
        required_skills
        preferred_skills
        perks
        about

      Application:
        date_applied

      Files:
        resume
        cover_letter
        transcript
    """
    user = current_user()
    if user is None:
        raise ApiError("User not found", 404)

    title = request.form.get("title")
    company_name = request.form.get("company_name")

    if not title:
        raise ApiError("'title' is required")

    if not company_name:
        raise ApiError("'company_name' is required")

    def json_list_field(name: str) -> list[str]:
        raw = request.form.get(name)

        if not raw:
            return []

        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            raise ApiError(f"'{name}' must be a JSON array")

        if not isinstance(value, list) or not all(
            isinstance(item, str) for item in value
        ):
            raise ApiError(f"'{name}' must be a JSON array of strings")

        return value

    required_skills = json_list_field("required_skills")
    preferred_skills = json_list_field("preferred_skills")
    perks = json_list_field("perks")

    raw_date = request.form.get("date_applied")

    if raw_date:
        try:
            date_applied = date.fromisoformat(raw_date)
        except ValueError:
            raise ApiError("'date_applied' must be formatted YYYY-MM-DD")
    else:
        date_applied = date.today()

    upload_root = Path(current_app.config["UPLOAD_FOLDER"])
    user_upload_dir = upload_root / str(user.id)
    user_upload_dir.mkdir(parents=True, exist_ok=True)

    def save_upload(field_name: str) -> str | None:
        file = request.files.get(field_name)

        if file is None or file.filename == "":
            return None

        filename = uuid4().hex
        path = user_upload_dir / filename

        file.save(path)

        return f"{user.id}/{filename}"

    resume_path = save_upload("resume")
    cover_letter_path = save_upload("cover_letter")
    transcript_path = save_upload("transcript")

    job = Job(
        title=title,
        company_name=company_name,
        job_type=request.form.get("job_type"),
        salary_low=request.form.get("salary_low"),
        salary_high=request.form.get("salary_high"),
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        perks=perks,
        about=request.form.get("about"),
    )

    db.session.add(job)
    db.session.flush()

    application = Application(
        user_id=user.id,
        job_id=job.id,
        date_applied=date_applied,
        status=ApplicationStatus.APPLIED,
        resume_path=resume_path,
        cover_letter_path=cover_letter_path,
        transcript_path=transcript_path,
    )

    db.session.add(application)
    db.session.commit()

    return jsonify(application.to_dict()), 201