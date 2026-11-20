"""Draft recruiter emails for applications owned by the signed-in user."""
import requests
from flask import Blueprint, g, jsonify, request
from resume_proxy import request_worker
from routes import ApiError, _get_own_application

outreach = Blueprint('outreach', __name__, url_prefix='/api')


def read_text(data, key, limit, label):
    value = data.get(key, '')
    if not isinstance(value, str) or len(value) > limit:
        raise ApiError(f'{label} must be text up to {limit:,} characters.')
    return value.strip()


def short_label(value):
    return value if len(value) <= 55 else value[:54].rstrip() + '…'


@outreach.post('/applications/<int:application_id>/outreach')
def draft_outreach(application_id):
    application = _get_own_application(application_id)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError('Send a JSON object.')

    recruiter = ' '.join(read_text(data, 'recruiter_name', 100, 'Recruiter name').split())
    background = read_text(data, 'background', 800, 'Your relevant background')
    job = application.job
    if 'description' in data:
        description = read_text(data, 'description', 20_000, 'Job description')
    else:
        description = (job.about or '').strip()[:20_000]
    if not description:
        raise ApiError('Add a job description to generate a tailored email.')

    company = ' '.join(job.company_name.split())
    role = ' '.join(job.title.split())
    try:
        response = request_worker('POST', 'outreach/draft', timeout=32, json={
            'company': company,
            'role': role,
            'description': description,
            'background': background,
        })
    except requests.RequestException:
        return jsonify(error='Outreach service is unavailable. Check that the worker is running and try again.'), 503

    try:
        result = response.json()
    except ValueError:
        result = None
    if not response.ok:
        if isinstance(result, dict) and isinstance(result.get('error'), str) and response.status_code in (502, 503):
            return jsonify(error=result['error']), response.status_code
        return jsonify(error='Could not generate the outreach draft. Try again.'), 502

    paragraph = result.get('paragraph') if isinstance(result, dict) else None
    if not isinstance(paragraph, str) or not paragraph.strip():
        return jsonify(error='Could not generate the outreach draft. Try again.'), 502

    greeting = f'Hi {recruiter},' if recruiter else 'Hello,'
    sender = ' '.join(g.user.name.split())
    subject = f'{short_label(role)} at {short_label(company)}'
    body = (
        f"{greeting}\n\n"
        f"I'm reaching out about the {role} position at {company}. {paragraph.strip()}\n\n"
        "If you're the right person to contact, I'd appreciate any guidance on the next steps.\n\n"
        f"Thanks,\n{sender}"
    )
    return jsonify(subject=subject, body=body)
