import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const forms = await import(pathToFileURL(path.resolve("src/lib/oa-forms.ts")).href)
const schemaSource = fs.readFileSync("convex/schema.ts", "utf8")
const typesSource = fs.readFileSync("src/types/index.ts", "utf8")
const backendSource = fs.readFileSync("convex/oaForms.ts", "utf8")
const clientContractSource = fs.readFileSync("src/lib/oa-forms.ts", "utf8")

const scope = { identityTypes: ["teacher"], userIds: ["user-1"] }

test("the V2 contract accepts all five workflow node discriminators", () => {
  const definition = {
    version: 2,
    nodes: [
      { id: "create", type: "create_form", title: "创建表单" },
      { id: "review", type: "approval", title: "导师审批", scope },
      { id: "panel", type: "batch_approval", title: "专家会审", scope, completion: "all" },
      { id: "follow-up", type: "fill_form", title: "填写后续表单", targetFormId: "form-2" },
      { id: "notify", type: "notification", title: "通知申请人", scope, message: "请按时参加。" },
    ],
  }

  assert.doesNotThrow(() => forms.validateOAWorkflowDefinition(definition))
  assert.deepEqual(
    forms.normalizeOAWorkflowDefinition(definition).nodes.map((node) => node.type),
    ["create_form", "approval", "batch_approval", "fill_form", "notification"],
  )
})

test("a workflow has one fixed first create node and globally unique node ids", () => {
  assert.throws(
    () => forms.validateOAWorkflowDefinition({ version: 2, nodes: [] }),
    /创建表单/,
  )
  assert.throws(
    () => forms.validateOAWorkflowDefinition({
      version: 2,
      nodes: [
        { id: "review", type: "approval", title: "审批", scope },
        { id: "create", type: "create_form", title: "创建表单" },
      ],
    }),
    /首个节点.*创建表单/,
  )
  assert.throws(
    () => forms.validateOAWorkflowDefinition({
      version: 2,
      nodes: [
        { id: "create", type: "create_form", title: "创建表单" },
        { id: "second-create", type: "create_form", title: "再次创建" },
      ],
    }),
    /只能包含一个创建表单/,
  )
  assert.throws(
    () => forms.validateOAWorkflowDefinition({
      version: 2,
      nodes: [
        { id: "same", type: "create_form", title: "创建表单" },
        { id: "same", type: "approval", title: "审批", scope },
      ],
    }),
    /节点 ID 不能重复/,
  )
})

test("node-specific required values are validated", () => {
  const start = { id: "create", type: "create_form", title: "创建表单" }
  const invalidNodes = [
    [{ ...start, title: " " }, /节点名称/],
    [{ id: "review", type: "approval", title: "审批", scope: {} }, /审批对象/],
    [{ id: "panel", type: "batch_approval", title: "会审", scope, completion: "later" }, /完成方式/],
    [{ id: "fill", type: "fill_form", title: "填写", targetFormId: " " }, /目标表单/],
    [{ id: "notify", type: "notification", title: "通知", scope, message: " " }, /通知内容/],
  ]

  for (const [node, expected] of invalidNodes) {
    assert.throws(
      () => forms.validateOAWorkflowDefinition({
        version: 2,
        nodes: node.type === "create_form" ? [node] : [start, node],
      }),
      expected,
    )
  }
})

test("legacy approval steps adapt to an ordered V2 definition", () => {
  const legacySteps = [
    { id: "legacy-review", title: "原审批", scope, completion: "any" },
    { id: "legacy-panel", title: "原会审", scope, completion: "all" },
  ]
  const normalized = forms.normalizeOAWorkflowDefinition(undefined, legacySteps)

  assert.deepEqual(normalized.nodes.map((node) => node.type), [
    "create_form",
    "batch_approval",
    "batch_approval",
  ])
  assert.deepEqual(normalized.nodes[1], {
    id: "legacy-review",
    type: "batch_approval",
    title: "原审批",
    scope,
    completion: "any",
  })
  assert.deepEqual(normalized.nodes[2], {
    id: "legacy-panel",
    type: "batch_approval",
    title: "原会审",
    scope,
    completion: "all",
  })
})

