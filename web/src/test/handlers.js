import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/auth/me', () =>
    HttpResponse.json({ id: 1, name: 'Test User', phone: '+1234567890' })
  ),

  http.post('/api/auth/login', () =>
    HttpResponse.json({ access_token: 'mock-token', token_type: 'bearer' })
  ),

  http.post('/api/auth/register', () =>
    HttpResponse.json({ access_token: 'mock-token', token_type: 'bearer' })
  ),

  http.get('/api/listings/', () => HttpResponse.json([])),
]
