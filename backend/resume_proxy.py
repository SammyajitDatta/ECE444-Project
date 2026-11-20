"""Authenticated gateway to the existing local resume worker."""
import os
import requests
from flask import Blueprint, Response, jsonify, request

resume_proxy = Blueprint('resume_proxy', __name__, url_prefix='/api')

@resume_proxy.route('/<action>', methods=['GET', 'POST'])
def resume(action):
  methods = {'health':'GET', 'generate':'POST', 'parse-resume':'POST'}
  if action not in methods or request.method != methods[action]:
    return jsonify(error='Endpoint not found'), 404
  try:
    response = requests.request(request.method, 'http://127.0.0.1:3001/api/' + action,
      data=request.get_data(), headers={'Content-Type': request.content_type or 'application/json',
        'X-Worker-Token': os.environ.get('RESUME_WORKER_TOKEN', '')}, timeout=90)
    return Response(response.content, status=response.status_code, content_type='application/json')
  except requests.RequestException:
    return jsonify(error='Resume service is unavailable. Start all services with npm run dev.'), 503
