from types import SimpleNamespace
from unittest.mock import Mock

import pytest
import requests

import resume_proxy


@pytest.mark.parametrize('method, action, payload, content_type, status', [
    ('GET', 'health', b'', None, 200),
    ('POST', 'generate', b'{"master":"fixture"}', 'application/json', 422),
    ('POST', 'parse-resume', b'--boundary--\r\n', 'multipart/form-data; boundary=boundary', 200),
])
def test_proxy_forwards_only_allowed_requests_to_mock_worker(
    signed, headers, monkeypatch, method, action, payload, content_type, status,
):
    body = b'{"message":"worker response"}'
    send = Mock(return_value=SimpleNamespace(status_code=status, content=body))
    monkeypatch.setattr(resume_proxy.requests, 'request', send)
    monkeypatch.setenv('RESUME_WORKER_TOKEN', 'internal-test-token')
    response = signed.open(f'/api/{action}', method=method, data=payload, headers=headers, content_type=content_type)
    assert response.status_code == status
    assert response.data == body
    assert response.mimetype == 'application/json'
    send.assert_called_once_with(
        method, f'http://127.0.0.1:3001/api/{action}', data=payload, timeout=90,
        headers={'Content-Type': content_type or 'application/json', 'X-Worker-Token': 'internal-test-token'},
    )


@pytest.mark.parametrize('method, action', [('POST', 'health'), ('GET', 'generate'), ('GET', 'unknown')])
def test_proxy_rejects_unknown_actions_and_wrong_methods(signed, headers, monkeypatch, method, action):
    worker = Mock()
    monkeypatch.setattr(resume_proxy, 'request_worker', worker)
    response = signed.open(f'/api/{action}', method=method, headers=headers)
    assert response.status_code == 404
    worker.assert_not_called()


def test_proxy_worker_timeout_returns_actionable_error(signed, headers, monkeypatch):
    monkeypatch.setattr(resume_proxy, 'request_worker', Mock(side_effect=requests.Timeout))
    response = signed.post('/api/generate', json={}, headers=headers)
    assert response.status_code == 503
    assert 'Start the Node worker' in response.json['error']
