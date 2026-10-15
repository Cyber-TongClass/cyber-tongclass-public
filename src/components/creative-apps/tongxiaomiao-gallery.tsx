"use client"

import { useState, type CSSProperties } from "react"
import Image from "next/image"
import { ArrowUpRight, ChevronDown, Download, Expand } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { CreativeChallengeRegistration } from "@/lib/creative-challenge-2026"

type GalleryCase = {
  number: string
  title: string
  reference?: string
  referenceAlt?: string
  result: string
  resultAlt: string
  prompt: string
  parameters: string
}

type GalleryProject = Pick<CreativeChallengeRegistration, "githubUrl">

const cases: GalleryCase[] = [
  {
    number: "01",
    title: "认真敬礼",
    reference: "/images/cc2026/tongxiaomiao/reference-respect.png",
    referenceAlt: "通小喵敬礼动作参考图",
    result: "/images/cc2026/tongxiaomiao/result-respect.png",
    resultAlt: "通小喵敬礼生成结果",
    prompt: "保持通小喵的头身比例、灰白毛色、蓝色眼睛和胸前红色标志。参考图提供正面敬礼动作，生成白色背景、粗白描边、无文字的卡通贴纸。",
    parameters: "Qwen-Image-Edit-2511 · LoRA step-1280 · seed 42 · 768 × 768",
  },
  {
    number: "02",
    title: "眼镜与玫瑰",
    reference: "/images/cc2026/tongxiaomiao/reference-rose.png",
    referenceAlt: "眼镜和玫瑰动作参考图",
    result: "/images/cc2026/tongxiaomiao/result-rose.png",
    resultAlt: "通小喵戴眼镜手持玫瑰的生成结果",
    prompt: "保持通小喵的角色身份和灰白毛色。参考图提供黑色粗框眼镜、正面近景和玫瑰花姿态，生成清晰精致的通小喵卡通贴纸，白色纯背景。",
    parameters: "Qwen-Image-Edit-2511 · LoRA step-1280 · seed 42 · 768 × 768",
  },
  {
    number: "03",
    title: "天使与光环",
    reference: "/images/cc2026/tongxiaomiao/reference-angel.png",
    referenceAlt: "天使角色和光环参考图",
    result: "/images/cc2026/tongxiaomiao/result-angel.png",
    resultAlt: "通小喵天使形象生成结果",
    prompt: "保持通小喵的灰白毛色、猫耳和胸前标志。参考图提供闭眼、悬浮、光环、白色小翅膀和蓝白云层，生成明亮柔和的卡通插画。",
    parameters: "Qwen-Image-Edit-2511 · LoRA step-1280 · seed 42 · 768 × 768",
  },
  {
    number: "04",
    title: "躲进小被窝",
    reference: "/images/cc2026/tongxiaomiao/reference-bed.png",
    referenceAlt: "躲在被窝里的表情参考图",
    result: "/images/cc2026/tongxiaomiao/result-bed.png",
    resultAlt: "通小喵躲在被窝里的生成结果",
    prompt: "让通小喵舒服地缩在柔软的棕色小床或沙发里，只露出半张脸，表现慵懒、安心和逃避工作的情绪，画面采用温暖昏暗的卧室光线。",
    parameters: "Qwen-Image-Edit-2511 · LoRA step-1280 · seed 42 · 768 × 768",
  },
  {
    number: "05",
    title: "微笑头像",
    result: "/images/cc2026/tongxiaomiao/result-smile.png",
    resultAlt: "通小喵微笑头像生成结果",
    prompt: "保持图1中通小喵的角色身份、头身比例、毛色分布、耳朵形状、眼睛、尾巴纹理和标志性细节。微笑，居中大头或半身头像，主体清晰，适合方形头像。",
    parameters: "Qwen-Image-Edit-2511 · LoRA step-1280 · seed 42 · 768 × 768",
  },
  {
    number: "06",
    title: "红帽贴纸",
    result: "/images/cc2026/tongxiaomiao/result-hat.png",
    resultAlt: "通小喵红帽贴纸生成结果",
    prompt: "保持图1中的通小喵角色身份、头身比例、毛色分布、耳朵形状、眼睛和尾巴纹理。站立，戴红色帽子，全身贴纸设计，主体完整，白色粗描边，背景简洁。",
    parameters: "Qwen-Image-Edit-2511 · LoRA step-1280 · 768 × 768 · 30 steps",
  },
]

const filters = ["全部", "有动作参考", "文字描述"] as const
type GalleryFilter = (typeof filters)[number]

const galleryStyle = {
  "--gallery-paper": "hsl(211, 30%, 97%)",
  "--gallery-ink": "hsl(222.2, 84%, 4.9%)",
  "--gallery-muted": "hsl(215.4, 16.3%, 46.9%)",
  "--gallery-line": "hsl(214.3, 31.8%, 91.4%)",
  "--gallery-primary": "hsl(211, 54%, 28%)",
} as CSSProperties

const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gallery-primary)] focus-visible:ring-offset-2"