test("legacy steps with an empty approver scope are not adapted into unsafe V2 nodes", () => {
  const normalized = forms.normalizeOAWorkflowDefinition(undefined, [
    { id: "unsafe", title: "无审批人", scope: {}, completion: "any" },
    { id: "safe", title: "教师审批", scope, completion: "any" },
  ])

  assert.deepEqual(normalized.nodes.map((node) => node.id), ["create_form", "safe"])
  assert.doesNotThrow(() => forms.validateOAWorkflowDefinition(normalized))
})

test("legacy duplicate step ids receive stable unique ids without dropping steps", () => {
  const legacySteps = [
    { id: "review", title: "初审", scope, completion: "any" },
    { id: "review", title: "复审", scope, completion: "any" },
  ]

  const first = forms.normalizeOAWorkflowDefinition(undefined, legacySteps)
  const second = forms.normalizeOAWorkflowDefinition(undefined, legacySteps)

  assert.deepEqual(first.nodes.map((node) => node.id), ["create_form", "review", "review_2"])
  assert.deepEqual(second, first)
  assert.equal(first.nodes.length, 3)
  assert.doesNotThrow(() => forms.validateOAWorkflowDefinition(first))
})

test("a legacy step id colliding with the fixed create node is renamed stably", () => {
  const normalized = forms.normalizeOAWorkflowDefinition(undefined, [
    { id: "create_form", title: "教务审批", scope, completion: "any" },
  ])

  assert.deepEqual(normalized.nodes.map((node) => node.id), ["create_form", "create_form_2"])
  assert.equal(normalized.nodes[1].title, "教务审批")
  assert.doesNotThrow(() => forms.validateOAWorkflowDefinition(normalized))
})

test("an explicitly present undefined workflow definition remains omitted", () => {
  assert.deepEqual(forms.getOAWorkflowDraftConfig({ workflowDefinition: undefined }), {})
  assert.equal(forms.toOAFormUpsertPayload({
    title: "旧表单",
    slug: "legacy",
    category: "legacy",
    fields: [{ id: "name", type: "text", label: "姓名" }],
    workflowDefinition: undefined,
  }).workflowDefinition, undefined)
})

test("shared and persisted contracts expose V2 definitions and submission snapshots", () => {
  assert.match(typesSource, /export type OAWorkflowNode/)
  assert.match(typesSource, /workflowDefinition\?: OAWorkflowDefinition/)
  assert.match(typesSource, /workflowDefinitionSnapshot\?: OAWorkflowDefinition/)
  assert.match(typesSource, /currentWorkflowNodeIndex\?: number/)
  assert.match(typesSource, /workflowError\?: string/)

  assert.match(schemaSource, /workflowDefinition:\s*v\.optional/)
  assert.match(schemaSource, /workflowDefinitionSnapshot:\s*v\.optional/)
  assert.match(schemaSource, /currentWorkflowNodeIndex:\s*v\.optional\(v\.number\(\)\)/)
  assert.match(schemaSource, /workflowError:\s*v\.optional\(v\.string\(\)\)/)
})

test("the form endpoint accepts, persists, recognizes, and redacts V2 workflow data", () => {
  assert.match(backendSource, /const workflowDefinitionValidator = v\.object/)
  assert.match(backendSource, /workflowDefinition:\s*v\.optional\(workflowDefinitionValidator\)/)
  assert.match(backendSource, /requestedWorkflowDefinition/)
  assert.match(backendSource, /\{\s*workflowDefinition:\s*requestedWorkflowDefinition\s*\}/)
  assert.match(
    backendSource,
    /form\?\.workflowDefinition !== undefined/,
  )
  assert.match(
    backendSource,
    /workflowDefinition:\s*_workflowDefinition/,
  )
  assert.match(
    backendSource,
    /workflowDefinitionSnapshot:\s*_workflowDefinitionSnapshot/,
  )
})

test("the persisted runtime contract includes grants and idempotent node actions", () => {
  assert.match(schemaSource, /oaFormAccessGrants:\s*defineTable/)
  assert.match(schemaSource, /oaApprovalTasks:[\s\S]*?naturalKey:\s*v\.optional\(v\.string\(\)\)/)
  assert.match(schemaSource, /oaApprovalEvents:[\s\S]*?workflowVersion:\s*v\.optional/)
  assert.match(schemaSource, /oaApprovalEvents:[\s\S]*?nodeType:\s*v\.optional/)
  assert.match(clientContractSource, /export type OAFormAccessGrant/)
})
