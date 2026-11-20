import json
from unittest.mock import Mock

import pytest
import research
import requests
from interview import reported_questions
from models import ApplicationStatus
from public_web import SourceError

COMPANY='Acme builds software tools for small businesses.'
REPORT='During my Acme Software Engineer interview, the interviewer asked: "How do you handle a deadlock?"'

def test_company_evidence_has_verbatim_citations(signed,headers,monkeypatch):
  monkeypatch.setattr(research,'fetch_public',lambda url:((COMPANY+' Software Engineer responsibilities include building reliable tools.').encode(),'text/plain',url))
  worker = Mock(side_effect=requests.ConnectionError)
  monkeypatch.setattr(research, 'request_worker', worker)
  result=signed.post('/api/applications/1/research',json={'source_url':'https://example.com/about'},headers=headers)
  assert result.status_code==200 and len(result.json['items'])==2
  assert result.json['gemini_ranked'] is False
  for item in result.json['items']:
    assert item['source_url']=='https://example.com/about' and item['retrieved_at']
    assert item['text'] in COMPANY+' Software Engineer responsibilities include building reliable tools.'

def test_gemini_ranks_retrieved_excerpts_using_saved_job(signed, headers, monkeypatch):
  original = 'Acme builds software tools for small businesses.'
  preferred = 'Acme develops payroll software for small businesses.'
  role = 'Software Engineer responsibilities include building reliable tools.'
  text = ' '.join([original, preferred, role])
  monkeypatch.setattr(research, 'fetch_public', lambda url: (text.encode(), 'text/plain', url))
  worker = Mock()
  worker.return_value.json.return_value = {'indices': [True, 9, -1, '0', 1, 1, 2]}
  monkeypatch.setattr(research, 'request_worker', worker)
  result = signed.post('/api/applications/1/research', json={
    'source_url': 'https://example.com/about', 'company': 'Untrusted client value',
  }, headers=headers)
  assert result.status_code == 200 and result.json['gemini_ranked'] is True
  assert worker.call_args.kwargs['json'] == {
    'company': 'Acme', 'role': 'Software Engineer', 'excerpts': [original, preferred, role],
  }
  assert [item['text'] for item in result.json['items']] == [preferred, original, role]
  assert all(item['source_url'] == 'https://example.com/about' and item['retrieved_at']
    for item in result.json['items'])

def test_research_discovers_company_and_role_sources(signed, headers, monkeypatch):
  monkeypatch.setenv('BRAVE_SEARCH_API_KEY', 'test-only')
  company_url = 'https://example.com/about'
  role_url = 'https://example.com/careers'
  search = Mock(side_effect=[
    Mock(**{'json.return_value': {'web': {'results': [{'url': company_url}]}}}),
    Mock(**{'json.return_value': {'web': {'results': [{'url': company_url}, {'url': role_url}]}}}),
  ])
  monkeypatch.setattr(research.requests, 'get', search)
  pages = {
    company_url: COMPANY,
    role_url: 'Acme\nThe Software Engineer owns development and testing for the platform.',
  }
  monkeypatch.setattr(research, 'fetch_public', lambda url: (pages[url].encode(), 'text/plain', url))
  monkeypatch.setattr(research, 'request_worker', Mock(side_effect=requests.ConnectionError))
  result = signed.post('/api/applications/1/research', json={}, headers=headers)
  assert result.status_code == 200
  assert [item['source_url'] for item in result.json['items']] == [company_url, role_url]
  assert [call.kwargs['params']['q'] for call in search.call_args_list] == [
    '"Acme" about company', '"Acme" "Software Engineer" careers job responsibilities',
  ]

def test_research_without_source_discovery_explains_next_step(signed, headers, monkeypatch):
  monkeypatch.delenv('BRAVE_SEARCH_API_KEY', raising=False)
  result = signed.post('/api/applications/1/research', json={}, headers=headers)
  assert result.status_code == 200 and result.json['items'] == []
  assert 'public source URL' in result.json['notes'][0]

@pytest.mark.parametrize('employer, expected', [('Acme', True), ('Other Employer', False)])
def test_role_excerpt_requires_matching_structured_posting(signed, headers, monkeypatch, employer, expected):
  description = 'Build and test payroll tooling for small businesses.'
  metadata = json.dumps({
    '@type': 'JobPosting', 'title': 'Software Engineer',
    'hiringOrganization': {'name': employer}, 'description': f'<p>{description}</p>',
  })
  page = f'<script type="application/ld+json">{metadata}</script><p>{description}</p>'
  monkeypatch.setattr(research, 'fetch_public', lambda url: (page.encode(), 'text/html', url))
  url = 'https://example.com/careers/engineer'
  result = signed.post('/api/applications/1/research', json={'source_url': url}, headers=headers)
  assert result.status_code == 200
  assert [item['text'] for item in result.json['items']] == ([description] if expected else [])
  if expected:
    assert result.json['items'][0]['source_url'] == url

def test_interview_extraction_and_status(signed,headers,monkeypatch,records):
  fetch = Mock(side_effect=lambda url: (REPORT.encode(), 'text/plain', url))
  monkeypatch.setattr(research, 'fetch_public', fetch)
  result=signed.post('/api/applications/1/interview',json={'source_url':'https://example.com/report'},headers=headers)
  assert result.json['items'][0]['text']=='How do you handle a deadlock?'
  assert result.json['items'][0]['source_url']=='https://example.com/report'
  records.application.status = ApplicationStatus.APPLIED
  assert signed.post('/api/applications/1/interview',json={},headers=headers).status_code==409
  fetch.assert_called_once_with('https://example.com/report')

