import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const require = createRequire(import.meta.url)

function explicitPath(value, label) {
  if (!value || !path.isAbsolute(value)) throw new Error(`${label}必须是绝对路径`)
  return path.normalize(value)
}

function outputMode(node) {
  if (node.writeTarget === "choice") return "mark_choice"
  if (node.writeTarget === "repeat-row") return "repeat_row"
  if (node.writeTarget === "paragraph-after" || node.writeTarget === "inline-run") return "append"
  return "replace"
}

function fieldFromSuggestion(suggestion) {
  return {
    fieldId: suggestion.fieldId,
    label: suggestion.label,
    answerType: suggestion.inferredAnswerType,
    required: suggestion.required === true,
    ...(suggestion.maxLength ? { maxLength: suggestion.maxLength } : {}),
    ...(suggestion.options?.length ? { options: suggestion.options } : {}),
    ...(suggestion.columns?.length ? { columns: suggestion.columns } : {}),
  }
}

function anchorFromBinding(suggestion, candidate) {
  return {
    fieldId: suggestion.fieldId,
    kind: suggestion.kind,
    partName: candidate.partName,
    path: candidate.path,
    contextHash: candidate.contextHash,
    output: {
      mode: outputMode(candidate),
      ...(candidate.writeTarget === "paragraph-after" ? { multiline: true } : {}),
      ...(candidate.writeTarget === "repeat-row" ? { preservePrototype: true } : {}),
    },
    visual: candidate.visual,
    bindingCandidateId: candidate.id,
    structural: {
      partName: candidate.partName,
      path: candidate.path,
      contextHash: candidate.contextHash,
      writeTarget: candidate.writeTarget,
      ...(candidate.styleSourcePath ? { styleSourcePath: candidate.styleSourcePath } : {}),
    },
  }
}

function answerFor(field, index) {
  if (field.answerType === "date") return "2026-08-14"
  if (field.answerType === "number") return String(index + 1)
  if (field.answerType === "email") return `audit${index + 1}@example.com`
  if (field.answerType === "phone") return "13800138000"
  if (field.answerType === "single_choice") return field.options?.[0] || ""
  if (field.answerType === "multiple_choice") return (field.options || []).filter((_, optionIndex) => optionIndex < 2)
  if (field.answerType === "file") return undefined
  if (field.answerType === "table") return [
    Object.fromEntries((field.columns || []).map((column, columnIndex) => [column.id, column.type === "date" ? "2020-09-01" : column.type === "number" ? columnIndex + 1 : `测试${columnIndex + 1}`])),
    Object.fromEntries((field.columns || []).map((column, columnIndex) => [column.id, column.type === "date" ? "2024-07-01" : column.type === "number" ? columnIndex + 2 : `复核${columnIndex + 1}`])),
  ]
  const value = field.answerType === "textarea"
    ? `验收长文本-${field.label}\n第二行用于检查换行、字体和遮挡。`
    : field.label.includes("性别") ? "男" : field.label.includes("国籍") ? "中国" : `测试${index + 1}`
  return field.maxLength ? [...value].slice(0, field.maxLength).join("") : value
}

function geometryMatches(left, right) {
  return left.length === right.length && left.every((page, index) => {
    const other = right[index]
    return page.page === other.page && Math.abs(page.width - other.width) <= 0.01 && Math.abs(page.height - other.height) <= 0.01 && page.rotation === other.rotation
  })
}

