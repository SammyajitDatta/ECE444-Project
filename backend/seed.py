"""Populate the dev database with one user and a spread of applications."""
from __future__ import annotations

import random
from datetime import date, timedelta

from app import create_app
from models import Application, ApplicationStatus, Job, JobType, User, db

COMPANIES = ["Northwind Labs", "Fernhill Health", "Quarry Analytics", "Lumen Freight", "Tidewater Bank",
             "Paperkite", "Orbit Grocers", "Halcyon Games", "Mapleleaf Robotics", "Brightpath Schools"]
TITLES = ["Frontend Developer", "Backend Engineer", "Data Analyst", "Product Designer",
          "QA Engineer", "DevOps Engineer", "Full Stack Developer", "ML Engineer", "Support Engineer"]
SKILLS = ["Python", "TypeScript", "React", "SQL", "Flask", "Docker", "AWS", "Git", "Figma", "Pandas"]
PERKS = ["Remote friendly", "Dental", "Stock options", "4-day week", "Learning budget", "Gym stipend"]


def main() -> None:
    rng = random.Random(7)
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        user = User(email="you@example.com", name="Sam Rivera")
        db.session.add(user)
        db.session.flush()

        today = date.today()
        for i in range(34):
            has_salary = rng.random() < 0.6
            job = Job(
                title=rng.choice(TITLES),
                company_name=rng.choice(COMPANIES),
                job_type=rng.choice([JobType.FULL_TIME, JobType.FULL_TIME, JobType.PART_TIME]) if rng.random() < 0.8 else None,
                salary_low=f"${rng.randint(55, 110)}k" if has_salary else None,
                required_skills=rng.sample(SKILLS, 3),
                preferred_skills=rng.sample(SKILLS, 2) if rng.random() < 0.5 else [],
                perks=rng.sample(PERKS, 2) if rng.random() < 0.4 else [],
                about="Placeholder description." if rng.random() < 0.5 else None,
            )
            if has_salary and rng.random() < 0.5 and job.salary_low:
                job.salary_high = f"${int(job.salary_low[1:-1]) + rng.randint(10, 30)}k"
            db.session.add(job)
            db.session.flush()

            db.session.add(Application(
                user_id=user.id,
                job_id=job.id,
                date_applied=today - timedelta(days=rng.randint(0, 120)),
                status=rng.choices(list(ApplicationStatus), weights=[8, 4, 3, 1, 6, 1])[0],
                resume_path="1/resume.pdf" if rng.random() < 0.9 else None,
                cover_letter_path="1/cover_letter.pdf" if rng.random() < 0.5 else None,
                transcript_path="1/transcript.pdf" if rng.random() < 0.3 else None,
            ))
        db.session.commit()
        print("Seeded 1 user, 34 jobs and 34 applications.")


if __name__ == "__main__":
    main()
