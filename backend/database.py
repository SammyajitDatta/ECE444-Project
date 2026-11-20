"""PostgreSQL connection settings shared by the app and test suite."""
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


def postgres_url(value: str | URL | None) -> URL:
    if isinstance(value, str):
        value = value.strip()
    if not value:
        raise RuntimeError('Set DATABASE_URL to a PostgreSQL connection URL.')
    try:
        url = make_url(value)
    except (ArgumentError, ValueError):
        raise RuntimeError('DATABASE_URL is not a valid PostgreSQL connection URL.') from None
    if url.drivername not in {'postgres', 'postgresql', 'postgresql+psycopg'} or not url.database:
        raise RuntimeError('DATABASE_URL must be a PostgreSQL URL with a database name.')
    return url.set(drivername='postgresql+psycopg')
