import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildReimbursementDisplayRows,
  createDefaultLivingExpenseTableDraft,
  filterReimbursementRows,
  getReimbursementSectionTitle,
  isReimbursementSectionRow,
  normalizeReimbursementTableDraft,
} from "../src/lib/reimbursement-material-tables.ts"
import {
  buildReimbursementMaterialArticleSections,
  buildReimbursementMaterialListItems,
  getReimbursementMaterialPage,
  reimbursementMaterialPages,
} from "../src/lib/reimbursement-material-pages.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))

function getTextBlocks(page) {
  return page.documentBlocks.filter((block) => block.type !== "image").map((block) => block.text)
}

const defaultDraft = createDefaultLivingExpenseTableDraft()
assert.equal(defaultDraft.slug, "living-expense-standards")
assert.equal(defaultDraft.category, "academic-exchange")
assert.ok(defaultDraft.columns.length >= 4)
assert.ok(defaultDraft.rows.length >= 1)

const oceanSection = defaultDraft.rows.find((row) => row.cells.includes("大洋州及太平洋岛屿"))
assert.ok(oceanSection, "default table should include the Oceania section row")
assert.equal(oceanSection.kind, "section")
assert.equal(oceanSection.sectionLevel, 1)
assert.equal(isReimbursementSectionRow(oceanSection), true)
assert.equal(getReimbursementSectionTitle(oceanSection), "大洋州及太平洋岛屿")

const defaultDisplayRows = buildReimbursementDisplayRows(defaultDraft.rows, defaultDraft.columns)
const koreaDisplayRows = defaultDisplayRows.filter((entry) => entry.country === "韩国")
assert.equal(koreaDisplayRows.length, 3, "Korea should render as one country group with three city rows")
assert.equal(koreaDisplayRows[0].showCountryCell, true)
assert.equal(koreaDisplayRows[0].countryRowSpan, 3)
assert.equal(koreaDisplayRows[1].showCountryCell, false)
assert.equal(koreaDisplayRows[1].isCountryContinuation, true)

const tablePageSource = readFileSync(
  resolve(__dirname, "../src/app/intranet/reimbursements/tables/[slug]/page.tsx"),
  "utf8"
)
assert.equal(
  tablePageSource.includes('isCityCell && displayRow.isCountryContinuation ? "pl-7"'),
  false,
  "multi-city country continuation rows should not add extra city padding"
)

const materialDocumentPageSource = readFileSync(
  resolve(__dirname, "../src/app/intranet/reimbursements/materials/[slug]/page.tsx"),
  "utf8"
)
assert.equal(materialDocumentPageSource.includes("sourceFile"), false)
assert.equal(materialDocumentPageSource.includes("download"), false)

const academicExchangePageSource = readFileSync(
  resolve(__dirname, "../src/app/intranet/reimbursements/academic-exchange/page.tsx"),
  "utf8"
)
assert.equal(academicExchangePageSource.includes("原始 {item.sourceType}"), false)

const materialsPageSource = readFileSync(
  resolve(__dirname, "../src/app/intranet/materials/page.tsx"),
  "utf8"
)
assert.equal(materialsPageSource.includes("原始 {item.sourceType}"), false)

const australiaWithContext = filterReimbursementRows(defaultDraft.rows, defaultDraft.columns, "澳大利亚")
assert.ok(australiaWithContext.some((row) => row.cells.includes("大洋州及太平洋岛屿")), "country search keeps section context")
assert.ok(australiaWithContext.some((row) => row.cells.includes("澳大利亚")), "country search keeps matched row")

const osakaWithContext = filterReimbursementRows(defaultDraft.rows, defaultDraft.columns, "大阪")
assert.ok(osakaWithContext.some((row) => row.cells.includes("日本")), "city search keeps country context")
assert.ok(osakaWithContext.some((row) => row.cells.includes("大阪、京都")), "city search keeps matched city row")

