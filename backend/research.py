"""Evidence-first preparation: retrieved excerpts, never invented company facts."""
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit
import requests
from flask import Blueprint, jsonify, request
from job_import import content_text, find_structured_job, visible_text
from public_web import SourceError, fetch_public
from resume_proxy import request_worker
from routes import _get_own_application

research = Blueprint('research', __name__, url_prefix='/api')
COMPANY_EXCERPT = 'Company source excerpt'
ROLE_EXCERPT = 'Role source excerpt'

def discover_sources(company, role, kind):
  key = os.environ.get('BRAVE_SEARCH_API_KEY')
  if not key:
    return [], 'Automatic source discovery is not configured. Add a public source URL to research it.'
  if kind == 'interview':
    queries = [(f'"{company}" "{role}" interview questions candidate experience', 3)]
  else:
    queries = [(f'"{company}" about company', 1), (f'"{company}" "{role}" careers job responsibilities', 2)]
  urls = []
  failed = False
  for query, limit in queries:
    try:
      response = requests.get('https://api.search.brave.com/res/v1/web/search',
        params={'q': query, 'count': 5}, headers={'X-Subscription-Token': key}, timeout=10)
      response.raise_for_status()
      payload = response.json()
      web = payload.get('web', {}) if isinstance(payload, dict) else None
      results = web.get('results', []) if isinstance(web, dict) else None
      if not isinstance(results, list):
        raise ValueError('Invalid search response')
      matches = dict.fromkeys(item['url'] for item in results
        if isinstance(item, dict) and isinstance(item.get('url'), str) and item['url'] not in urls)
      urls.extend(list(matches)[:limit])
    except (requests.RequestException, ValueError):
      failed = True
  note = 'Some automatic search results were unavailable. You can also enter a public source URL.' if failed else ''
  return urls, note

def sentences(text):
  return [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n+', text) if s.strip()]


def name_pattern(name):
  return re.compile(r'(?<!\w)' + re.escape(name) + r'(?!\w)', re.IGNORECASE)


def short_excerpts(text):
  return [line for line in dict.fromkeys(sentences(text)) if len(line) <= 600 and 5 <= len(line.split()) <= 55]


def company_evidence(text, company, role):
  company_pattern = name_pattern(company)
  role_pattern = name_pattern(role)
  if not company_pattern.search(text):
    return []
  candidates = short_excerpts(text)
  role_lines = [line for line in candidates if role_pattern.search(line)]
  company_lines = [line for line in candidates if company_pattern.search(line) and line not in role_lines]
  return ([{'text': line, 'kind': COMPANY_EXCERPT} for line in company_lines[:4]] +
          [{'text': line, 'kind': ROLE_EXCERPT} for line in role_lines[:4]])


def posting_role_evidence(data, company, role):
  posting = find_structured_job(data)
  if not posting:
    return []
  organization = posting.get('hiringOrganization')
  employer = organization.get('name') if isinstance(organization, dict) else organization
  title, description = posting.get('title'), posting.get('description')
  if not all(isinstance(value, str) for value in (employer, title, description)):
    return []
  if employer.strip().casefold() != company.casefold() or title.strip().casefold() != role.casefold():
    return []
  return [{'text': line, 'kind': ROLE_EXCERPT} for line in short_excerpts(visible_text(description)[:20000])[:4]]


def select_excerpts(items, company, role):
  """Use Gemini for ordering only. Text and citation fields come from retrieval."""
  ranked = []
  if len(items) > 1:
    try:
      response = request_worker('POST', 'research/rank', timeout=18,
        json={'company': company, 'role': role, 'excerpts': [item['text'] for item in items]})
      response.raise_for_status()
      payload = response.json()
      indices = payload.get('indices') if isinstance(payload, dict) else None
      if isinstance(indices, list):
        ranked = list(dict.fromkeys(index for index in indices if type(index) is int and 0 <= index < len(items)))
    except (requests.RequestException, ValueError):
      pass
  order = dict.fromkeys([*ranked, *range(len(items))])
  selected = []
  for kind in (COMPANY_EXCERPT, ROLE_EXCERPT):
    matches = [items[index] for index in order if items[index]['kind'] == kind]
    unique = {}
    for item in matches:
      unique.setdefault(item['text'].casefold(), item)
    selected.extend(list(unique.values())[:2])
  return selected, bool(ranked)

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
      if kind == 'company' and content_type in ('text/html', 'application/xhtml+xml'):
        if not any(item['kind'] == ROLE_EXCERPT for item in found):
          found.extend(posting_role_evidence(data, company, role))
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
  company, role = application.job.company_name, application.job.title
  candidates, notes = collect(company, role, 'company', company_evidence, url.strip())
  items, gemini_ranked = select_excerpts(candidates, company, role)
  return jsonify(items=items, notes=notes, company=company, role=role, gemini_ranked=gemini_ranked,
    message='Check the linked pages for the full context.' if items else 'No matching excerpts were found. Try the company’s website or a public posting for this role.')
