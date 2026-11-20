import re
from flask import Blueprint, jsonify, request
from models import ApplicationStatus
from research import collect, sentences
from routes import _get_own_application

interview = Blueprint('interview', __name__, url_prefix='/api')

def reported_questions(text, company, role):
  """Conservative extraction: exact company/role and explicit report context required.

  Generic practice prompts and generated suggestions are deliberately not returned.
  This can miss valid reports; unsupported questions are worse than an empty result.
  """
  result = []
  for sentence in sentences(text):
    low = sentence.casefold()
    if company.casefold() not in low or role.casefold() not in low:
      continue
    if not re.search(r'\b(?:i was asked|they asked me|interviewer asked|candidate was asked)\b', low):
      continue
    if re.search(r'\b(?:might|may|could|would|practice|example|sample|not asked|never asked)\b', low):
      continue
    match = re.search(r'["“]([^"”]*\?)["”]', sentence)
    if not match or not 3 <= len(match.group(1).split()) <= 50:
      continue
    question = match.group(1).strip()
    if question not in [item['text'] for item in result]:
      result.append({'text':question, 'kind':'Previously reported question (candidate report; not independently confirmed)'})
    if len(result) == 3: break
  return result

@interview.post('/applications/<int:application_id>/interview')
def questions(application_id):
  application = _get_own_application(application_id)
  if application.status != ApplicationStatus.INTERVIEWING:
    return jsonify(error='Mark this application as Interviewing before retrieving questions.'), 409
  body = request.get_json(silent=True)
  if not isinstance(body, dict):
    return jsonify(error='Send a JSON object.'), 400
  url = body.get('source_url', '')
  if not isinstance(url, str) or len(url) > 2000:
    return jsonify(error='Source URL must be text, at most 2,000 characters.'), 400
  items, notes = collect(application.job.company_name, application.job.title, 'interview', reported_questions, url.strip())
  return jsonify(items=items, notes=notes, message='These questions were reported by candidates; they are not guaranteed to appear in your interview.' if items else 'No relevant previously reported questions were found in accessible sources. No questions were generated.')
