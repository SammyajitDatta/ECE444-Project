"""Create local configuration once without printing secrets."""
from pathlib import Path
import secrets
root = Path(__file__).resolve().parents[1]
target = root / '.env'
if target.exists():
  raise SystemExit('.env already exists; it has not been changed.')
text = (root / '.env.example').read_text()
text = text.replace('FLASK_SECRET_KEY=\n', 'FLASK_SECRET_KEY=' + secrets.token_urlsafe(48) + '\n')
text = text.replace('RESUME_WORKER_TOKEN=\n', 'RESUME_WORKER_TOKEN=' + secrets.token_urlsafe(48) + '\n')
target.write_text(text)
print('Created .env. Add your Google OAuth credentials locally before signing in.')
