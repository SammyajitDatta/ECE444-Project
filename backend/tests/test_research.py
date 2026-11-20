import pytest
import research
from interview import reported_questions

COMPANY='Acme builds software tools for small businesses.'
REPORT='During my Acme Software Engineer interview, the interviewer asked: "How do you handle a deadlock?"'

def test_company_evidence_has_verbatim_citations(signed,headers,monkeypatch):
  monkeypatch.setattr(research,'fetch_public',lambda url:((COMPANY+' Software Engineer responsibilities include building reliable tools.').encode(),'text/plain',url))
  result=signed.post('/api/applications/1/research',json={'source_url':'https://example.com/about'},headers=headers)
  assert result.status_code==200 and len(result.json['items'])==2
  for item in result.json['items']:
    assert item['source_url']=='https://example.com/about' and item['retrieved_at']
    assert item['text'] in COMPANY+' Software Engineer responsibilities include building reliable tools.'

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
