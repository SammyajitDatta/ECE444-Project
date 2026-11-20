"""Authenticated gateway to the existing local resume worker."""
import os
import requests
from flask import Blueprint, Response, jsonify, request

resume_proxy = Blueprint('resume_proxy', __name__, url_prefix='/api')


def request_worker(method, action, *, timeout, content_type='application/json', **kwargs):
  return requests.request(method, 'http://127.0.0.1:3001/api/' + action,
    headers={'Content-Type': content_type, 'X-Worker-Token': os.environ.get('RESUME_WORKER_TOKEN', '')},
    timeout=timeout, **kwargs)


@resume_proxy.route('/<action>', methods=['GET', 'POST'])
def resume(action):
  methods = {'health':'GET', 'generate':'POST', 'parse-resume':'POST'}
  if action not in methods or request.method != methods[action]:
    return jsonify(error='Endpoint not found'), 404
  try:
    response = request_worker(request.method, action, data=request.get_data(),
      content_type=request.content_type or 'application/json', timeout=90)
    return Response(response.content, status=response.status_code, content_type='application/json')
  except requests.RequestException:
    return jsonify(error='Resume service is unavailable. Start all services with npm run dev.'), 503
