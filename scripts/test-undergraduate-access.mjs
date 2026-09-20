import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
const filename = 'src/lib/undergraduate-access.ts'
const source = readFileSync(filename, 'utf8')
const exports = {}
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
const { isUndergraduate, restrictToUndergraduate, verifyUndergraduateLogin } = exports
for (const role of ['member', 'admin', 'super_admin']) {
  assert.equal(isUndergraduate({ identityType: 'undergrad', role }), true)
  for (const identityType of ['graduate', 'teacher', 'other', undefined, null, '']) {
    assert.equal(isUndergraduate({ identityType, role, isClassMember: true, cohort: 2026 }), false)
  }
}
assert.equal(restrictToUndergraduate(undefined), undefined)
assert.equal(restrictToUndergraduate(null), null)
assert.equal(restrictToUndergraduate({ identityType: 'teacher' }), null)
const student = { identityType: 'undergrad' }
assert.equal(restrictToUndergraduate(student), student)
const result = { sessionToken: 'test-only', email: 'test@example.invalid' }
assert.equal(await verifyUndergraduateLogin(result, async () => student), result)
for (const identityType of ['graduate', 'teacher', undefined]) {
  await assert.rejects(() => verifyUndergraduateLogin(result, async () => ({ identityType })), /本科生/)
}
await assert.rejects(() => verifyUndergraduateLogin({}, async () => student))
await assert.rejects(() => verifyUndergraduateLogin(result, async () => { throw Error('offline') }))
console.log('Undergraduate access regression tests passed')

// Exercise the actual hook boundary, not just the identity predicate.
let identityType = 'teacher'
let storedToken = 'existing-session'
const calls = []
const user = () => ({ identityType, role: 'super_admin' })
const apiProxy = new Proxy({}, { get: (_, group) => new Proxy({}, { get: (_, fn) => `${group}:${fn}` }) })
const react = {
  useCallback: fn => fn,
  useMemo: fn => fn(),
  useSyncExternalStore: () => storedToken,
  useEffect: () => {},
}
const convex = {
  useConvex: () => ({ query: async () => user() }),
  useMutation: () => async () => result,
  useQuery: (ref, args) => {
    calls.push({ ref, args })
    if (args === 'skip') return undefined
    if (ref.startsWith('auth:currentUser')) return user()
    if (ref === 'users:listPublicTongClassMembers') return [{ username: 'student' }]
    if (ref === 'users:list') return [user(), { identityType: 'undergrad' }]
    if (ref === 'users:getById') return user()
  },
}
function loadModule(path, overrides = {}) {
  const out = {}
  const require = name => {
    if (name in overrides) return overrides[name]
    if (name === 'react') return react
    if (name === 'convex/react') return convex
    if (name === 'convex/server') return { makeFunctionReference: x => x }
    if (name.includes('_generated/api')) return { api: apiProxy }
    if (name === '@/lib/undergraduate-access') return exports
    if (name === 'next/navigation') return { useRouter: () => ({}) }
    return {}
  }
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: out, require })
  return out
}
const hooks = loadModule('src/lib/api.ts')
const auth = loadModule('src/lib/hooks/use-auth.ts', { '@/lib/api': hooks })
assert.equal(hooks.useTongClassSessionToken(), '')
assert.equal(hooks.useCurrentUser(), null)
assert.equal(hooks.useIsAdmin(), false)
assert.equal(auth.useAuth().isAuthenticated, false)
assert.equal(auth.useAuth().isSuperAdmin, false)
await assert.rejects(() => hooks.useSimpleLogin()({ studentId: 'test', password: 'test' }), /本科生/)
hooks.useUsers({ classMembersOnly: true })
assert.equal(calls.find(c => c.ref === 'users:listPublicTongClassMembers' && c.args !== 'skip').args.identityType, 'undergrad')
identityType = 'undergrad'
assert.equal(hooks.useTongClassSessionToken(), storedToken)
assert.equal(auth.useAuth().isAuthenticated, true)
assert.equal(await hooks.useSimpleLogin()({ studentId: 'test', password: 'test' }), result)
console.log('Actual authentication and directory hook tests passed')
