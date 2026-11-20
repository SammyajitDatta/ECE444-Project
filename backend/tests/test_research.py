import json
from unittest.mock import Mock

import pytest
import research
import requests
from interview import reported_questions

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

def test_interview_extraction_and_status(signed,headers,monkeypatch):
  monkeypatch.setattr(research,'fetch_public',lambda url:(REPORT.encode(),'text/plain',url))
  result=signed.post('/api/applications/1/interview',json={'source_url':'https://example.com/report'},headers=headers)
  assert result.json['items'][0]['text']=='How do you handle a deadlock?'
  assert result.json['items'][0]['source_url']=='https://example.com/report'
  signed.patch('/api/applications/1/status',json={'status':'applied'},headers=headers)
  assert signed.post('/api/applications/1/interview',json={},headers=headers).status_code==409

@pytest.mark.parametrize('text',[
 'Acme Software Engineer practice example: "How do you handle a deadlock?"',
 'Acme Software Engineer interviewer might ask: "How do you handle a deadlock?"',
 'During my Other Software Engineer interview, the interviewer asked: "How do you handle a deadlock?"',
 'During my Acme Designer interview, the interviewer asked: "How do you handle a deadlock?"',
 'During my Acme Software Engineer interview, I was not asked: "How do you handle a deadlock?"',
])
def test_unsupported_questions_are_not_reported(text):
  assert reported_questions(text,'Acme','Software Engineer')==[]

def test_unavailable_and_missing_search_key_are_explicit(signed,headers,monkeypatch):
  monkeypatch.delenv('BRAVE_SEARCH_API_KEY',raising=False)
  result=signed.post('/api/applications/1/interview',json={},headers=headers)
  assert result.json['items']==[] and 'No relevant' in result.json['message']
  assert 'not configured' in result.json['notes'][0]

def test_bad_body(signed,headers):
  for route in ['research','interview']:
    assert signed.post('/api/applications/1/'+route,json=['bad'],headers=headers).status_code==400
