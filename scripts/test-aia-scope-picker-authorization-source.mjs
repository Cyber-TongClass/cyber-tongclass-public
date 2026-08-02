import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const pickerSource = await readFile("src/components/oa/oa-scope-picker.tsx", "utf8")
const apiSource = await readFile("src/lib/api.ts", "utf8")

test("scope picker uses one bounded server-side search hook", () => {
  assert.match(apiSource, /oaScopeOptions:searchManageableScopeOptions/)
  assert.match(apiSource, /useManageableScopeOptions/)
  assert.match(pickerSource, /useManageableScopeOptions/)
  assert.doesNotMatch(pickerSource, /useResearchGroupScopeOptions/)
  assert.doesNotMatch(pickerSource, /useUserGroupScopeOptions/)
  assert.doesNotMatch(pickerSource, /useUserPickOptions/)
})

test("scope picker implements accessible combobox keyboard navigation", () => {
  assert.match(pickerSource, /event\.key\s*===\s*"ArrowDown"/)
  assert.match(pickerSource, /event\.key\s*===\s*"ArrowUp"/)
  assert.match(pickerSource, /event\.key\s*===\s*"Enter"/)
  assert.match(pickerSource, /event\.key\s*===\s*"Escape"/)
  assert.match(pickerSource, /aria-activedescendant=/)
  assert.match(pickerSource, /scrollIntoView/)
})

test("scope picker retains server labels for already-selected accounts and groups", () => {
  assert.match(pickerSource, /useManageableScopeOptions\([\s\S]*?userQuery,[\s\S]*?scope,/)
  assert.match(pickerSource, /const allOptions = useMemo/)
  assert.match(pickerSource, /for \(const option of allOptions\) labelCache\.current\.set/)
  assert.match(pickerSource, /allOptions\.filter\(\(option\) => !isSelected\(scope, option\)\)/)
  assert.match(pickerSource, /const selectedItems: SelectedItem\[\] =/)
})
