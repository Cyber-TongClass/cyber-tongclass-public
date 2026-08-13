import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const EXPECTED_PAGE_COUNT = 6
const NARRATIVE_LABELS = ["基本概况", "主要做法"]
const root = path.resolve(import.meta.dirname, "..")
const require = createRequire(import.meta.url)

function usage(message) {
  throw new Error(`${message}\n用法：node scripts/smoke-oa-pdf-docx-workbench.mjs <input.docx> <output-directory>`)
}

function explicitPath(value, label) {
  if (!value || !path.isAbsolute(value)) usage(`${label}必须是显式绝对路径`)
  return path.normalize(value)
}

function outputMode(node) {
  if (node.writeTarget === "choice") return "mark_choice"
  if (node.writeTarget === "repeat-row") return "repeat_row"
  if (node.writeTarget === "paragraph-after" || node.writeTarget === "inline-run") return "append"
  return "replace"
}

function markerManifest(nodes) {
  const placeholder = {
    page: 1, x: 0, y: 0, width: 0.005, height: 0.005,
    pageWidth: 1, pageHeight: 1, rotation: 0, coordinateSpace: "normalized-pdf",
  }
  return {
    syntaxVersion: 2,
    compilerVersion: "aia-ooxml-2-smoke-marker",
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
      structural: {
        partName: node.partName,
        path: node.path,
        contextHash: node.contextHash,
        writeTarget: node.writeTarget,
        ...(node.styleSourcePath ? { styleSourcePath: node.styleSourcePath } : {}),
      },
    })),
    suggestions: [],
  }
}

function fieldFromSuggestion(suggestion) {
  return {
    fieldId: suggestion.fieldId,
    label: suggestion.label,
    answerType: suggestion.inferredAnswerType,
    required: suggestion.required === true,
    ...(suggestion.maxLength ? { maxLength: suggestion.maxLength } : {}),
    ...(suggestion.options?.length ? { options: suggestion.options } : {}),
  }
}

function anchorFromBinding(suggestion, candidate) {
  const structural = {
    partName: candidate.partName,
    path: candidate.path,
    contextHash: candidate.contextHash,
    writeTarget: candidate.writeTarget,
    ...(candidate.styleSourcePath ? { styleSourcePath: candidate.styleSourcePath } : {}),
  }
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
    structural,
  }
}

function packageXml(pkg, partName) {
  assert.equal(pkg.has(partName), true, `DOCX 缺少预期 Word 部件：${partName}`)
  return pkg.readText(partName)
}

function assertInstructionPrecedesSdt(pkg, label, anchor) {
  const xml = packageXml(pkg, anchor.partName)
  const instructionIndex = xml.indexOf(label)
  const tagIndex = xml.indexOf(`oa-field:${anchor.fieldId}`)
  assert.notEqual(instructionIndex, -1, `编译结果中未找到说明文字：${label}`)
  assert.notEqual(tagIndex, -1, `编译结果中未找到叙述字段 SDT：${anchor.fieldId}`)
  assert.ok(instructionIndex < tagIndex, `${label} 的 SDT 必须位于说明文字之后`)
}

function answerFor(field) {
  let value = NARRATIVE_LABELS.includes(field.label)
    ? `SMOKE：验证${field.label}答案写入说明段落之后。`
    : "SMOKE_TABLE"
  if (field.maxLength) value = value.slice(0, field.maxLength)
  return value
}

