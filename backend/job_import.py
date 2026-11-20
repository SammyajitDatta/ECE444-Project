import io
import json
import re
from bs4 import BeautifulSoup
from pypdf import PdfReader
from flask import Blueprint, jsonify, request
from public_web import SourceError, fetch_public

job_import = Blueprint('job_import', __name__, url_prefix='/api')

def visible_text(html):
  soup = BeautifulSoup(html, 'html.parser')
  for node in soup(['script', 'style', 'nav', 'footer', 'header', 'noscript']):
    node.decompose()
  return soup.get_text(' ', strip=True)

def content_text(data, kind):
  if kind == 'application/pdf':
    try:
      reader = PdfReader(io.BytesIO(data))
      if len(reader.pages) > 30:
        raise SourceError('PDF must contain no more than 30 pages.')
      text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    except SourceError:
      raise
    except Exception as exc:
      raise SourceError('Could not read this PDF. Use a text-based PDF.') from exc
  else:
    text = data.decode('utf-8', errors='replace')
    if kind != 'text/plain':
      text = visible_text(text)
  if len(text.strip()) < 30:
    raise SourceError('Not enough readable text. Scanned PDFs need OCR before uploading.')
  return text[:20000]

def _postings(value):
  if isinstance(value, list):
    for item in value:
      yield from _postings(item)
  elif isinstance(value, dict):
    types = value.get('@type', [])
    if types == 'JobPosting' or isinstance(types, list) and 'JobPosting' in types:
      yield value
    yield from _postings(value.get('@graph', []))


def find_structured_job(data):
  soup = BeautifulSoup(data, 'html.parser')
  for script in soup.find_all('script', type='application/ld+json'):
    try:
      posting = next(_postings(json.loads(script.string or script.get_text())), None)
    except (ValueError, TypeError):
      continue
    if posting:
      return posting
  return None


def parse_job(data, kind):
  text = content_text(data, kind)
  result = {'title': '', 'company_name': '', 'about': text, 'job_type': '',
    'required_skills': [], 'preferred_skills': [], 'perks': [], 'salary_low': '', 'salary_high': ''}
  structured = find_structured_job(data) if kind in ('text/html', 'application/xhtml+xml') else None
  if structured:
    org = structured.get('hiringOrganization', {})
    result['title'] = str(structured.get('title', ''))[:200]
    result['company_name'] = str(org.get('name', '') if isinstance(org, dict) else org)[:200]
    description = structured.get('description')
    if isinstance(description, str):
      result['about'] = visible_text(description)[:20000]
    employment = structured.get('employmentType', '')
    if isinstance(employment, list): employment = employment[0] if employment else ''
    result['job_type'] = {'FULL_TIME':'full_time','PART_TIME':'part_time','CONTRACTOR':'contract','INTERN':'internship','TEMPORARY':'temporary'}.get(employment, '')
    salary = structured.get('baseSalary', {})
    value = salary.get('value', {}) if isinstance(salary, dict) else {}
    if isinstance(value, dict):
      result['salary_low'] = str(value.get('minValue', value.get('value', '')))[:50]
      result['salary_high'] = str(value.get('maxValue', ''))[:50]
    skills = structured.get('skills')
    if isinstance(skills, str): result['required_skills'] = [x.strip() for x in re.split('[,;]', skills) if x.strip()][:30]
  else:
    # Explicit labels only; never guess an employer or title from arbitrary prose.
    for field, labels in [('title', r'(?:Job title|Position|Role)'), ('company_name', r'(?:Company|Employer)')]:
      match = re.search(r'^\s*' + labels + r'\s*:\s*([^\n]+)', text, re.I | re.M)
      if match: result[field] = match.group(1).strip()[:200]
  return result

@job_import.post('/jobs/parse')
def import_job():
  try:
    file = request.files.get('file')
    url = request.form.get('url', '').strip()
    if bool(file and file.filename) == bool(url):
      raise SourceError('Choose either a public URL or one uploaded file.')
    source = None
    if url:
      data, kind, source = fetch_public(url)
    else:
      name = file.filename.lower()
      kind = 'application/pdf' if name.endswith('.pdf') else 'text/html' if name.endswith(('.html', '.htm')) else 'text/plain' if name.endswith('.txt') else ''
      if not kind: raise SourceError('Upload a PDF, HTML or TXT file.')
      data = file.read(2 * 1024 * 1024 + 1)
      if len(data) > 2 * 1024 * 1024: raise SourceError('Job file must be 2 MB or smaller.')
    result = parse_job(data, kind)
    return jsonify(job=result, source_url=source, note='Review all fields before saving. Missing fields were left blank; extracted salary values use the source units.')
  except SourceError as exc:
    return jsonify(error=str(exc)), 422
