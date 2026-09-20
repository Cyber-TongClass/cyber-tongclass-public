import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
const exports = {}
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/undergraduate-author.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports })
const { undergraduateAuthorHref } = exports
const members = [{ username: 'photonyan', _id: 'student-id' }]
assert.equal(undergraduateAuthorHref({ profile: { kind: 'institute_person', slug: 'account-2301112071' } }, { isTongClass: true, userId: 'student-id' }, members), null)
assert.equal(undergraduateAuthorHref({ profile: { kind: 'institute_person', slug: 'teacher-2106193086' } }, {}, members), null)
assert.equal(undergraduateAuthorHref({ profile: { kind: 'tong_class_member', slug: 'photonyan' } }, {}, members), '/members/photonyan')
assert.equal(undergraduateAuthorHref({ profile: { kind: 'tong_class_member', slug: 'not-undergraduate' } }, {}, members), null)
assert.equal(undergraduateAuthorHref(undefined, { isTongClass: true, userId: 'student-id' }, members), '/members/photonyan')
assert.equal(undergraduateAuthorHref(undefined, { isTongClass: true, userId: 'graduate-id' }, members), null)
assert.equal(undergraduateAuthorHref({ profile: { kind: 'tong_class_member', slug: 'photonyan' } }, {}, undefined), null)
console.log('Zi\'an / teacher / legacy author recognition regression tests passed')
