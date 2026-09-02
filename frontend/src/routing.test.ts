import assert from 'node:assert/strict'
import test from 'node:test'
import {
  appRoutes,
  getDefaultRoute,
  getLoginRouteState,
  getRouteRedirect,
} from './routing.ts'

test('protected routes send signed-out users to sign in', () => {
  assert.equal(
    getRouteRedirect('signedOut', 'protected'),
    appRoutes.login,
  )
  assert.equal(getRouteRedirect('authenticated', 'protected'), null)
})

test('public routes send authenticated users to products', () => {
  assert.equal(
    getRouteRedirect('authenticated', 'public'),
    appRoutes.products,
  )
  assert.equal(getRouteRedirect('signedOut', 'public'), null)
})

test('unknown locations use the correct default route', () => {
  assert.equal(getDefaultRoute('authenticated'), appRoutes.products)
  assert.equal(getDefaultRoute('signedOut'), appRoutes.login)
  assert.equal(getDefaultRoute('error'), appRoutes.login)
})

test('login route state preserves only a registered email address', () => {
  assert.deepEqual(
    getLoginRouteState({ registeredEmail: 'person@example.com' }),
    { registeredEmail: 'person@example.com' },
  )
  assert.deepEqual(getLoginRouteState({ registeredEmail: 12 }), {
    registeredEmail: '',
  })
  assert.deepEqual(getLoginRouteState(null), { registeredEmail: '' })
})
