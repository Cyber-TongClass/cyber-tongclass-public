import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

const EXPECTED_PAGE_COUNT = 6
const EXPECTED_FILLED_PAGE_COUNT = 7
const EXPECTED_APPLICANT_FIELDS = 25
const NARRATIVE_LABELS = ["基本概况", "主要做法", "应用成效", "创新点"]
const NARRATIVE_INSTRUCTIONS = {
  基本概况: "阐述本案例所针对的人工智能赋能行业发展的痛点",
  主要做法: "结合案例申报方向，阐述传统发展模式的局限与挑战",
  应用成效: "阐述本案例的标志性成果产出、转型效率提升",
  创新点: "总结本案例的创新点和亮点，包括但不限于技术创新",
}
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

function assertInstructionPrecedesSdt(pkg, label, instruction, anchor) {
  const xml = packageXml(pkg, anchor.partName)
  const instructionIndex = xml.indexOf(instruction)
  const tagIndex = xml.indexOf(`oa-field:${anchor.fieldId}`)
  assert.notEqual(instructionIndex, -1, `编译结果中未找到 ${label} 的真实说明文字`)
  assert.notEqual(tagIndex, -1, `编译结果中未找到叙述字段 SDT：${anchor.fieldId}`)
  assert.ok(instructionIndex < tagIndex, `${label} 的 SDT 必须位于说明文字之后`)
}