const japanRows = filterReimbursementRows(defaultDraft.rows, defaultDraft.columns, "日本")
assert.ok(japanRows.some((row) => row.cells.includes("大阪、京都")), "country search expands to all city rows within the country")
assert.ok(japanRows.some((row) => row.cells.includes("其他城市")), "country search includes later rows in the same country group")

const oceanSectionRows = filterReimbursementRows(defaultDraft.rows, defaultDraft.columns, "大洋州")
assert.ok(oceanSectionRows.length > 1, "section search expands to rows within the section")
assert.equal(oceanSectionRows[0].kind, "section")

const normalized = normalizeReimbursementTableDraft({
  slug: "  Living Expense Standards  ",
  title: "  开支标准  ",
  description: "  说明  ",
  category: " academic-exchange ",
  isPublished: true,
  columns: [
    { id: " country ", label: " 国家/地区 " },
    { id: "", label: " 住宿费 " },
    { id: "note", label: "" },
  ],
  rows: [
    { id: " row-1 ", cells: [" 美国 ", " 100 ", ""] },
    { id: "", cells: ["", "", ""] },
    { id: "row-3", cells: ["日本"] },
  ],
})

assert.equal(normalized.slug, "living-expense-standards")
assert.equal(normalized.title, "开支标准")
assert.equal(normalized.description, "说明")
assert.equal(normalized.category, "academic-exchange")
assert.equal(normalized.columns.length, 2)
assert.deepEqual(normalized.rows, [
  { id: "row-1", cells: ["美国", "100"] },
  { id: "row-3", cells: ["日本", ""] },
])

const filteredByCountry = filterReimbursementRows(normalized.rows, normalized.columns, "美国")
assert.equal(filteredByCountry.length, 1)
assert.equal(filteredByCountry[0].cells[0], "美国")

const filteredByAmount = filterReimbursementRows(normalized.rows, normalized.columns, "100")
assert.equal(filteredByAmount.length, 1)
assert.equal(filteredByAmount[0].id, "row-1")

const filteredByHeader = filterReimbursementRows(normalized.rows, normalized.columns, "住宿")
assert.equal(filteredByHeader.length, 2)

const emptyQueryRows = filterReimbursementRows(normalized.rows, normalized.columns, "   ")
assert.equal(emptyQueryRows.length, 2)

assert.equal(reimbursementMaterialPages.length, 3)
const supportPlanPage = getReimbursementMaterialPage("academic-exchange-support-plan")
assert.equal(supportPlanPage?.title, "通班学术交流项目支持方案")
assert.equal(supportPlanPage?.sourceType, "PDF")
assert.equal("sourceFile" in supportPlanPage, false)
const supportPlanText = getTextBlocks(supportPlanPage).join("\n")
assert.ok(supportPlanText.includes("通班学术交流项目支持方案（修订版）"))
assert.ok(supportPlanText.includes("第一条 资金来源"))
assert.ok(supportPlanText.includes("每个自然年度内，研究院所支持的学术交流项目的总额度上限为 40 万元人民币"))
assert.ok(supportPlanText.includes("本方案经研究院第一届第 73 次院务会审议通过，第一届第 76 次院务会修订。解释权归研究院院务会。"))
assert.ok(supportPlanText.includes("人工智能研究院"))
assert.ok(supportPlanText.includes("2023/9/18"))
const supportPlanSections = buildReimbursementMaterialArticleSections(supportPlanPage.documentBlocks)
assert.equal(supportPlanSections[0].heading, "")
assert.equal(supportPlanSections[1].heading, "第一条 资金来源")
assert.equal(supportPlanSections.at(-1).heading, "第六条 支持终止")
assert.ok(supportPlanSections.at(-1).paragraphs.includes("本方案经研究院第一届第 73 次院务会审议通过，第一届第 76 次院务会修订。解释权归研究院院务会。"))