function assertPageGeometry(bboxPages, infoPages, label) {
  assert.equal(bboxPages.length, infoPages.length, `${label} bbox 与 pdfinfo 页数不一致`)
  bboxPages.forEach((bboxPage, index) => {
    const infoPage = infoPages[index]
    assert.equal(bboxPage.page, infoPage.page, `${label} 第 ${index + 1} 页页码不一致`)
    assert.ok(Math.abs(bboxPage.width - infoPage.width) <= 0.01, `${label} 第 ${index + 1} 页宽度不一致`)
    assert.ok(Math.abs(bboxPage.height - infoPage.height) <= 0.01, `${label} 第 ${index + 1} 页高度不一致`)
    assert.equal(bboxPage.rotation, infoPage.rotation, `${label} 第 ${index + 1} 页旋转角度不一致`)
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

async function resolveMarkerCandidates({ modules, inputBytes, inputName, nodes, cleanPages, office, preview }) {
  const eligible = nodes.filter((node) => node.writeTarget === "table-cell" || node.writeTarget === "inline-run" || node.writeTarget === "paragraph-after")
  const plan = modules.layoutMatcher.createMarkerPlan(eligible)
  if (!plan.length) return []
  const markers = new Map(plan.map((item) => [item.nodeId, item.marker]))
  const compiled = modules.compiler.compileWordTemplate(inputBytes, markerManifest(eligible))
  const filled = modules.filler.fillWordTemplate(compiled.bytes, {
    fields: eligible.map((node) => ({ fieldId: node.id, label: node.label, answerType: "text", required: false })),
    answers: Object.fromEntries(plan.map((item) => [item.nodeId, item.marker])),
  })
  const markedPdf = await modules.officeConversion.convertFilledDocxToPdf(filled.bytes, inputName, { capabilities: office })
  const markedPages = await modules.previewTools.inspectPdf(markedPdf.bytes, preview)
  const markedLayout = modules.pdfLayout.parsePdfBboxXml(await modules.previewTools.extractPdfBboxXml(markedPdf.bytes, preview))
  assertPageGeometry(markedLayout.pages, markedPages, "标记 PDF")
  markedLayout.pages = markedPages
  const resolution = modules.layoutMatcher.validateMarkerLayout(plan, cleanPages, markedLayout)
  const nodeById = new Map(eligible.map((node) => [node.id, node]))
  return resolution.resolved.map((item) => {
    const node = nodeById.get(item.nodeId)
    assert.ok(node, `标记定位返回未知节点：${item.nodeId}`)
    return {
      id: node.id,
      label: node.label,
      description: `${node.kind} · ${node.writeTarget} · 标记定位`,
      partName: node.partName,
      path: node.path,
      contextHash: node.contextHash,
      writeTarget: node.writeTarget,
      ...(node.styleSourcePath ? { styleSourcePath: node.styleSourcePath } : {}),
      visual: item.visual,
    }
  })
}

async function main() {
  const [inputArgument, outputArgument, ...extra] = process.argv.slice(2)
  if (extra.length) usage("只接受一个输入 DOCX 和一个输出目录")
  const inputPath = explicitPath(inputArgument, "输入 DOCX")
  const outputDirectory = explicitPath(outputArgument, "输出目录")
  if (path.extname(inputPath).toLocaleLowerCase("en-US") !== ".docx") usage("输入文件必须是 .docx")
  if (outputDirectory === path.parse(outputDirectory).root || outputDirectory === path.dirname(outputDirectory)) usage("输出目录范围过大")
  if (inputPath === outputDirectory || inputPath.startsWith(`${outputDirectory}${path.sep}`)) usage("输入 DOCX 不能位于输出目录中")
  const inputStat = await stat(inputPath).catch(() => null)
  assert.ok(inputStat?.isFile() && inputStat.size > 0, "输入 DOCX 不存在或为空")
  await mkdir(outputDirectory, { recursive: true })

  const bundleDirectory = await mkdtemp(path.join(tmpdir(), "oa-pdf-docx-smoke-modules-"))
  try {
    const modules = await bundleModules(bundleDirectory)
    const inputBytes = await readFile(inputPath)
    const inputName = path.basename(inputPath)
    const pkg = modules.security.assertSafeDocxPackage(modules.ooxml.readOoxmlPackage(inputBytes))
    const requiredFonts = modules.wordFonts.extractDirectWordFonts(pkg)
    assert.ok(requiredFonts.length > 0, "DOCX 可见内容未声明直接字体，无法执行字体 fidelity gate")
    const office = await modules.officeCapabilities.detectOfficeCapabilities({
      ...process.env,
      OA_TEMPLATE_REQUIRED_FONTS: requiredFonts.join(","),
    })
    const preview = await modules.previewTools.detectPreviewToolCapabilities()
    const unavailable = [...office.unavailableReasons, ...preview.unavailableReasons]
    if (unavailable.length) throw new Error(`Office/PDF 能力不可用：${unavailable.join("；")}`)
    assert.equal(office.canExportPdf, true, "Office PDF 导出能力不可用")

    const cleanPdf = await modules.officeConversion.convertFilledDocxToPdf(inputBytes, inputName, { capabilities: office })
    const cleanPages = await modules.previewTools.inspectPdf(cleanPdf.bytes, preview)
    assert.equal(cleanPages.length, EXPECTED_PAGE_COUNT, `原始 PDF 应为 ${EXPECTED_PAGE_COUNT} 页，实际为 ${cleanPages.length} 页`)
    const cleanLayout = modules.pdfLayout.parsePdfBboxXml(await modules.previewTools.extractPdfBboxXml(cleanPdf.bytes, preview))
    assertPageGeometry(cleanLayout.pages, cleanPages, "原始 PDF")
    cleanLayout.pages = cleanPages
    const fonts = await modules.previewTools.inspectPdfFonts(cleanPdf.bytes, preview)
    assert.ok(fonts.length > 0, "无法验证 PDF 字体")
    const unembeddedFonts = fonts.filter((font) => !font.embedded).map((font) => font.name)
    assert.deepEqual(unembeddedFonts, [], `PDF 含未嵌入字体：${unembeddedFonts.join("、")}`)
    const substitutedFonts = modules.officeCapabilities.missingConvertedPdfFonts(
      requiredFonts,
      office.fontAliases,
      fonts.map((font) => font.name),
    )
    assert.deepEqual(substitutedFonts, [], [
      `PDF 字体发生替代：${substitutedFonts.join("、")}`,
      `PDF 字体：${fonts.map((font) => font.name).join("、")}`,
      ...substitutedFonts.map((font) => `${font} aliases：${(office.fontAliases[font] || []).join("、")}`),
    ].join("；"))

    const nodes = modules.layoutIndex.indexWordWritableNodes(pkg)
    const cleanMatch = modules.layoutMatcher.matchWordNodesToPdf(nodes, cleanLayout)
    const mappedKeys = new Set(cleanMatch.candidates.map((candidate) => `${candidate.partName}|${candidate.path}|${candidate.contextHash}`))
    const unresolvedNodes = nodes.filter((node) => !mappedKeys.has(`${node.partName}|${node.path}|${node.contextHash}`))
    const markerCandidates = await resolveMarkerCandidates({
      modules, inputBytes, inputName, nodes: unresolvedNodes, cleanPages, office, preview,
    })
    const candidates = [...cleanMatch.candidates, ...markerCandidates]
    const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
    assert.equal(candidatesById.size, candidates.length, "绑定候选 ID 必须唯一")
    const detected = modules.detection.detectWordFormRegions(pkg, candidates)

    const selected = []
    for (const label of NARRATIVE_LABELS) {
      const matches = detected.flatMap((suggestion) => {
        if (suggestion.label !== label || suggestion.bindingCandidateIds?.length !== 1) return []
        const candidate = candidatesById.get(suggestion.bindingCandidateIds[0])
        return candidate?.writeTarget === "paragraph-after" && candidate.visual.page === 4 ? [{ suggestion, candidate }] : []
      })
      assert.equal(matches.length, 1, `${label} 在第 4 页必须且只能有一个 paragraph-after 绑定，实际 ${matches.length} 个`)
      selected.push(matches[0])
    }
    const tableBindings = detected.flatMap((suggestion) => {
      if (suggestion.bindingCandidateIds?.length !== 1) return []
      const candidate = candidatesById.get(suggestion.bindingCandidateIds[0])
      return candidate?.writeTarget === "table-cell" ? [{ suggestion, candidate }] : []
    })
    assert.ok(tableBindings.length > 0, "至少需要一个唯一 table-cell 绑定")
    selected.push(tableBindings[0])
    assert.equal(new Set(selected.map(({ candidate }) => candidate.id)).size, selected.length, "选中的绑定候选必须唯一")

    const selectedBySuggestion = new Map(selected.map((item) => [item.suggestion.id, item]))
    const suggestions = detected.map((suggestion) => {
      const item = selectedBySuggestion.get(suggestion.id)
      if (!item) return { ...suggestion, reviewState: "ignored", conflictIds: [], bindingCandidateIds: undefined, visual: undefined }
      return {
        ...suggestion,
        partName: item.candidate.partName,
        path: item.candidate.path,
        contextHash: item.candidate.contextHash,
        reviewState: "confirmed",
        conflictIds: [],
        bindingCandidateIds: [item.candidate.id],
        visual: item.candidate.visual,
      }
    })
    const confirmed = suggestions.filter((suggestion) => suggestion.reviewState === "confirmed")
    const manifest = {
      syntaxVersion: 2,
      compilerVersion: "aia-ooxml-2-smoke",
      suggestions,
      fields: confirmed.map(fieldFromSuggestion),
      anchors: confirmed.map((suggestion) => anchorFromBinding(suggestion, candidatesById.get(suggestion.bindingCandidateIds[0]))),
    }
    modules.domain.validateTemplateManifest(manifest)
    assert.ok(manifest.anchors.some((anchor) => anchor.structural.writeTarget === "table-cell"), "manifest 缺少 table-cell 双锚点")
    for (const field of manifest.fields) {
      const anchors = manifest.anchors.filter((anchor) => anchor.fieldId === field.fieldId)
      assert.equal(anchors.length, 1, `字段 ${field.fieldId} 必须恰有一个双锚点`)
      assert.ok(anchors[0].visual && anchors[0].structural && anchors[0].bindingCandidateId, `字段 ${field.fieldId} 缺少双锚点`)
    }

    const compiled = modules.compiler.compileWordTemplate(inputBytes, manifest)
    const compiledPkg = modules.ooxml.readOoxmlPackage(compiled.bytes)
    for (const field of manifest.fields) {
      const anchor = manifest.anchors.find((item) => item.fieldId === field.fieldId)
      const xml = packageXml(compiledPkg, anchor.partName)
      assert.match(xml, new RegExp(`oa-field:${field.fieldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `编译 DOCX 缺少字段 SDT：${field.fieldId}`)
    }
    for (const label of NARRATIVE_LABELS) {
      const field = manifest.fields.find((item) => item.label === label)
      const anchor = manifest.anchors.find((item) => item.fieldId === field.fieldId)
      assert.equal(anchor.structural.writeTarget, "paragraph-after")
      assertInstructionPrecedesSdt(compiledPkg, label, anchor)
    }

    const answers = Object.fromEntries(manifest.fields.map((field) => [field.fieldId, answerFor(field)]))
    const filled = modules.filler.fillWordTemplate(compiled.bytes, { fields: manifest.fields, answers })
    const filledPkg = modules.ooxml.readOoxmlPackage(filled.bytes)
    for (const [fieldId, answer] of Object.entries(answers)) {
      const anchor = manifest.anchors.find((item) => item.fieldId === fieldId)
      const xml = packageXml(filledPkg, anchor.partName)
      assert.match(xml, new RegExp(`oa-field:${fieldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `填充 DOCX 丢失字段 SDT：${fieldId}`)
      assert.ok(xml.includes(answer), `填充 DOCX 缺少字段答案：${fieldId}`)
    }
    const filledPdf = await modules.officeConversion.convertFilledDocxToPdf(filled.bytes, "filled-smoke.docx", { capabilities: office })
    const filledPages = await modules.previewTools.inspectPdf(filledPdf.bytes, preview)
    assert.equal(filledPages.length, EXPECTED_PAGE_COUNT, `填充 PDF 应保持 ${EXPECTED_PAGE_COUNT} 页，实际为 ${filledPages.length} 页`)
    const filledLayout = modules.pdfLayout.parsePdfBboxXml(await modules.previewTools.extractPdfBboxXml(filledPdf.bytes, preview))
    assertPageGeometry(filledLayout.pages, filledPages, "填充 PDF")
    const cleanPngs = await modules.previewTools.renderPdfPages(cleanPdf.bytes, preview)
    const filledPngs = await modules.previewTools.renderPdfPages(filledPdf.bytes, preview)
    assert.equal(cleanPngs.length, EXPECTED_PAGE_COUNT)
    assert.equal(filledPngs.length, EXPECTED_PAGE_COUNT)

    await writeFile(path.join(outputDirectory, "clean.pdf"), cleanPdf.bytes)
    await writeFile(path.join(outputDirectory, "filled.docx"), filled.bytes)
    await writeFile(path.join(outputDirectory, "filled.pdf"), filledPdf.bytes)
    await Promise.all(cleanPngs.map((bytes, index) => writeFile(path.join(outputDirectory, `clean-page-${String(index + 1).padStart(3, "0")}.png`), bytes)))
    await Promise.all(filledPngs.map((bytes, index) => writeFile(path.join(outputDirectory, `filled-page-${String(index + 1).padStart(3, "0")}.png`), bytes)))
    const report = {
      ok: true,
      pageCount: cleanPages.length,
      filledPageCount: filledPages.length,
      selectedFields: manifest.fields.map((field) => ({
        fieldId: field.fieldId,
        label: field.label,
        writeTarget: manifest.anchors.find((anchor) => anchor.fieldId === field.fieldId).structural.writeTarget,
        page: manifest.anchors.find((anchor) => anchor.fieldId === field.fieldId).visual.page,
      })),
      requiredFonts,
      fontAliases: office.fontAliases,
      fonts: fonts.map((font) => ({ name: font.name, embedded: font.embedded, subset: font.subset })),
      unembeddedFonts,
      substitutedFonts,
      mappingWarnings: cleanMatch.warnings,
      outputs: ["clean.pdf", "filled.docx", "filled.pdf", ...cleanPngs.map((_, index) => `clean-page-${String(index + 1).padStart(3, "0")}.png`), ...filledPngs.map((_, index) => `filled-page-${String(index + 1).padStart(3, "0")}.png`)],
    }
    await writeFile(path.join(outputDirectory, "smoke-report.json"), `${JSON.stringify(report, null, 2)}\n`)
    await writeFile(path.join(outputDirectory, "workbench-layout.json"), `${JSON.stringify({ pages: cleanPages, candidates, manifest }, null, 2)}\n`)
    process.stdout.write(`${JSON.stringify({ ...report, outputDirectory }, null, 2)}\n`)
  } finally {
    await rm(bundleDirectory, { recursive: true, force: true })
  }
}

await main()
