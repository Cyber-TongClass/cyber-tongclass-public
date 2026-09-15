import assert from 'node:assert/strict'
import { withAccountId } from '../src/lib/account-dto.ts'
const authenticated = withAccountId({ id: 'real-server-id', username: 'someone' })
assert.equal(authenticated._id, 'real-server-id')
const anonymous = { username: 'someone' }
assert.equal(withAccountId(anonymous), anonymous)
assert.equal(Object.hasOwn(withAccountId(anonymous), '_id'), false)
assert.equal(withAccountId({ _id: 'legacy-id' })._id, 'legacy-id')
console.log('account DTO: preserve actual IDs; public profiles gain no IDs')
