import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

assert.ok(existsSync("src/components/content/publication-archive.tsx"), "Shared publication archive must exist")
const archiveSource = readFileSync("src/components/content/publication-archive.tsx", "utf8")
const tongClassSource = readFileSync("src/app/tong-class/publications/page.tsx", "utf8")
const researchSource = readFileSync("src/app/research/page.tsx", "utf8")

for (const [label, source, expected] of [
  ["shared archive export", archiveSource, "export function PublicationArchive"],
  ["loading-aware items prop", archiveSource, "items: PublicationArchiveItem[] | undefined"],
  ["configurable detail links", archiveSource, "detailHref:"],
  ["audience control slot", archiveSource, "audienceControl?: React.ReactNode"],
  ["parsed-author search", archiveSource, "getPublicationAuthorName"],
  ["structured author rendering", archiveSource, "PublicationAuthorsList"],
  ["published/preprint filter", archiveSource, '"arxiv preprint"'],
  ["category filter", archiveSource, "selectedCategory"],
  ["title/year sorting", archiveSource, "sortBy"],
  ["sort direction", archiveSource, "sortOrder"],
  ["clear filters", archiveSource, "清除筛选"],
  ["result counts", archiveSource, "filteredPublications.length"],
  ["year grouping", archiveSource, "groupedByYear"],
  ["venue badges", archiveSource, "venueBadge"],
  ["external publication links", archiveSource, "ExternalLink"],
  ["safe external URL helper", archiveSource, "getSafeExternalUrl"],
  ["shared external URL helper", archiveSource, '@/lib/safe-external-url'],
  ["safe external href", archiveSource, "href={safeExternalUrl}"],
  ["ascending year group order", archiveSource, "sortOrder === \"desc\" ? Number(right) - Number(left) : Number(left) - Number(right)"],
  ["flat title-sorted results", archiveSource, 'sortBy === "title"'],
  ["blank category fallback", archiveSource, '|| "未分类"'],
  ["search accessible label", archiveSource, 'aria-label="搜索作者或题目"'],
  ["decorative search icon", archiveSource, "<Search"],
  ["decorative search icon hidden", archiveSource, 'aria-hidden="true"'],
  ["loading state", archiveSource, "正在加载"],
  ["empty state", archiveSource, "未找到相关成果"],
  ["Tong Class real-data hook", tongClassSource, "usePublications({ limit: 100 })"],
  ["Tong Class id projection", tongClassSource, "id: String(publication._id)"],
  ["Tong Class shared archive", tongClassSource, "<PublicationArchive"],
  ["Tong Class detail route", tongClassSource, 'detailHref={(item) => `/tong-class/publications/${item.id}`}'],
  ["Tong Class hero", tongClassSource, "展示通班师生的学术论文、研究成果与创新贡献。"],
  ["AIA public research hook", researchSource, "usePublicInstituteResearch({ limit })"],
  ["AIA deduplication", researchSource, "buildAudienceCollections"],
  ["AIA selected audience", researchSource, "selectedAudience"],
  ["AIA audience tabs", researchSource, "<AudienceTabs"],
  ["AIA shared archive", researchSource, "<PublicationArchive"],
  ["AIA existing detail route", researchSource, 'detailHref={(item) => withReturnTo(`/tong-class/publications/${item.id}`, "/research")}'],
  ["AIA hero", researchSource, "展示经发布流程确认的研究成果，帮助访问者从公开信息开始了解研究院工作。"],
]) {
  assert.ok(source.includes(expected), `Missing ${label}: ${expected}`)
}

assert.doesNotMatch(tongClassSource, /from ["']convex\//, "Tong Class page must use the canonical client hook")
assert.doesNotMatch(researchSource, /from ["']convex\//, "AIA research page must use the canonical client hook")
assert.doesNotMatch(archiveSource, /href=\{publication\.url\}/, "Unvalidated publication URLs must never become href values")

console.log("AIA shared publication archive source checks passed")
