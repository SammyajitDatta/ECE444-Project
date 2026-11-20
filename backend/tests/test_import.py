import io
import json
import pytest
from job_import import parse_job
from public_web import public_address, SourceError

def test_jsonld_graph_and_review_fields():
  posting={'@graph':[{'@type':'JobPosting','title':'Developer','hiringOrganization':{'name':'Acme'},'description':'<p>Build accessible software applications with a team.</p>','employmentType':'INTERN','baseSalary':{'value':{'minValue':20,'maxValue':30}}}]}
  data=('<html><script type="application/ld+json">'+json.dumps(posting)+'</script><p>Build accessible software applications with a team.</p></html>').encode()
  result=parse_job(data,'text/html')
  assert result['title']=='Developer' and result['company_name']=='Acme'
  assert result['job_type']=='internship' and result['salary_low']=='20'
  assert '<p>' not in result['about']

def test_unstructured_does_not_invent_fields():
  result=parse_job(b'We want someone to build reliable software for our customers.','text/plain')
  assert result['title']=='' and result['company_name']==''

def test_plain_text_labels():
  result=parse_job(b'Job title: Developer\nCompany: Acme\nBuild accessible applications and reliable software.','text/plain')
  assert result['title']=='Developer' and result['company_name']=='Acme'

def test_upload_validation(signed,headers):
  assert signed.post('/api/jobs/parse',data={},headers=headers).status_code==422
  assert signed.post('/api/jobs/parse',data={'file':(io.BytesIO(b'bad'),'bad.pdf')},headers=headers).status_code==422
  assert signed.post('/api/jobs/parse',data={'file':(io.BytesIO(b'x'),'bad.exe')},headers=headers).status_code==422
  assert signed.post('/api/jobs/parse',data={'file':(io.BytesIO(b'x'*(2*1024*1024+1)),'huge.txt')},headers=headers).status_code==422
  r=signed.post('/api/jobs/parse',data={'file':(io.BytesIO(b'Job title: Developer\nCompany: Acme\nMake useful software for people.'),'job.txt')},headers=headers)
  assert r.status_code==200 and r.json['job']['title']=='Developer'

@pytest.mark.parametrize('url',['http://example.com','https://127.0.0.1','https://[::1]','https://169.254.169.254','https://user:pass@example.com','file:///etc/passwd','https://example.com:8080'])
def test_rejects_unsafe_urls(url):
  with pytest.raises(SourceError): public_address(url)

def test_redirect_and_robots_checks(monkeypatch):
  import public_web
  monkeypatch.setattr(public_web,'robots_allowed',lambda url:True)
  def request(url):
    if url=='https://public.example/': return 302,{'Location':'https://127.0.0.1/'},b''
    public_address(url)
  monkeypatch.setattr(public_web,'_request',request)
  with pytest.raises(SourceError): public_web.fetch_public('https://public.example/')
  monkeypatch.setattr(public_web,'robots_allowed',lambda url:False)
  with pytest.raises(SourceError): public_web.fetch_public('https://public.example/')

def test_pdf_text_extraction(signed,headers):
  from reportlab.pdfgen import canvas
  data=io.BytesIO();pdf=canvas.Canvas(data)
  pdf.drawString(72,750,'Job title: Developer');pdf.drawString(72,730,'Company: Acme');pdf.drawString(72,710,'Build useful software with our engineering team.');pdf.save()
  r=signed.post('/api/jobs/parse',data={'file':(io.BytesIO(data.getvalue()),'job.pdf')},headers=headers)
  assert r.status_code==200 and r.json['job']['title']=='Developer'

def test_dns_rebinding_uses_validated_address(monkeypatch):
  import public_web
  created=[]
  class Response:
    status=200
    headers={'Content-Type':'text/plain'}
    def read(self,*args,**kwargs): return b'content'
    def close(self): pass
  class Pool:
    def __init__(self,host,**kwargs): created.append((host,kwargs))
    def urlopen(self,*args,**kwargs): return Response()
    def close(self): pass
  monkeypatch.setattr(public_web.socket,'getaddrinfo',lambda *a,**k:[(2,1,6,'',('93.184.216.34',443))])
  monkeypatch.setattr(public_web.urllib3,'HTTPSConnectionPool',Pool)
  public_web._request('https://public.example/path')
  assert created[0][0]=='93.184.216.34'
  assert created[0][1]['assert_hostname']=='public.example'
  assert created[0][1]['server_hostname']=='public.example'
