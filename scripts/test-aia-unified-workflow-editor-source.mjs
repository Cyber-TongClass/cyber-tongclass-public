import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function source(path) {
  return readFile(path, "utf8").catch(() => "")
}

const editorSource = await source("src/components/oa/oa-workflow-editor.tsx")
const simulationSource = await source("src/components/oa/oa-workflow-simulation.tsx")
const targetPickerSource = await source("src/components/oa/oa-form-target-picker.tsx")
const legacyEntrySource = await readFile("src/components/admin/oa-workflow/oa-workflow-editor.tsx", "utf8")

test("workflow editor uses the approved flat AIA typography and responsive two-column layout", () => {
  assert.match(editorSource, /aia-serif/)
  assert.match(editorSource, /aia-mono/)
  assert.match(editorSource, /aia-border-rule/)
  assert.match(editorSource, /lg:grid-cols-/)
  assert.match(editorSource, /OAWorkflowSimulation/)
  assert.doesNotMatch(editorSource, /(?:<Card|shadow-|rounded-(?:lg|xl|2xl))/)
})

test("workflow editor keeps the create node fixed and edits all configurable node types inline", () => {
  assert.match(editorSource, /创建表单/)
  assert.match(editorSource, /固定起点/)
  assert.match(editorSource, /approval:\s*"审批"/)
  assert.match(editorSource, /batch_approval:\s*"批量审批"/)
  assert.match(editorSource, /fill_form:\s*"填写新表单"/)
  assert.match(editorSource, /notification:\s*"通知"/)
  assert.match(editorSource, /expandedNodeId/)
  assert.match(editorSource, /insertNode/)
  assert.match(editorSource, /在此添加节点/)
})

test("workflow editor configures scopes, completion, target forms, and messages without a component palette", () => {
  assert.match(editorSource, /<OaScopePicker/)
  assert.match(editorSource, /completion/)
  assert.match(editorSource, /<OAFormTargetPicker/)
  assert.match(editorSource, /targetFormId/)
  assert.match(editorSource, /必须完成目标表单后推进/)
  assert.match(editorSource, /仅开放填写权限并继续/)
  assert.match(editorSource, /completionRequired/)
  assert.match(editorSource, /message/)
  assert.doesNotMatch(editorSource, /节点面板|组件面板|永久节点栏/)
})

test("simulation supports normal, deferred, and rejected paths and renders batch branches", () => {
  assert.match(simulationSource, /正常推进/)
  assert.match(simulationSource, /暂缓评审/)
  assert.match(simulationSource, /拒绝/)
  assert.match(simulationSource, /复审/)
  assert.match(simulationSource, /batch_approval/)
  assert.match(simulationSource, /reviewerLabels/)
  assert.match(simulationSource, /等待申请人填写/)
  assert.match(simulationSource, /仅开放权限/)
  assert.match(simulationSource, /aria-label="流程模拟状态"/)
  assert.doesNotMatch(simulationSource, /(?:<Card|shadow-|rounded-(?:lg|xl|2xl))/)
})

test("target form picker receives candidates through props and implements fuzzy keyboard selection", () => {
  assert.match(targetPickerSource, /candidates:/)
  assert.doesNotMatch(targetPickerSource, /@\/lib\/api|useQuery|use[A-Z].*Options/)
  assert.match(targetPickerSource, /role="combobox"/)
  assert.match(targetPickerSource, /event\.key === "ArrowDown"/)
  assert.match(targetPickerSource, /event\.key === "ArrowUp"/)
  assert.match(targetPickerSource, /event\.key === "Enter"/)
  assert.match(targetPickerSource, /event\.key === "Escape"/)
  assert.match(targetPickerSource, /aria-activedescendant=/)
  assert.match(targetPickerSource, /includes\(normalizedQuery\)/)
})

test("the former admin entry point is only a compatibility re-export", () => {
  assert.match(legacyEntrySource, /export\s*\{\s*OAWorkflowEditor\s*\}\s*from\s*"@\/components\/oa\/oa-workflow-editor"/)
  assert.doesNotMatch(legacyEntrySource, /<Card|function ApprovalStepEditor|createOAApprovalStep/)
})
