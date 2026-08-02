import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const [source, eventTypes, adminEditor, adminListPage, apiSource] = await Promise.all([
  readFile("convex/events.ts", "utf8"),
  readFile("src/types/index.ts", "utf8"),
  readFile("src/app/admin/events/[id]/page.tsx", "utf8"),
  readFile("src/app/admin/events/page.tsx", "utf8"),
  readFile("src/lib/api.ts", "utf8"),
])

function exportedBlock(exportName, nextExportName) {
  const start = source.indexOf(`export const ${exportName}`)
  assert.notEqual(start, -1, `missing export ${exportName}`)
  const end = nextExportName
    ? source.indexOf(`export const ${nextExportName}`, start)
    : source.length
  return source.slice(start, end === -1 ? source.length : end)
}

test("public event DTO uses an allow-list without audience-routing metadata", () => {
  assert.match(source, /function publicEventDto\(event:\s*any\)/)
  assert.match(source, /_id:\s*event\._id/)

  for (const publicField of [
    "title",
    "date",
    "time",
    "endDate",
    "endTime",
    "location",
    "description",
    "url",
    "color",
  ]) {
    assert.match(source, new RegExp(`${publicField}:\\s*event\\.${publicField}`))
  }

  const dtoStart = source.indexOf("function publicEventDto")
  const dtoEnd = source.indexOf("function managerEventDto", dtoStart)
  const dto = source.slice(dtoStart, dtoEnd)
  for (const privateField of [
    "_creationTime",
    "audiences",
    "targetScope",
    "createdAt",
    "updatedAt",
  ]) {
    assert.doesNotMatch(dto, new RegExp(`${privateField}:\\s*event\\.${privateField}`))
  }
})

test("public list and detail authorize raw rows before projecting them", () => {
  const list = exportedBlock("list", "getById")
  const detail = exportedBlock("getById", "adminList")

  assert.match(
    list,
    /filter\(\(event\)\s*=>\s*canViewEvent\(event,\s*actor,\s*scopeContext\)\)[\s\S]*?\.map\(publicEventDto\)/,
  )
  assert.match(
    detail,
    /canViewEvent\(event,\s*actor,\s*scopeContext\)\s*\?\s*publicEventDto\(event\)\s*:\s*null/,
  )
})

test("manager list returns a minimal editable projection while count returns only a number", () => {
  const adminList = exportedBlock("adminList", "create")
  const count = exportedBlock("count")

  assert.match(adminList, /requireContentManager\(ctx,\s*actor,\s*"events"\)/)
  assert.match(adminList, /return rows\.slice\([\s\S]*?\.map\(managerEventDto\)/)
  assert.match(count, /\.filter\(\(event\)\s*=>\s*canViewEvent\(event,\s*actor,\s*scopeContext\)\)\.length/)
})

test("public Event typing does not require redacted storage timestamps", () => {
  const start = eventTypes.indexOf("export interface Event")
  const end = eventTypes.indexOf("\n}", start)
  const eventType = eventTypes.slice(start, end)

  assert.match(eventType, /createdAt\?:\s*number/)
  assert.match(eventType, /updatedAt\?:\s*number/)
})

test("admin event editor reads routing fields from the management endpoint", () => {
  const adminDetail = exportedBlock("adminGetById", "create")
  assert.match(adminDetail, /requireContentManager\(ctx,\s*actor,\s*"events"\)/)
  assert.match(adminDetail, /managerEventDto\(event\)/)

  assert.match(apiSource, /export function useAdminEventById/)
  assert.match(apiSource, /api\.events\.adminGetById/)
  assert.match(adminEditor, /useAdminEventById/)
  assert.doesNotMatch(adminEditor, /useEventById/)
  assert.doesNotMatch(adminEditor, /useAdminEvents/)
})

test("admin event list handles the redacted public Event timestamp contract", () => {
  assert.match(adminListPage, /event\.createdAt\s*\?/)
})
