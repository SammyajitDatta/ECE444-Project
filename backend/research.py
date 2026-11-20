"""Evidence-first preparation: retrieved excerpts, never invented company facts."""
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit
import requests
from flask import Blueprint, jsonify, request
from job_import import content_text
from public_web import SourceError, fetch_public
from routes import _get_own_application

research = Blueprint('research', __name__, url_prefix='/api')

def discover_sources(company, role, kind):
  key = os.environ.get('BRAVE_SEARCH_API_KEY')
  if not key:
    return [], 'Automatic source discovery is not configured. Add a public source URL to research it.'
  query = f'"{company}" "{role}" ' + ('interview questions candidate experience' if kind == 'interview' else 'company careers about')
  try:
    response = requests.get('https://api.search.brave.com/res/v1/web/search',
      params={'q': query, 'count': 5}, headers={'X-Subscription-Token': key}, timeout=10)
    response.raise_for_status()
    urls = [x['url'] for x in response.json().get('web', {}).get('results', []) if isinstance(x.get('url'), str)]
    return urls[:3], ''
  except (requests.RequestException, ValueError):
    return [], 'Automatic source discovery is unavailable. Try a permitted public source URL.'

def sentences(text):
  return [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n+', text) if s.strip()]

def company_evidence(text, company, role):
  # Keep direct source wording short. Matching company name prevents unrelated search hits.
  evidence = []
  for sentence in sentences(text):
    if company.casefold() in sentence.casefold() and 5 <= len(sentence.split()) <= 55:
      evidence.append({'text': sentence, 'kind': 'Company source excerpt'})
      break
  # Role context is an excerpt rather than an inferred claim about the employer.
  if not evidence:
    return []
  for sentence in sentences(text):
    if role.casefold() in sentence.casefold() and 5 <= len(sentence.split()) <= 55 and sentence != evidence[0]['text']:
      evidence.append({'text': sentence, 'kind': 'Role source excerpt'})
      break
  return evidence

def collect(company, role, kind, extractor, source_url=''):
  urls, discovery_note = ([source_url], '') if source_url else discover_sources(company, role, kind)
  items, notes, seen = [], [], set()
  if discovery_note: notes.append(discovery_note)
  for url in urls:
    try:
      data, content_type, final_url = fetch_public(url)
      if final_url in seen: continue
      seen.add(final_url)
      text = content_text(data, content_type)
      found = extractor(text, company, role)
      for item in found:
        items.append({**item, 'source_url': final_url, 'source_name': urlsplit(final_url).hostname,
          'retrieved_at': datetime.now(timezone.utc).isoformat()})
    except (SourceError, ValueError):
      notes.append('A source was unavailable, disallowed, or unreadable and was skipped.')
  return items, notes

@research.post('/applications/<int:application_id>/research')
def company_research(application_id):
  application = _get_own_application(application_id)
  body = request.get_json(silent=True)
  if not isinstance(body, dict):
    return jsonify(error='Send a JSON object.'), 400
  url = body.get('source_url', '')
  if not isinstance(url, str) or len(url) > 2000:
    return jsonify(error='Source URL must be text, at most 2,000 characters.'), 400
  items, notes = collect(application.job.company_name, application.job.title, 'company', company_evidence, url.strip())
  return jsonify(items=items, notes=notes, company=application.job.company_name, role=application.job.title,
    message='Review the original sources before relying on these excerpts.' if items else 'Reliable company and role information could not be found in the accessible sources.')
