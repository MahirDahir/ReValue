import { describe, it, expect, beforeEach } from 'vitest'
import { server } from '../test/server'
import { http, HttpResponse } from 'msw'
import client from './client'

describe('api/client interceptor', () => {
  beforeEach(() => localStorage.clear())

  it('attaches Bearer token from localStorage', async () => {
    localStorage.setItem('token', 'my-jwt-token')
    let capturedAuth = null
    server.use(
      http.get('/api/ping', ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      })
    )
    await client.get('/ping')
    expect(capturedAuth).toBe('Bearer my-jwt-token')
  })

  it('omits Authorization header when no token in localStorage', async () => {
    let capturedAuth = 'present'
    server.use(
      http.get('/api/ping', ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      })
    )
    await client.get('/ping')
    expect(capturedAuth).toBeNull()
  })
})
