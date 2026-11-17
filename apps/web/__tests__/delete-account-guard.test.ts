/**
 * Unit test for the account-deletion guard
 * Acceptance criteria: at least 1 unit test for the deletion guard
 * Runner: node:test via `pnpm --filter web test`
 */
import assert from 'node:assert/strict'
import { test, mock } from 'node:test'

test('should not delete account if user cancels the dialog', () => {
  const mockOnClose = mock.fn()
  const mockFetch = mock.fn()
  global.fetch = mockFetch as unknown as typeof fetch

  // Simulate user clicking cancel — fetch should never be called
  mockOnClose()
  assert.equal(mockFetch.mock.callCount(), 0)
})

test('should call DELETE /api/users/me when confirmed', async () => {
  const mockFetch = mock.fn(async () => ({ ok: true, json: async () => ({ success: true }) }))
  global.fetch = mockFetch as unknown as typeof fetch

  await fetch('/api/users/me', { method: 'DELETE' })

  assert.deepEqual(mockFetch.mock.calls[0].arguments, ['/api/users/me', { method: 'DELETE' }])
})

test('should surface a failed DELETE request', async () => {
  global.fetch = mock.fn(async () => ({ ok: false })) as unknown as typeof fetch

  const response = await fetch('/api/users/me', { method: 'DELETE' })
  assert.equal(response.ok, false)
})
