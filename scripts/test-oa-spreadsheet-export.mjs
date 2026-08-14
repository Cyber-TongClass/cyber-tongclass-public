import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import test from "node:test"

const root = path.resolve(new URL("..", import.meta.url).pathname)
const outDir = mkdtempSync(path.join(tmpdir(), "oa-spreadsheet-export-"))
const outFile = path.join(outDir, "export.cjs")
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "src/lib/server/oa-form-export.ts"),
  "--bundle", "--platform=node", "--format=cjs", `--outfile=${outFile}`,
])
const { buildAuthorizedTable } = createRequire(import.meta.url)(outFile)

const fields = [
  { id: "department", label: "所属单位", type: "text" },
  {
    id: "xlsx_table",
    label: "新创刊意向明细",
    type: "table",
    columns: [
      { id: "serial", label: "序号", type: "number", required: false },
      { id: "title", label: "拟创办期刊名称", type: "text", required: false },
      { id: "editor", label: "主编", type: "text", required: false },
    ],
  },
]

function access(id, applicant, answers) {
  return {
    submission: {
      _id: id,
      formId: "form_1",
      submitterName: applicant,
      studentId: `${id}-student`,
      submittedAt: Date.UTC(2026, 7, 14),
      answers,
      formSnapshot: { fields },
    },
    form: { _id: "form_1", title: "新创刊意向征集表" },
    version: null,
  }
}

test("flattens every entered repeatable table row into one export row", () => {
  const table = buildAuthorizedTable([
    access("submission_1", "甲", {
      department: "人工智能研究院",
      xlsx_table: [
        { serial: 1, title: "智能教育", editor: "张老师" },
        { serial: 2, title: "机器学习前沿", editor: "李老师" },
      ],
    }),
    access("submission_2", "乙", {
      department: "计算机学院",
      xlsx_table: [
        { serial: 3, title: "具身智能", editor: "王老师" },
        { serial: 4, title: "科学智能", editor: "赵老师" },
      ],
    }),
  ])
  assert.deepEqual(table.header, ["申请编号", "申请人", "学号", "提交时间", "所属单位", "序号", "拟创办期刊名称", "主编"])
  assert.equal(table.rows.length, 4)
  assert.deepEqual(table.rows.map((row) => [row[0], row[1], row[4], row[5], row[6]]), [
    ["submission_1", "甲", "人工智能研究院", "1", "智能教育"],
    ["submission_1", "甲", "人工智能研究院", "2", "机器学习前沿"],
    ["submission_2", "乙", "计算机学院", "3", "具身智能"],
    ["submission_2", "乙", "计算机学院", "4", "科学智能"],
  ])
})

test("does not invent an export row when no table row was entered", () => {
  const table = buildAuthorizedTable([access("submission_empty", "空", { department: "人工智能研究院", xlsx_table: [] })])
  assert.equal(table.rows.length, 0)
})

test("keeps one-row-per-submission behavior for scalar-only forms", () => {
  const scalarFields = [{ id: "title", label: "标题", type: "text" }]
  const scalarAccess = access("submission_scalar", "丙", { title: "一行" })
  scalarAccess.submission.formSnapshot.fields = scalarFields
  const table = buildAuthorizedTable([scalarAccess])
  assert.deepEqual(table.header.slice(-1), ["标题"])
  assert.equal(table.rows.length, 1)
  assert.equal(table.rows[0].at(-1), "一行")
})
