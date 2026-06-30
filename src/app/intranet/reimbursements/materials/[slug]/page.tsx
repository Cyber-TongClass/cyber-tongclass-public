import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ACADEMIC_EXCHANGE_MATERIAL_CATEGORY,
  buildReimbursementMaterialArticleSections,
  buildReimbursementMaterialListItems,
  getReimbursementMaterialPage,
  reimbursementMaterialPages,
  type ReimbursementMaterialImageBlock,
  type ReimbursementMaterialPage,
  type ReimbursementMaterialTextBlock,
} from "@/lib/reimbursement-material-pages"

type MaterialPageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return reimbursementMaterialPages.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getReimbursementMaterialPage(slug)

  if (!page) {
    return {
      title: "资料不存在",
    }
  }

  return {
    title: `${page.title}｜内部资料`,
    description: page.description,
  }
}

function getDocumentTitle(page: ReimbursementMaterialPage) {
  return page.documentBlocks.find((block): block is ReimbursementMaterialTextBlock => block.type === "title")?.text || page.title
}

function getSignatureBlocks(page: ReimbursementMaterialPage) {
  return page.documentBlocks.filter((block): block is ReimbursementMaterialTextBlock => block.type === "signature")
}

function getBackLink(page: ReimbursementMaterialPage) {
  if (page.category === ACADEMIC_EXCHANGE_MATERIAL_CATEGORY) {
    return {
      href: "/intranet/reimbursements/academic-exchange",
      label: "返回学术交流支持",
    }
  }

  return {
    href: "/intranet/materials",
    label: "返回资料下载",
  }
}

function getParagraphClassName(paragraph: string) {
  if (/^\d+\.\d+\s/.test(paragraph)) {
    return "text-base font-extrabold leading-8 text-slate-900"
  }

  if (paragraph.startsWith("○")) {
    return "pl-7 text-base leading-8 text-slate-700"
  }

  if (paragraph.startsWith("•")) {
    return "pl-5 text-base leading-8 text-slate-800"
  }

  return "text-base leading-8 text-slate-800"
}

function SourceImage({ image }: { image: ReimbursementMaterialImageBlock }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-slate-50 p-3">
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        className="h-auto max-w-full object-contain"
      />
    </div>
  )
}

function NotesList({ page }: { page: ReimbursementMaterialPage }) {
  const items = buildReimbursementMaterialListItems(page.documentBlocks)

  return (
    <article className="rounded-3xl bg-white px-5 py-8 shadow-sm sm:px-8 md:p-10">
      <header className="text-center">
        <h2 className="text-2xl font-extrabold leading-9 tracking-tight text-slate-950 md:text-3xl">
          {getDocumentTitle(page)}
        </h2>
      </header>

      <ol className="mt-10 space-y-8">
        {items.map((item, index) => (
          <li key={`${item.text}-${index}`}>
            <div className="grid gap-4 md:grid-cols-[3rem_1fr]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-base font-medium leading-8 text-slate-800">
                  {item.text}
                </p>
                {item.images.map((image) => (
                  <SourceImage key={image.src} image={image} />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}

function ArticleList({ page }: { page: ReimbursementMaterialPage }) {
  const sections = buildReimbursementMaterialArticleSections(page.documentBlocks)
  const signatureBlocks = getSignatureBlocks(page)

  return (
    <article className="rounded-3xl bg-white px-5 py-8 shadow-sm sm:px-8 md:p-10">
      <header className="text-center">
        <h2 className="text-2xl font-extrabold leading-9 tracking-tight text-slate-950 md:text-3xl">
          {getDocumentTitle(page)}
        </h2>
      </header>

      <div className="mt-10">
        <div className="space-y-8">
          {sections.map((section, index) => (
            <section
              key={`${section.heading || "intro"}-${index}`}
            >
              {section.heading ? (
                <h3 className="mb-3 text-xl font-extrabold leading-8 text-slate-950">
                  {section.heading}
                </h3>
              ) : null}
              <div className="space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className={getParagraphClassName(paragraph)}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {signatureBlocks.length ? (
          <footer className="mt-12 pt-8 text-right">
            {signatureBlocks.map((block) => (
              <p key={block.text} className="text-base leading-8 text-slate-800">
                {block.text}
              </p>
            ))}
          </footer>
        ) : null}
      </div>
    </article>
  )
}

export default async function ReimbursementMaterialDocumentPage({ params }: MaterialPageProps) {
  const { slug } = await params
  const page = getReimbursementMaterialPage(slug)

  if (!page) {
    notFound()
  }
  const backLink = getBackLink(page)

  return (
    <div className="min-h-screen bg-[hsl(211,30%,97%)]">
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_45%)] md:block" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <Button asChild variant="ghost" className="-ml-3 mb-5 text-white/70 hover:bg-white/10 hover:text-white">
            <Link href={backLink.href}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLink.label}
            </Link>
          </Button>
          <div>
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                <FileText className="h-3.5 w-3.5" />
                网页阅读 · 完整原文
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">{page.title}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/70">{page.description}</p>
              <p className="mt-3 text-sm text-white/55">来源版本：{page.sourceUpdatedAt}</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {page.sourceType === "DOCX" ? <NotesList page={page} /> : <ArticleList page={page} />}
      </main>
    </div>
  )
}
