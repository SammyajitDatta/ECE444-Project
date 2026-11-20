from unittest.mock import Mock

import seed
from models import Application, ApplicationStatus, Job, User


def test_seed_skips_existing_demo_user(app, db_session, monkeypatch, capsys):
    monkeypatch.setattr(seed, 'create_app', Mock(return_value=app))
    db_session.scalar.return_value = 1
    seed.main()
    db_session.add.assert_not_called()
    db_session.commit.assert_not_called()
    assert 'Skipped seeding' in capsys.readouterr().out


def test_seed_adds_demo_user_jobs_and_applications(app, db_session, monkeypatch):
    monkeypatch.setattr(seed, 'create_app', Mock(return_value=app))
    db_session.scalar.return_value = None
    added = []
    db_session.add.side_effect = added.append

    def assign_id():
        added[-1].id = len(added)

    db_session.flush.side_effect = assign_id
    seed.main()
    users = [record for record in added if isinstance(record, User)]
    jobs = [record for record in added if isinstance(record, Job)]
    applications = [record for record in added if isinstance(record, Application)]
    assert len(users) == 1 and users[0].email == seed.DEMO_EMAIL
    assert len(jobs) == len(applications) == 34
    assert {application.user_id for application in applications} == {users[0].id}
    assert {application.job_id for application in applications} == {job.id for job in jobs}
    assert all(isinstance(application.status, ApplicationStatus) for application in applications)
    db_session.commit.assert_called_once_with()
