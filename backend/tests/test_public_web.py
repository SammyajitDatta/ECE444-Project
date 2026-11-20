import socket
from unittest.mock import Mock

import pytest
from urllib3.exceptions import HTTPError

import public_web
from public_web import SourceError


URL = 'https://public.example.test/path'
PUBLIC_IP = '93.184.216.34'


def dns_fixture(monkeypatch, *addresses):
    dns = Mock(return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, 443)) for ip in addresses])
    monkeypatch.setattr(socket, 'getaddrinfo', dns)
    return dns


@pytest.mark.parametrize('url', [
    'http://example.test', 'https://', 'https://user:pass@example.test',
    'file:///test-file', 'https://example.test:8080', 'https://example.test:invalid',
])
def test_rejects_unsupported_url_before_dns(monkeypatch, url):
    dns = dns_fixture(monkeypatch, PUBLIC_IP)
    with pytest.raises(SourceError):
        public_web.public_address(url)
    dns.assert_not_called()


@pytest.mark.parametrize('addresses', [
    (), ('127.0.0.1',), ('::1',), ('169.254.169.254',), (PUBLIC_IP, '10.0.0.1'),
])
def test_rejects_missing_or_nonpublic_dns_answers(monkeypatch, addresses):
    dns_fixture(monkeypatch, *addresses)
    with pytest.raises(SourceError, match='Private and local'):
        public_web.public_address(URL)


def test_unresolvable_host_is_a_source_error(monkeypatch):
    dns = dns_fixture(monkeypatch)
    dns.side_effect = socket.gaierror('test DNS failure')
    with pytest.raises(SourceError, match='test DNS failure'):
        public_web.public_address(URL)


def test_https_request_is_pinned_to_validated_address_with_original_hostname(monkeypatch):
    dns = dns_fixture(monkeypatch, PUBLIC_IP)
    pool_type = Mock()
    response = pool_type.return_value.urlopen.return_value
    response.status = 200
    response.headers = {'Content-Type': 'text/plain'}
    response.read.return_value = b'content'
    monkeypatch.setattr(public_web.urllib3, 'HTTPSConnectionPool', pool_type)

    assert public_web._request(URL + '?page=2') == (200, {'Content-Type': 'text/plain'}, b'content')
    dns.assert_called_once_with('public.example.test', 443, type=socket.SOCK_STREAM)
    assert pool_type.call_args.args == (PUBLIC_IP,)
    assert pool_type.call_args.kwargs['assert_hostname'] == 'public.example.test'
    assert pool_type.call_args.kwargs['server_hostname'] == 'public.example.test'
    request = pool_type.return_value.urlopen.call_args
    assert request.args == ('GET', '/path?page=2')
    assert request.kwargs['headers']['Host'] == 'public.example.test'
    assert request.kwargs['redirect'] is False
    response.read.assert_called_once_with(public_web.MAX_BYTES + 1, decode_content=False)
    response.close.assert_called_once_with()
    pool_type.return_value.close.assert_called_once_with()


@pytest.mark.parametrize('content, headers', [(b'12345', {}), (b'a', {'Content-Encoding': 'gzip'})])
def test_request_rejects_oversize_and_compressed_content_and_releases_pool(monkeypatch, content, headers):
    dns_fixture(monkeypatch, PUBLIC_IP)
    pool_type = Mock()
    response = pool_type.return_value.urlopen.return_value
    response.headers = headers
    response.read.return_value = content
    monkeypatch.setattr(public_web.urllib3, 'HTTPSConnectionPool', pool_type)
    monkeypatch.setattr(public_web, 'MAX_BYTES', 4)

    with pytest.raises(SourceError, match='too large or uses unsupported compression'):
        public_web._request(URL)
    response.close.assert_called_once_with()
    pool_type.return_value.close.assert_called_once_with()


def test_transport_error_closes_connection_pool(monkeypatch):
    dns_fixture(monkeypatch, PUBLIC_IP)
    pool_type = Mock()
    pool_type.return_value.urlopen.side_effect = HTTPError('test transport failure')
    monkeypatch.setattr(public_web.urllib3, 'HTTPSConnectionPool', pool_type)
    with pytest.raises(SourceError, match='could not be reached securely'):
        public_web._request(URL)
    pool_type.return_value.close.assert_called_once_with()


@pytest.mark.parametrize('status, body, allowed', [
    (404, b'', True),
    (302, b'', False),
    (403, b'', False),
    (200, b'User-agent: *\nDisallow: /path', False),
    (200, b'User-agent: *\nDisallow: /other', True),
])
def test_robots_decision(monkeypatch, status, body, allowed):
    dns_fixture(monkeypatch, PUBLIC_IP)
    request = Mock(return_value=(status, {}, body))
    monkeypatch.setattr(public_web, '_request', request)
    assert public_web.robots_allowed(URL) is allowed
    request.assert_called_once_with('https://public.example.test/robots.txt')


def test_fetch_validates_redirect_before_reading_and_reports_final_citation(monkeypatch):
    destination = 'https://public.example.test/final'
    robots = Mock(return_value=True)
    request = Mock(side_effect=[
        (302, {'location': '/final'}, b''),
        (200, {'Content-Type': 'text/html; charset=UTF-8'}, b'page'),
    ])
    monkeypatch.setattr(public_web, 'robots_allowed', robots)
    monkeypatch.setattr(public_web, '_request', request)
    assert public_web.fetch_public(URL) == (b'page', 'text/html', destination)
    assert [call.args[0] for call in robots.call_args_list] == [URL, destination]
    assert [call.args[0] for call in request.call_args_list] == [URL, destination]


def test_fetch_stops_when_redirect_destination_is_disallowed(monkeypatch):
    request = Mock(return_value=(302, {'Location': '/blocked'}, b''))
    monkeypatch.setattr(public_web, 'robots_allowed', Mock(side_effect=[True, False]))
    monkeypatch.setattr(public_web, '_request', request)
    with pytest.raises(SourceError, match='does not permit'):
        public_web.fetch_public(URL)
    request.assert_called_once_with(URL)


@pytest.mark.parametrize('response, message', [
    ((200, {'Content-Type': 'image/png'}, b''), 'Source must be HTML'),
    ((401, {}, b''), 'HTTP 401'),
    ((302, {'Location': '/again'}, b''), 'redirected too many times'),
])
def test_fetch_rejects_unsupported_redirect_loop_or_http_error(monkeypatch, response, message):
    monkeypatch.setattr(public_web, 'robots_allowed', Mock(return_value=True))
    monkeypatch.setattr(public_web, '_request', Mock(return_value=response))
    with pytest.raises(SourceError, match=message):
        public_web.fetch_public(URL)