async function bundleModules(directory) {
  const sources = [
    "src/lib/oa-document-templates.ts",
    "src/lib/server/office-capabilities.ts",
    "src/lib/server/office-conversion.ts",
    "src/lib/server/oa-word-fonts.ts",
    "src/lib/server/oa-preview-tools.ts",
    "src/lib/server/oa-pdf-layout.ts",
    "src/lib/server/oa-layout-matcher.ts",
    "src/lib/server/oa-word-layout-index.ts",
    "src/lib/server/oa-word-detection.ts",
    "src/lib/server/oa-word-compiler.ts",
    "src/lib/server/oa-word-fill.ts",
    "src/lib/server/ooxml-package.ts",
    "src/lib/server/ooxml-security.ts",
  ].map((relative) => path.join(root, relative))
  execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
    ...sources,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    `--outdir=${directory}`,
  ], { stdio: "inherit" })
  const load = (name, server = true) => require(path.join(directory, server ? "server" : "", `${name}.js`))
  return {
    domain: load("oa-document-templates", false),
    officeCapabilities: load("office-capabilities"),
    officeConversion: load("office-conversion"),
    wordFonts: load("oa-word-fonts"),
    previewTools: load("oa-preview-tools"),
    pdfLayout: load("oa-pdf-layout"),
    layoutMatcher: load("oa-layout-matcher"),
    layoutIndex: load("oa-word-layout-index"),
    detection: load("oa-word-detection"),
    compiler: load("oa-word-compiler"),
    filler: load("oa-word-fill"),
    ooxml: load("ooxml-package"),
    security: load("ooxml-security"),
  }
}

function markerManifest(nodes) {
  const placeholder = { page: 1, x: 0, y: 0, width: 0.005, height: 0.005, pageWidth: 1, pageHeight: 1, rotation: 0, coordinateSpace: "normalized-pdf" }
  return {
    syntaxVersion: 2,
    compilerVersion: "oa-audit-marker-v1",
    fields: nodes.map((node) => ({ fieldId: node.id, label: node.label, answerType: "text", required: false })),
    anchors: nodes.map((node) => ({
      fieldId: node.id,
      kind: node.kind,
      partName: node.partName,
      path: node.path,
      contextHash: node.contextHash,
      output: { mode: outputMode(node), multiline: node.writeTarget === "paragraph-after" },
      visual: placeholder,
      bindingCandidateId: `marker_${node.id}`,
      structural: { partName: node.partName, path: node.path, contextHash: node.contextHash, writeTarget: node.writeTarget, ...(node.styleSourcePath ? { styleSourcePath: node.styleSourcePath } : {}) },
    })),
    suggestions: [],
  }
}

async function markerCandidates({ modules, inputBytes, inputName, nodes, cleanPages, office, preview }) {
  const eligible = nodes.filter((node) => ["table-cell", "inline-run", "paragraph-after"].includes(node.writeTarget))
  if (!eligible.length) return []
  const plan = modules.layoutMatcher.createMarkerPlan(eligible)
  const compiled = modules.compiler.compileWordTemplate(inputBytes, markerManifest(eligible))
  const filled = modules.filler.fillWordTemplate(compiled.bytes, {
    fields: eligible.map((node) => ({ fieldId: node.id, label: node.label, answerType: "text", required: false })),
    answers: Object.fromEntries(plan.map((entry) => [entry.nodeId, entry.marker])),
  })
  const pdf = await modules.officeConversion.convertFilledDocxToPdf(filled.bytes, inputName, { capabilities: office })
  const pages = await modules.previewTools.inspectPdf(pdf.bytes, preview)
  const layout = modules.pdfLayout.parsePdfBboxXml(await modules.previewTools.extractPdfBboxXml(pdf.bytes, preview))
  assert.equal(geometryMatches(cleanPages, pages), true, "标记副本页面几何漂移")
  layout.pages = pages
  const resolution = modules.layoutMatcher.validateMarkerLayout(plan, cleanPages, layout)
  const nodeById = new Map(eligible.map((node) => [node.id, node]))
  return resolution.resolved.map((resolved) => {
    const node = nodeById.get(resolved.nodeId)
    return { id: node.id, label: node.label, description: `${node.kind} · ${node.writeTarget} · 标记定位`, partName: node.partName, path: node.path, contextHash: node.contextHash, writeTarget: node.writeTarget, ...(node.styleSourcePath ? { styleSourcePath: node.styleSourcePath } : {}), visual: resolved.visual }
  })
}

