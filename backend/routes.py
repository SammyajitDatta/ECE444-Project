from __future__ import annotations

import math
from datetime import date

from flask import Blueprint, Response, jsonify, request
from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import joinedload

from models import Application, ApplicationStatus, User, db

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