@pytest.mark.parametrize('text',[
 'Acme Software Engineer practice example: "How do you handle a deadlock?"',
 'Acme Software Engineer interviewer might ask: "How do you handle a deadlock?"',
 'During my Other Software Engineer interview, the interviewer asked: "How do you handle a deadlock?"',
 'During my Acme Designer interview, the interviewer asked: "How do you handle a deadlock?"',
 'During my AcmeLabs Software Engineer interview, the interviewer asked: "How do you handle a deadlock?"',
 'During my Acme Software Engineering Manager interview, the interviewer asked: "How do you handle a deadlock?"',
 'During my Acme Software Engineer interview, I was not asked: "How do you handle a deadlock?"',
 'During my Acme Software Engineer interview, they asked me: "Why?"',
 'During my Acme Software Engineer interview, the interviewer asked: "Explain your approach."',
])
def test_unsupported_questions_are_not_reported(text):
  assert reported_questions(text,'Acme','Software Engineer')==[]

def test_unavailable_and_missing_search_key_are_explicit(signed,headers,monkeypatch):
  monkeypatch.delenv('BRAVE_SEARCH_API_KEY',raising=False)
  result=signed.post('/api/applications/1/interview',json={},headers=headers)
  assert result.json['items']==[] and 'No relevant' in result.json['message']
  assert 'not configured' in result.json['notes'][0]

@pytest.mark.parametrize('route', ['research', 'interview'])
@pytest.mark.parametrize('body', [['bad'], {'source_url': 1}, {'source_url': 'x' * 2001}])
def test_invalid_research_requests_stop_before_retrieval(signed, headers, monkeypatch, route, body):
  retrieve = Mock()
  monkeypatch.setattr(research, 'fetch_public', retrieve)
  response = signed.post('/api/applications/1/' + route, json=body, headers=headers)
  assert response.status_code == 400
  retrieve.assert_not_called()


def test_interview_questions_are_deduplicated_and_bounded():
  questions = ['How do you handle a deadlock?', 'How did you test your project?',
               'How do you document errors?', 'What causes a cache miss?']
  terms = [questions[0], *questions]
  report = '\n'.join(f'At Acme, the Software Engineer interviewer asked: “{question}”' for question in terms)
  assert [item['text'] for item in reported_questions(report, 'Acme', 'Software Engineer')] == questions[:3]


def test_collect_skips_unavailable_sources_and_duplicate_final_urls(monkeypatch):
  url = 'https://example.test/company'
  monkeypatch.setattr(research, 'discover_sources', Mock(return_value=([
      'https://example.test/unavailable', url, 'https://example.test/redirect',
  ], '')))
  retrieve = Mock(side_effect=[SourceError('blocked'), (COMPANY.encode(), 'text/plain', url),
                               (COMPANY.encode(), 'text/plain', url)])
  monkeypatch.setattr(research, 'fetch_public', retrieve)
  evidence, notes = research.collect('Acme', 'Developer', 'company', research.company_evidence)
  assert len(evidence) == 1
  assert evidence[0]['source_url'] == url
  assert evidence[0]['source_name'] == 'example.test'
  assert notes == ['A source was unavailable, disallowed, or unreadable and was skipped.']


def test_invalid_search_payload_preserves_other_discovered_sources(monkeypatch):
  monkeypatch.setenv('BRAVE_SEARCH_API_KEY', 'test-only')
  source = 'https://example.test/role'
  search = Mock(side_effect=[
      Mock(**{'json.return_value': {'web': None}}),
      Mock(**{'json.return_value': {'web': {'results': [None, {'url': source}]}}}),
  ])
  monkeypatch.setattr(research.requests, 'get', search)
  urls, note = research.discover_sources('Acme', 'Developer', 'company')
  assert urls == [source]
  assert 'unavailable' in note


def test_interview_discovery_searches_for_candidate_reports(monkeypatch):
  monkeypatch.setenv('BRAVE_SEARCH_API_KEY', 'test-only')
  source = 'https://example.test/report'
  search = Mock(**{'return_value.json.return_value': {'web': {'results': [{'url': source}]}}})
  monkeypatch.setattr(research.requests, 'get', search)
  assert research.discover_sources('Acme', 'Developer', 'interview') == ([source], '')
  assert 'interview questions candidate experience' in search.call_args.kwargs['params']['q']


def test_posting_metadata_without_employer_does_not_create_role_evidence():
  html = b'<script type="application/ld+json">{"@type":"JobPosting","title":"Developer"}</script>'
  assert research.posting_role_evidence(html, 'Acme', 'Developer') == []


def test_excerpt_selection_limits_and_deduplicates_when_worker_result_is_invalid(monkeypatch):
  worker = Mock(**{'return_value.json.return_value': {'indices': 'invalid'}})
  monkeypatch.setattr(research, 'request_worker', worker)
  first = {'text': 'First excerpt', 'kind': research.COMPANY_EXCERPT}
  second = {'text': 'Second excerpt', 'kind': research.COMPANY_EXCERPT}
  duplicate = {'text': 'FIRST EXCERPT', 'kind': research.COMPANY_EXCERPT}
  third = {'text': 'Third excerpt', 'kind': research.COMPANY_EXCERPT}
  assert research.select_excerpts([first, duplicate, second, third], 'Acme', 'Developer') == ([first, second], False)
