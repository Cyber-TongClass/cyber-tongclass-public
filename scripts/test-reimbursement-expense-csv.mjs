import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")

function loadTypeScriptModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  const source = fs.readFileSync(absolutePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  }).outputText

  const loadedModule = { exports: {} }
  const sandbox = {
    __dirname: path.dirname(absolutePath),
    __filename: absolutePath,
    console,
    exports: loadedModule.exports,
    module: loadedModule,
    process,
    require,
  }
  vm.runInNewContext(compiled, sandbox, { filename: absolutePath })
  return loadedModule.exports
}

const { parseReimbursementExpenseCsv } = loadTypeScriptModule("src/lib/reimbursement-expense-csv.ts")
const plain = (value) => JSON.parse(JSON.stringify(value))

test("parses pasted reimbursement CSV rows into expense rows", () => {
  const result = parseReimbursementExpenseCsv(`项目名称,金额,备注
机票,3500,北京往返
住宿,1200,会议期间住宿
注册费,800,`)

  assert.deepEqual(plain(result.rows), [
    { item: "机票", amount: "3500", note: "北京往返" },
    { item: "住宿", amount: "1200", note: "会议期间住宿" },
    { item: "注册费", amount: "800", note: "" },
  ])
  assert.deepEqual(plain(result.errors), [])
})

test("supports quoted CSV cells with commas and quoted thousand separators", () => {
  const result = parseReimbursementExpenseCsv(`"交通,住宿", "1,234.50", "含换乘, 含税"`)

  assert.deepEqual(plain(result.rows), [
    { item: "交通,住宿", amount: "1234.50", note: "含换乘, 含税" },
  ])
  assert.deepEqual(plain(result.errors), [])
})

test("reports invalid rows without blocking valid rows", () => {
  const result = parseReimbursementExpenseCsv(`机票,3500,有效
缺少金额,,无效
餐饮,-10,无效
材料,abc,无效`)

  assert.deepEqual(plain(result.rows), [
    { item: "机票", amount: "3500", note: "有效" },
  ])
  assert.deepEqual(plain(result.errors), [
    "第 2 行：项目名称和金额不能为空。",
    "第 3 行：金额必须是非负数字。",
    "第 4 行：金额必须是非负数字。",
  ])
})
