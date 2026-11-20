"""PostgreSQL connection settings shared by the app and test suite."""
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


def postgres_url(value: str | URL | None, setting: str = 'DATABASE_URL') -> URL:
    if isinstance(value, str):
        value = value.strip()
    if not value:
        raise RuntimeError(f'Set {setting} to a PostgreSQL connection URL.')
    try:
        url = make_url(value)
    except (ArgumentError, ValueError):
        raise RuntimeError(f'{setting} is not a valid PostgreSQL connection URL.') from None
    if url.drivername not in {'postgres', 'postgresql', 'postgresql+psycopg'} or not url.database:
        raise RuntimeError(f'{setting} must be a PostgreSQL URL with a database name.')
    return url.set(drivername='postgresql+psycopg')
