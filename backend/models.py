from __future__ import annotations

import enum
from datetime import date, datetime, timezone
from typing import Any

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


class JobType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    applications: Mapped[list[Application]] = relationship(back_populates="user")

    def to_dict(self) -> dict[str, Any]:
        return {"id": self.id, "email": self.email, "name": self.name}


class Job(db.Model):
    """A posting. Most fields are optional because most postings omit them."""

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    company_name: Mapped[str] = mapped_column(String(200))
    job_type: Mapped[JobType | None] = mapped_column(
        Enum(JobType, native_enum=False, values_callable=_enum_values), default=None
    )
    # Salary is free-form text ("$90k", "90,000 CAD"). salary_high is unset
    # when the posting only lists a single figure (stored in salary_low).
    salary_low: Mapped[str | None] = mapped_column(String(50), default=None)
    salary_high: Mapped[str | None] = mapped_column(String(50), default=None)
    required_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    preferred_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    perks: Mapped[list[str]] = mapped_column(JSON, default=list)
    about: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "company_name": self.company_name,
            "job_type": self.job_type.value if self.job_type else None,
            "salary_low": self.salary_low,
            "salary_high": self.salary_high,
            "required_skills": self.required_skills or [],
            "preferred_skills": self.preferred_skills or [],
            "perks": self.perks or [],
            "about": self.about,
        }


class Application(db.Model):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    date_applied: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus, native_enum=False, values_callable=_enum_values),
        default=ApplicationStatus.APPLIED,
        index=True,
    )
    # Paths relative to the uploads folder (our "storage bucket"), e.g. "1/resume_v3.pdf".
    resume_path: Mapped[str | None] = mapped_column(String(500), default=None)
    cover_letter_path: Mapped[str | None] = mapped_column(String(500), default=None)
    transcript_path: Mapped[str | None] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped[User] = relationship(back_populates="applications")
    job: Mapped[Job] = relationship()

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "date_applied": self.date_applied.isoformat(),
            "status": self.status.value,
            "resume_path": self.resume_path,
            "cover_letter_path": self.cover_letter_path,
            "transcript_path": self.transcript_path,
            "job": self.job.to_dict(),
        }
