"""Bounded HTTPS retrieval with DNS pinning, redirect validation and robots checks."""
import ipaddress
import socket
from urllib.parse import urlsplit, urljoin
from urllib.robotparser import RobotFileParser
import urllib3

AGENT = 'ApplyPilotBot'
MAX_BYTES = 2 * 1024 * 1024

class SourceError(ValueError):
  pass

def public_address(url):
  try:
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
      raise SourceError('Use a public HTTPS URL without credentials or a custom port.')
    addresses = {entry[4][0] for entry in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)}
    if not addresses or any(not ipaddress.ip_address(ip).is_global for ip in addresses):
      raise SourceError('Private and local network addresses are not allowed.')
    return parsed, sorted(addresses)[0]
  except (OSError, ValueError) as exc:
    raise SourceError(str(exc)) from exc

def _request(url):
  parsed, ip = public_address(url)
  # Connect to the validated address, retaining TLS hostname verification and SNI.
  pool = urllib3.HTTPSConnectionPool(ip, port=443, assert_hostname=parsed.hostname,
    server_hostname=parsed.hostname, timeout=urllib3.Timeout(connect=4, read=6), retries=False)
  try:
    response = pool.urlopen('GET', (parsed.path or '/') + ('?' + parsed.query if parsed.query else ''),
      headers={'Host': parsed.hostname, 'User-Agent': AGENT, 'Accept-Encoding': 'identity'},
      redirect=False, preload_content=False)
    try:
      body = response.read(MAX_BYTES + 1, decode_content=False)
      if len(body) > MAX_BYTES or response.headers.get('Content-Encoding', 'identity') != 'identity':
        raise SourceError('Source is too large or uses unsupported compression.')
      return response.status, dict(response.headers), body
    finally:
      response.close()
  except urllib3.exceptions.HTTPError as exc:
    raise SourceError('Source could not be reached securely.') from exc
  finally:
    pool.close()

def robots_allowed(url):
  parsed, _ = public_address(url)
  robots_url = f'https://{parsed.netloc}/robots.txt'
  status, headers, body = _request(robots_url)
  if status == 404:
    return True
  if status != 200:
    return False  # Do not bypass unavailable, denied or redirected permission metadata.
  robot = RobotFileParser()
  robot.parse(body.decode('utf-8', errors='replace').splitlines())
  return robot.can_fetch(AGENT, url)

def fetch_public(url):
  for _ in range(4):
    if not robots_allowed(url):
      raise SourceError('This source does not permit retrieval. Upload a permitted copy instead.')
    status, headers, body = _request(url)
    if status in (301, 302, 303, 307, 308):
      url = urljoin(url, headers.get('Location', headers.get('location', '')))
      continue
    if status != 200:
      raise SourceError(f'Source returned HTTP {status}; no content was retrieved.')
    content_type = headers.get('Content-Type', headers.get('content-type', '')).split(';')[0].lower()
    if content_type not in ('text/html', 'text/plain', 'application/xhtml+xml', 'application/pdf'):
      raise SourceError('Source must be HTML, plain text or PDF.')
    return body, content_type, url
  raise SourceError('Source redirected too many times.')
