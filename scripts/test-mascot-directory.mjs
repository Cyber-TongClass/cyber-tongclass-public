import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
const out = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/member-directory.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:out})
const cats=[{username:'tongtong',cohort:'mascot'},{username:'bingtang',cohort:'mascot'}]
const students=[{username:'student',identityType:'undergrad'}]
assert.equal(out.mergeDirectoryMembers(students,cats).length,3)
assert.equal(out.mergeDirectoryMembers(students,undefined),undefined)
assert.equal(out.mergeDirectoryMembers(undefined,cats),undefined)
assert.equal(out.mergeDirectoryMembers(students,[...cats,{username:'teacher',cohort:2026}]).length,3)
assert.equal(out.mergeDirectoryMembers([...students,cats[0]],cats).length,3)
assert.equal(out.mergeDirectoryMembers(students,cats,1,1)[0].username,'tongtong')
assert.equal(out.isDirectoryAccount({identityType:'teacher',cohort:2026}),false)
assert.equal(out.isDirectoryAccount({identityType:'graduate'}),false)
assert.equal(out.isDirectoryAccount(cats[0]),true)
console.log('Mascots restored, other non-undergraduates excluded, pagination and loading preserved')