function CaseDetails({ item }: { item: GalleryCase }) {
  return (
    <DialogContent
      style={galleryStyle}
      className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto rounded-lg border-[var(--gallery-line)] bg-white p-5 text-[var(--gallery-ink)] sm:p-8 motion-reduce:animate-none"
    >
      <div className="border-b border-[var(--gallery-line)] pb-5 pr-8">
        <p className="mb-2 font-mono text-xs tracking-widest text-[var(--gallery-muted)]">通小喵 / {item.number}</p>
        <DialogTitle className="text-2xl font-extrabold leading-tight sm:text-3xl">{item.title}</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-6 text-[var(--gallery-muted)]">
          {item.reference ? "角色图 + 动作参考" : "角色图 + 文字描述"}
        </DialogDescription>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <div className="min-w-0">
          <a
            href={item.result}
            target="_blank"
            rel="noreferrer"
            aria-label={`在新窗口查看「${item.title}」原图`}
            className={`relative block aspect-square bg-white ${focusClass}`}
          >
            <Image
              src={item.result}
              alt={item.resultAlt}
              fill
              unoptimized
              sizes="(max-width: 1024px) 90vw, 580px"
              className="object-contain"
            />
          </a>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[var(--gallery-muted)]">原图 · PNG</span>
            <a
              href={item.result}
              download={`通小喵-${item.title}.png`}
              className={`inline-flex min-h-10 items-center gap-2 border-b border-[var(--gallery-ink)] px-1 font-medium ${focusClass}`}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              下载原图
            </a>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <ReferenceImage
              src="/images/cc2026/tongxiaomiao/base-character.png"
              alt="通小喵共用角色图"
              label="角色图 / 图 1"
            />
            {item.reference ? (
              <ReferenceImage src={item.reference} alt={item.referenceAlt || "动作参考图"} label="动作参考 / 图 2" />
            ) : null}
          </div>
          <section aria-labelledby={`prompt-${item.number}`}>
            <h3 id={`prompt-${item.number}`} className="text-sm font-semibold text-[var(--gallery-primary)]">提示词</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--gallery-muted)]">{item.prompt}</p>
          </section>
          <details className="group border-t border-[var(--gallery-line)] pt-4">
            <summary className={`flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden ${focusClass}`}>
              生成参数
              <ChevronDown aria-hidden="true" className="h-4 w-4 group-open:rotate-180" />
            </summary>
            <p className="mt-2 break-words font-mono text-xs leading-6 text-[var(--gallery-muted)]">{item.parameters}</p>
          </details>
        </div>
      </div>
    </DialogContent>
  )
}

function ReferenceImage({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <figure>
      <a href={src} target="_blank" rel="noreferrer" className={`relative block aspect-square bg-white ${focusClass}`} aria-label={`在新窗口查看${label}`}>
        <Image src={src} alt={alt} fill sizes="144px" className="object-contain p-2" />
      </a>
      <figcaption className="mt-2 text-xs leading-5 text-[var(--gallery-muted)]">{label}</figcaption>
    </figure>
  )
}

export function TongxiaomiaoGallery({ project }: { project: GalleryProject | null }) {
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>("全部")
  const visibleCases = cases.filter((item) => (
    activeFilter === "全部" || (activeFilter === "有动作参考" ? Boolean(item.reference) : !item.reference)
  ))

  return (
    <section style={galleryStyle} aria-labelledby="tongxiaomiao-gallery-title" className="bg-[var(--gallery-paper)] px-4 py-6 text-[var(--gallery-ink)] sm:px-7 sm:py-8">
      <header className="flex flex-col gap-4 border-b border-[var(--gallery-line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="tongxiaomiao-gallery-title" className="text-3xl font-extrabold leading-tight sm:text-4xl">通小喵案例画廊</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--gallery-muted)]">点击成图，查看参考图与提示词，也可以下载原图。</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex flex-wrap gap-1" role="group" aria-label="筛选案例">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
              className={`min-h-11 border-b-2 px-3 py-2 text-sm transition-colors motion-reduce:transition-none ${focusClass} ${activeFilter === filter ? "border-[var(--gallery-primary)] font-semibold text-[var(--gallery-primary)]" : "border-transparent text-[var(--gallery-muted)] hover:border-[var(--gallery-line)] hover:text-[var(--gallery-primary)]"}`}
            >
              {filter}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--gallery-muted)]" aria-live="polite">{visibleCases.length} 张成图</p>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCases.map((item) => (
          <figure key={item.number} className="min-w-0">
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" aria-label={`查看「${item.title}」原图、参考图和提示词`} className={`group relative block aspect-square w-full bg-white ${focusClass}`}>
                  <Image src={item.result} alt={item.resultAlt} fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" className="object-contain" />
                  <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-[var(--gallery-line)] bg-white/95 text-[var(--gallery-ink)] opacity-90 transition-opacity group-hover:opacity-100 motion-reduce:transition-none">
                    <Expand aria-hidden="true" className="h-4 w-4" />
                  </span>
                </button>
              </DialogTrigger>
              <CaseDetails item={item} />
            </Dialog>
            <figcaption className="flex items-start gap-3 pt-4">
              <span className="pt-1 font-mono text-xs text-[var(--gallery-muted)]">{item.number}</span>
              <div>
                <h3 className="text-xl font-semibold leading-7">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--gallery-muted)]">{item.reference ? "角色图 + 动作参考" : "角色图 + 文字描述"}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      <footer className="mt-8 flex flex-col gap-3 border-t border-[var(--gallery-line)] pt-5 text-xs leading-6 text-[var(--gallery-muted)] sm:flex-row sm:justify-between">
        <p>图片与提示词摘自项目方提供的《通小喵 Prompt》案例册。</p>
        {project?.githubUrl ? (
          <a href={project.githubUrl} target="_blank" rel="noreferrer" className={`inline-flex min-h-8 shrink-0 items-center gap-1 self-start text-[var(--gallery-ink)] underline underline-offset-4 ${focusClass}`}>
            项目仓库 <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </footer>
    </section>
  )
}
