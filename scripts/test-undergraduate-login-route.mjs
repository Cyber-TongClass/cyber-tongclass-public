import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
const policy = {}
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/undergraduate-access.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: policy })
let identityType = 'graduate'
let mutations = 0
const client = { mutation: async () => { mutations++; return { sessionToken: 'private-token', email: 'test@example.invalid' } }, query: async () => ({ identityType }) }
const exports = {}
const require = name => ({
  'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
  'convex/server': { makeFunctionReference: x => x },
  '@/lib/server/convex-http': { getConvexHttpClient: () => client },
  '@/lib/undergraduate-access': policy,
}[name])
vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/login/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require })
for (const identity of ['graduate', 'teacher', undefined]) {
  identityType = identity
  const response = await exports.POST({ json: async () => ({ studentId: 'Test', password: 'test-only' }) })
  assert.equal(response.status, 403)
  assert.equal(JSON.stringify(response).includes('private-token'), false)
}
identityType = 'undergrad'
const ok = await exports.POST({ json: async () => ({ studentId: 'student', password: 'test-only' }) })
assert.equal(ok.status, 200)
assert.equal(ok.body.sessionToken, 'private-token')
const before = mutations
assert.equal((await exports.POST({ json: async () => ({ studentId: 'Test' }) })).status, 400)
assert.equal(mutations, before)
console.log('Server login rejects Test graduate / teacher / unknown without returning credentials; undergraduate allowed')