async function main() {
  const [inputArg, outputArg, ...extra] = process.argv.slice(2)
  if (!inputArg || !outputArg || extra.length) throw new Error("用法：node scripts/audit-oa-docx-template.mjs <input.docx> <output-directory>")
  const inputPath = explicitPath(inputArg, "输入 DOCX")
  const outputDirectory = explicitPath(outputArg, "输出目录")
  const inputStat = await stat(inputPath)
  assert.ok(inputStat.isFile() && inputStat.size > 0, "输入 DOCX 不存在或为空")
  await mkdir(outputDirectory, { recursive: true })
  const bundleDirectory = await mkdtemp(path.join(tmpdir(), "oa-template-audit-modules-"))
  try {
    const modules = await bundleModules(bundleDirectory)
    const inputBytes = await readFile(inputPath)
    const inputName = path.basename(inputPath)
    const pkg = modules.security.assertSafeDocxPackage(modules.ooxml.readOoxmlPackage(inputBytes))
    const requiredFonts = modules.wordFonts.extractDirectWordFonts(pkg)
    const strictOffice = await modules.officeCapabilities.detectOfficeCapabilities({ ...process.env, OA_TEMPLATE_REQUIRED_FONTS: requiredFonts.join(",") })
    const office = await modules.officeCapabilities.detectOfficeCapabilities({ ...process.env, OA_TEMPLATE_REQUIRED_FONTS: "" })
    const preview = await modules.previewTools.detectPreviewToolCapabilities()
    const unavailable = [...office.unavailableReasons, ...preview.unavailableReasons]
    if (unavailable.length) throw new Error(`Office/PDF 能力不可用：${unavailable.join("；")}`)

    const cleanPdf = await modules.officeConversion.convertFilledDocxToPdf(inputBytes, inputName, { capabilities: office })
    const cleanPages = await modules.previewTools.inspectPdf(cleanPdf.bytes, preview)
    const cleanLayout = modules.pdfLayout.parsePdfBboxXml(await modules.previewTools.extractPdfBboxXml(cleanPdf.bytes, preview))
    assert.equal(geometryMatches(cleanLayout.pages, cleanPages), true, "原始 PDF bbox 与 pdfinfo 几何不一致")
    cleanLayout.pages = cleanPages
    const pdfFonts = await modules.previewTools.inspectPdfFonts(cleanPdf.bytes, preview)
    const nodes = modules.layoutIndex.indexWordWritableNodes(pkg)
    const match = modules.layoutMatcher.matchWordNodesToPdf(nodes, cleanLayout)
    const mappedLocators = new Set(match.candidates.map((candidate) => `${candidate.partName}|${candidate.path}|${candidate.contextHash}`))
    const unresolvedNodes = nodes.filter((node) => !mappedLocators.has(`${node.partName}|${node.path}|${node.contextHash}`))
    const resolvedByMarker = await markerCandidates({ modules, inputBytes, inputName, nodes: unresolvedNodes, cleanPages, office, preview })
    const candidates = [...match.candidates, ...resolvedByMarker]
    const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    const detected = modules.detection.detectWordFormRegions(pkg, candidates)

    const usedCandidateIds = new Set()
    const selected = []
    for (const suggestion of detected) {
      if (suggestion.conflictIds.length || suggestion.bindingCandidateIds?.length !== 1) continue
      const candidate = candidatesById.get(suggestion.bindingCandidateIds[0])
      if (!candidate || usedCandidateIds.has(candidate.id)) continue
      usedCandidateIds.add(candidate.id)
      selected.push({ suggestion, candidate })
    }
    const selectedIds = new Set(selected.map(({ suggestion }) => suggestion.id))
    const suggestions = detected.map((suggestion) => selectedIds.has(suggestion.id)
      ? { ...suggestion, reviewState: "confirmed", conflictIds: [] }
      : { ...suggestion, reviewState: "ignored", conflictIds: [], bindingCandidateIds: undefined, visual: undefined })
    const confirmed = suggestions.filter((suggestion) => suggestion.reviewState === "confirmed")
    const manifest = {
      syntaxVersion: 2,
      compilerVersion: "oa-audit-v1",
      suggestions,
      fields: confirmed.map(fieldFromSuggestion),
      anchors: confirmed.map((suggestion) => anchorFromBinding(suggestion, candidatesById.get(suggestion.bindingCandidateIds[0]))),
    }
    modules.domain.validateTemplateManifest(manifest)
    const compiled = modules.compiler.compileWordTemplate(inputBytes, manifest)
    const answers = Object.fromEntries(manifest.fields.map((field, index) => [field.fieldId, answerFor(field, index)]))
    const fileDisplayNames = Object.fromEntries(manifest.fields.filter((field) => field.answerType === "file").map((field) => [field.fieldId, ["验收附件.pdf"]]))
    const filled = modules.filler.fillWordTemplate(compiled.bytes, { fields: manifest.fields, answers, fileDisplayNames })
    const filledPdf = await modules.officeConversion.convertFilledDocxToPdf(filled.bytes, "filled-audit.docx", { capabilities: office })
    const filledPages = await modules.previewTools.inspectPdf(filledPdf.bytes, preview)
    const filledLayout = modules.pdfLayout.parsePdfBboxXml(await modules.previewTools.extractPdfBboxXml(filledPdf.bytes, preview))
    assert.equal(geometryMatches(filledLayout.pages, filledPages), true, "填充 PDF bbox 与 pdfinfo 几何不一致")
    const filledFonts = await modules.previewTools.inspectPdfFonts(filledPdf.bytes, preview)
    const cleanPngs = await modules.previewTools.renderPdfPages(cleanPdf.bytes, preview)
    const filledPngs = await modules.previewTools.renderPdfPages(filledPdf.bytes, preview)
    await writeFile(path.join(outputDirectory, "clean.pdf"), cleanPdf.bytes)
    await writeFile(path.join(outputDirectory, "filled.docx"), filled.bytes)
    await writeFile(path.join(outputDirectory, "filled.pdf"), filledPdf.bytes)
    await Promise.all(cleanPngs.map((bytes, index) => writeFile(path.join(outputDirectory, `clean-page-${String(index + 1).padStart(3, "0")}.png`), bytes)))
    await Promise.all(filledPngs.map((bytes, index) => writeFile(path.join(outputDirectory, `filled-page-${String(index + 1).padStart(3, "0")}.png`), bytes)))
    const report = {
      ok: true,
      inputPath,
      pageCount: cleanPages.length,
      filledPageCount: filledPages.length,
      requiredFonts,
      missingRequiredFonts: strictOffice.missingFonts,
      pdfFonts,
      filledFonts,
      writableNodeCount: nodes.length,
      directMappedCount: match.candidates.length,
      markerMappedCount: resolvedByMarker.length,
      detectedCount: detected.length,
      selectedCount: selected.length,
      repeatRows: detected.filter((item) => item.kind === "repeat_row").map((item) => item.label),
      mappingWarnings: match.warnings,
      nodes: nodes.map((node) => ({ id: node.id, label: node.label, kind: node.kind, writeTarget: node.writeTarget, table: node.table })),
      suggestions: detected.map((item) => ({ id: item.id, label: item.label, kind: item.kind, answerType: item.inferredAnswerType, confidence: item.confidence, reviewState: item.reviewState, conflicts: item.conflictIds.length, bindings: item.bindingCandidateIds?.length || 0, maxLength: item.maxLength, options: item.options })),
      selectedFields: selected.map(({ suggestion, candidate }) => ({ fieldId: suggestion.fieldId, label: suggestion.label, answerType: suggestion.inferredAnswerType, kind: suggestion.kind, writeTarget: candidate.writeTarget, page: candidate.visual.page, options: suggestion.options })),
      choiceMarks: {
        checkedXml: (modules.ooxml.readOoxmlPackage(filled.bytes).readText("word/document.xml").match(/<w:t>√<\/w:t>/g) || []).length,
        uncheckedXml: (modules.ooxml.readOoxmlPackage(filled.bytes).readText("word/document.xml").match(/<w:t>□<\/w:t>/g) || []).length,
        checkedPdf: filledLayout.textBoxes.filter((box) => box.text.includes("√")).length,
      },
    }
    await writeFile(path.join(outputDirectory, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`)
    await writeFile(path.join(outputDirectory, "workbench-layout.json"), `${JSON.stringify({ pages: cleanPages, candidates, manifest }, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ...report, outputDirectory }, null, 2)}\n`)
  } finally {
    await rm(bundleDirectory, { recursive: true, force: true })
  }
}

await main()