const overseasNotesPage = getReimbursementMaterialPage("overseas-reimbursement-notes")
assert.equal(overseasNotesPage?.title, "通班学生出国出境报销注意事项")
assert.equal(overseasNotesPage?.sourceType, "DOCX")
assert.equal("sourceFile" in overseasNotesPage, false)
const overseasTextBlocks = getTextBlocks(overseasNotesPage)
assert.deepEqual(overseasTextBlocks, [
  "通班学生出国出境报销注意事项",
  "签字的《通班学术交流支持申请表》—需要提前经研究院审批同意，只需要申请表不需要文件附件。",
  "出国访问交流照片（请邮件发至yuyl@pku.edu.cn）。",
  "北京大学出国赴港澳任务通知批件（红头，北京大学国际合作部盖章）批件为报销的必要附件材料，请先下载并打印批件。",
  "确认支付方式，一般默认校内转卡，（应该对应的校内农行卡号），如有机票等对公转账需提前说明。",
  "出入境的记录（国家移民管理局出入境查询结果电子文件），以下为样式。",
  "是否逾期：出入境的记录和以上批件时间是否对应，否的话，不论提前或者延后，都要提供： -因公临时出国（境）逾期情况说明（教学科研人员专用）此表需要学籍所在院系申请签章。",
  "提供发票：机票-住宿-及其他需要报销的发票。",
  "发票（2个人在发票上签字）+订单（机票显示经济舱）+银行支付记录截图（和订单发票金额对上，不能差一分钱）。",
])
assert.equal(overseasNotesPage.documentBlocks.filter((block) => block.type === "image").length, 2)
assert.equal(overseasNotesPage.documentBlocks[5].type, "image")
assert.equal(overseasNotesPage.documentBlocks[7].type, "image")
const overseasListItems = buildReimbursementMaterialListItems(overseasNotesPage.documentBlocks)
assert.equal(overseasListItems.length, 8)
assert.equal(overseasListItems[3].text, "确认支付方式，一般默认校内转卡，（应该对应的校内农行卡号），如有机票等对公转账需提前说明。")
assert.equal(overseasListItems[3].images.length, 1)
assert.equal(overseasListItems[4].text, "出入境的记录（国家移民管理局出入境查询结果电子文件），以下为样式。")
assert.equal(overseasListItems[4].images.length, 1)
assert.equal(JSON.stringify(overseasNotesPage).includes("原文示例图"), false)
assert.equal(JSON.stringify(overseasNotesPage).includes("以下截图来自原始文档"), false)

const scholarshipPage = getReimbursementMaterialPage("scholarship-research-review-suggestions")
assert.equal(scholarshipPage?.title, "关于通班奖学金科研成果的评审建议")
assert.equal(scholarshipPage?.sourceType, "PDF")
assert.equal("sourceFile" in scholarshipPage, false)
const scholarshipText = getTextBlocks(scholarshipPage).join("\n")
assert.ok(scholarshipText.includes("关于通班奖学金科研成果的评审建议"))
assert.ok(scholarshipText.includes("科研成果按投稿状态严格分为以下三类，不得使用其他表述"))
assert.ok(scholarshipText.includes("发现重复使用科研成果者，暂停其奖学金评选资格两年（含当年）。"))
assert.ok(scholarshipText.includes("口头汇报应重点展示申请人作为第一作者或共同第一作者的科研成果"))
assert.equal(materialsPageSource.includes("关于通班奖学金科研成果的评审建议.pdf"), false)
assert.ok(materialsPageSource.includes("SCHOLARSHIP_REVIEW_MATERIAL_CATEGORY"))
assert.equal(materialDocumentPageSource.includes("rounded-3xl border"), false)
assert.equal(materialDocumentPageSource.includes("rounded-2xl border"), false)
assert.ok(materialDocumentPageSource.includes("rounded-3xl bg-white px-5 py-8 shadow-sm"))
assert.ok(materialDocumentPageSource.includes("mt-10"))
assert.ok(materialDocumentPageSource.includes("mt-12"))

console.log("reimbursement material table helper tests passed")