function answerFor(field) {
  if (field.answerType === "multiple_choice") return ["场景开放", "应用拓展 · 其他", "安全体系"]
  if (field.answerType === "single_choice") return field.options?.[0] || ""
  if (field.answerType === "file") return undefined
  let value = NARRATIVE_LABELS.includes(field.label)
    ? `测试${field.label}：答案位于说明段落之后，字体与段落样式保持一致。`
    : field.label.includes("案例名称") ? "人工智能赋能测试案例"
      : field.label === "申报单位" ? "测试申报单位"
        : field.label === "案例简介" ? "本案例用于验证问题识别、原位填充和版式一致性。"
          : `测试-${field.label.split(" · ").at(-1)}`
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

function pdfFontFamily(name) {
  return name.replace(/^[A-Z]{6}\+/, "")
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

    assert.equal(detected.some((suggestion) => suggestion.placeholder !== undefined), false, "DOCX 分析不得自动生成网页提示文字")
    const repeatSuggestions = detected.filter((suggestion) => suggestion.kind === "repeat_row")
    assert.equal(repeatSuggestions.length, 1, "第 6 页汇总表必须识别为一个系统 repeat-row 结构")
    const applicantSuggestions = detected.filter((suggestion) => suggestion.kind !== "repeat_row")
    assert.equal(applicantSuggestions.length, EXPECTED_APPLICANT_FIELDS, `应识别 ${EXPECTED_APPLICANT_FIELDS} 个申请填写位置，实际 ${applicantSuggestions.length} 个`)
    const selected = applicantSuggestions.map((suggestion) => {
      assert.equal(suggestion.bindingCandidateIds?.length, 1, `字段“${suggestion.label}”必须且只能绑定一个 Word 写入位置`)
      const candidate = candidatesById.get(suggestion.bindingCandidateIds[0])
      assert.ok(candidate, `字段“${suggestion.label}”引用的绑定候选不存在`)
      return { suggestion, candidate }
    })
    assert.equal(new Set(selected.map(({ candidate }) => candidate.id)).size, selected.length, "选中的绑定候选必须唯一")
    const pageCoverage = selected.reduce((counts, { candidate }) => counts.set(candidate.visual.page, (counts.get(candidate.visual.page) || 0) + 1), new Map())
    assert.deepEqual(Object.fromEntries(pageCoverage), { 1: 2, 2: 2, 3: 16, 4: 4, 5: 1 }, `申请字段页码覆盖不完整：${JSON.stringify(selected.map(({ suggestion, candidate }) => ({ label: suggestion.label, page: candidate.visual.page, target: candidate.writeTarget })))}`)
    const direction = selected.find(({ suggestion }) => suggestion.label === "方向")
    assert.ok(direction)
    assert.equal(direction.candidate.writeTarget, "choice")
    assert.equal(direction.suggestion.options.length, 23)
    assert.equal(new Set(direction.suggestion.options).size, 23, "方向选项必须有可提交的唯一值")
    assert.ok(direction.suggestion.options.includes("政策创新 · 其他"))
    assert.ok(direction.suggestion.options.includes("应用拓展 · 其他"))
    assert.ok(direction.suggestion.options.includes("支撑能力 · 其他"))
    const introduction = selected.find(({ suggestion }) => suggestion.label === "案例简介")
    assert.equal(introduction.suggestion.maxLength, 500)
    assert.equal(introduction.suggestion.placeholder, undefined)
    for (const [label, maximum] of [["基本概况", 300], ["主要做法", 1800], ["应用成效", 600], ["创新点", 300]]) {
      const item = selected.find(({ suggestion }) => suggestion.label === label)
      assert.ok(item, `缺少叙述题：${label}`)
      assert.equal(item.suggestion.maxLength, maximum)
      assert.equal(item.candidate.writeTarget, "paragraph-after")
      assert.equal(item.candidate.visual.page, 4)
    }
    const evidence = selected.find(({ suggestion }) => suggestion.label === "相关佐证材料")
    assert.equal(evidence.suggestion.inferredAnswerType, "file")
    assert.equal(evidence.candidate.visual.page, 5)

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
      const escapedFieldId = field.fieldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      if (field.answerType === "multiple_choice" || field.answerType === "single_choice") {
        assert.match(xml, new RegExp(`oa-choice:${escapedFieldId}:0`), `编译 DOCX 缺少选项 SDT：${field.fieldId}`)
      } else {
        assert.match(xml, new RegExp(`oa-field:${escapedFieldId}`), `编译 DOCX 缺少字段 SDT：${field.fieldId}`)
      }
    }
    for (const label of NARRATIVE_LABELS) {
      const field = manifest.fields.find((item) => item.label === label)
      const anchor = manifest.anchors.find((item) => item.fieldId === field.fieldId)
      assert.equal(anchor.structural.writeTarget, "paragraph-after")
      assertInstructionPrecedesSdt(compiledPkg, label, NARRATIVE_INSTRUCTIONS[label], anchor)
    }

    const answers = Object.fromEntries(manifest.fields.map((field) => [field.fieldId, answerFor(field)]))
    const fileDisplayNames = Object.fromEntries(manifest.fields.filter((field) => field.answerType === "file").map((field) => [field.fieldId, ["检测报告.pdf", "用户使用报告.pdf"]]))
    const filled = modules.filler.fillWordTemplate(compiled.bytes, { fields: manifest.fields, answers, fileDisplayNames })
    const filledPkg = modules.ooxml.readOoxmlPackage(filled.bytes)
    for (const field of manifest.fields) {
      const fieldId = field.fieldId
      const answer = answers[fieldId]
      const anchor = manifest.anchors.find((item) => item.fieldId === fieldId)
      const xml = packageXml(filledPkg, anchor.partName)
      const escapedFieldId = fieldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      if (field.answerType === "multiple_choice" || field.answerType === "single_choice") {
        assert.match(xml, new RegExp(`oa-choice:${escapedFieldId}:0`), `填充 DOCX 丢失选项 SDT：${fieldId}`)
        continue
      }
      assert.match(xml, new RegExp(`oa-field:${escapedFieldId}`), `填充 DOCX 丢失字段 SDT：${fieldId}`)
      if (field.answerType === "file") assert.ok(xml.includes("检测报告.pdf；用户使用报告.pdf"), `填充 DOCX 缺少授权附件名：${fieldId}`)
      else assert.ok(xml.includes(answer), `填充 DOCX 缺少字段答案：${fieldId}`)
    }
    const filledDocumentXml = packageXml(filledPkg, "word/document.xml")
    assert.equal((filledDocumentXml.match(/oa-choice:[^"']+/g) || []).length, 23, "方向选择题应保留 23 个选项控件")
    assert.equal((filledDocumentXml.match(/<w:t>√<\/w:t>/g) || []).length, 3, "方向选择题应导出 3 个 √")
    assert.equal((filledDocumentXml.match(/<w:t>□<\/w:t>/g) || []).length, 20, "未选择方向应保持 20 个 □")
    const filledPdf = await modules.officeConversion.convertFilledDocxToPdf(filled.bytes, "filled-smoke.docx", { capabilities: office })
    const filledPages = await modules.previewTools.inspectPdf(filledPdf.bytes, preview)
    assert.equal(filledPages.length, EXPECTED_FILLED_PAGE_COUNT, `代表性答案填充后应为 ${EXPECTED_FILLED_PAGE_COUNT} 页，实际为 ${filledPages.length} 页`)
    const filledLayout = modules.pdfLayout.parsePdfBboxXml(await modules.previewTools.extractPdfBboxXml(filledPdf.bytes, preview))
    assertPageGeometry(filledLayout.pages, filledPages, "填充 PDF")
    assert.equal(filledLayout.textBoxes.filter((box) => box.text.includes("√")).length, 3, "填充 PDF 必须渲染 3 个可提取的 √")
    const filledFonts = await modules.previewTools.inspectPdfFonts(filledPdf.bytes, preview)
    const filledUnembeddedFonts = filledFonts.filter((font) => !font.embedded).map((font) => font.name)
    assert.deepEqual(filledUnembeddedFonts, [], `填充 PDF 含未嵌入字体：${filledUnembeddedFonts.join("、")}`)
    const filledSubstitutedFonts = modules.officeCapabilities.missingConvertedPdfFonts(
      requiredFonts,
      office.fontAliases,
      filledFonts.map((font) => font.name),
    )
    assert.deepEqual(filledSubstitutedFonts, [], `填充 PDF 字体发生替代：${filledSubstitutedFonts.join("、")}`)
    const cleanFontFamilies = new Set(fonts.map((font) => pdfFontFamily(font.name)))
    const unexpectedFilledFonts = [...new Set(filledFonts.map((font) => pdfFontFamily(font.name)).filter((name) => !cleanFontFamilies.has(name)))]
    assert.deepEqual(unexpectedFilledFonts, [], `填充 PDF 引入模板外字体：${unexpectedFilledFonts.join("、")}`)
    const cleanPngs = await modules.previewTools.renderPdfPages(cleanPdf.bytes, preview)
    const filledPngs = await modules.previewTools.renderPdfPages(filledPdf.bytes, preview)
    assert.equal(cleanPngs.length, EXPECTED_PAGE_COUNT)
    assert.equal(filledPngs.length, EXPECTED_FILLED_PAGE_COUNT)

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
      coverage: {
        applicantFields: manifest.fields.length,
        repeatRowStructures: repeatSuggestions.length,
        pageCounts: Object.fromEntries(pageCoverage),
        choiceOptions: direction.suggestion.options.length,
        selectedChoiceValues: answers[direction.suggestion.fieldId],
        placeholdersAutoDetected: detected.filter((suggestion) => suggestion.placeholder !== undefined).length,
      },
      requiredFonts,
      fontAliases: office.fontAliases,
      fonts: fonts.map((font) => ({ name: font.name, embedded: font.embedded, subset: font.subset })),
      unembeddedFonts,
      substitutedFonts,
      filledFonts: filledFonts.map((font) => ({ name: font.name, embedded: font.embedded, subset: font.subset })),
      filledUnembeddedFonts,
      filledSubstitutedFonts,
      unexpectedFilledFonts,
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
