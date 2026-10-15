import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowUpRight, BookOpen, Github, Play, Sparkles } from "lucide-react"
import {
  creativeChallengeFeaturedProject,
  creativeChallengeShowcase,
  type ShowcaseProject,
} from "@/lib/creative-challenge-showcase"

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d85a43] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f4eee4]"

function ProjectCard({ project, featured = false }: { project: ShowcaseProject; featured?: boolean }) {
  return (
    <article
      id={project.slug}
      className={`group relative flex min-h-[22rem] flex-col justify-between overflow-hidden border border-[#cfc5b6] bg-[#f8f4ed] p-6 text-[#182c3d] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[10px_12px_0_#d85a43] motion-reduce:transition-none sm:p-8 ${
        featured ? "lg:col-span-2 lg:min-h-[28rem]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[0.68rem] tracking-[0.24em] text-[#b04b39]">{project.number} / {project.category}</p>
          <h2 className="mt-4 font-serif text-3xl leading-none tracking-tight sm:text-4xl">{project.title}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#53606a]">{project.projectTitle}</p>
        </div>
        <span className="border border-[#b7aa9a] px-2 py-1 font-mono text-[0.62rem] tracking-[0.12em] text-[#53606a]">
          {project.status}
        </span>
      </div>

      {project.image ? (
        <div className="pointer-events-none absolute -bottom-7 -right-7 h-48 w-48 rotate-6 overflow-hidden border-8 border-[#f8f4ed] bg-white shadow-[0_12px_35px_rgba(24,44,61,0.16)] transition-transform duration-300 group-hover:rotate-2 group-hover:scale-105 motion-reduce:transition-none sm:h-60 sm:w-60">
          <Image
            src={project.image}
            alt={project.imageAlt || "项目案例图"}
            fill
            sizes="240px"
            className="object-contain"
          />
        </div>
      ) : null}

      <div className={`relative mt-12 max-w-xl ${project.image ? "pr-24 sm:pr-32" : ""}`}>
        <p className="text-sm leading-7 text-[#53606a]">{project.description}</p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.68rem] tracking-[0.08em] text-[#53606a]">
          {project.outputs.map((output) => <span key={output}>＋ {output}</span>)}
        </div>
      </div>

      <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#d8cfc2] pt-4">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#53606a]">{project.mode}</span>
        <div className="flex flex-wrap items-center gap-5">
          {project.slug === "tongxiaomiao" ? (
            <Link
              href="/intranet/apps/creative-challenge-2026/tongxiaomiao"
              className={`inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#182c3d] underline decoration-[#182c3d]/40 underline-offset-4 hover:decoration-[#182c3d] ${focusRing}`}
            >
              浏览画廊 <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#b04b39] underline decoration-[#d85a43]/40 underline-offset-4 hover:decoration-[#b04b39] ${focusRing}`}
          >
            查看项目 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  )
}

export function CreativeChallengeShowcase() {
  const featured = creativeChallengeFeaturedProject
  const remainingProjects = creativeChallengeShowcase.filter((project) => project.slug !== featured?.slug)

  return (
    <div className="min-h-screen bg-[#f4eee4] text-[#182c3d] selection:bg-[#d85a43]/20 selection:text-[#182c3d]">
      <section className="relative overflow-hidden bg-[#182c3d] text-[#f4eee4]">
        <div className="pointer-events-none absolute -right-28 -top-32 h-[28rem] w-[28rem] rounded-full border-[70px] border-[#d85a43]/25" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-[-9rem] left-[42%] h-[20rem] w-[20rem] rounded-full border border-[#e6bb64]/35" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8 sm:pb-28 sm:pt-10 lg:px-12">
          <nav className="flex items-center justify-between border-b border-white/15 pb-5 text-xs tracking-[0.12em] text-[#d9d3c8]">
            <Link href="/" className={`hover:text-white ${focusRing}`}>TONG CLASS / 主页</Link>
            <div className="flex items-center gap-5">
              <Link href="/intranet" className={`hover:text-white ${focusRing}`}>返回内网</Link>
              <span>OPEN WORKS · 2026</span>
            </div>
          </nav>

          <div className="grid gap-12 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-20 lg:pt-24">
            <div>
              <p className="font-mono text-xs tracking-[0.28em] text-[#e6bb64]">智慧通班 · 创意开发挑战赛</p>
              <h1 className="mt-6 max-w-3xl font-serif text-[clamp(3.7rem,11vw,8.5rem)] leading-[0.84] tracking-[-0.06em] text-[#f4eee4]">
                创意挑战赛<br /><em className="text-[#e6bb64]">精选部署成果</em>
              </h1>
              <a href="#works" className={`mt-9 inline-flex min-h-11 items-center gap-3 border border-[#e6bb64] px-4 py-2 text-sm font-medium text-[#f4eee4] transition-colors hover:bg-[#e6bb64] hover:text-[#182c3d] ${focusRing}`}>
                向下浏览作品 <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="relative min-h-[18rem] border-l border-[#e6bb64]/45 pl-6 sm:min-h-[22rem] sm:pl-10">
              <p className="max-w-xs text-sm leading-7 text-[#cbd0d0]">由于本学期网站后端更新原因，在线使用功能将逐步推进。</p>
              <div className="absolute bottom-0 left-6 grid grid-cols-2 gap-x-8 gap-y-6 sm:left-10">
                <Stat value="07" label="件部署作品" />
                <Stat value="05" label="件实用工具" />
                <Stat value="01" label="件案例画廊" />
                <Stat value="26" label="年创意大奖" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main id="works" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="flex flex-col gap-4 border-b border-[#cfc5b6] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.24em] text-[#b04b39]">01 / WORKS</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">各显创意</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#65717a]">点击对应卡片查看。</p>
        </div>

        {featured ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <ProjectCard project={featured} featured />
            <aside className="flex flex-col justify-between border border-[#b04b39] bg-[#d85a43] p-6 text-[#fff8ef] sm:p-8">
              <div>
                <Sparkles className="h-7 w-7" aria-hidden="true" />
                <p className="mt-8 font-mono text-[0.68rem] tracking-[0.2em] text-[#ffe1a6]">现在可以直接浏览</p>
                <h2 className="mt-3 font-serif text-3xl leading-tight">看看通小喵吧！</h2>
                <p className="mt-5 text-sm leading-7 text-[#fff0e2]">通小喵的角色图、动作参考、提示词和成图已经整理成一组可查看的案例。</p>
              </div>
              <Link href="#tongxiaomiao" className={`mt-10 inline-flex min-h-11 items-center gap-2 self-start border-b border-[#ffe1a6] pb-1 text-sm font-medium text-[#fff8ef] ${focusRing}`}>
                查看案例卡片 <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {remainingProjects.map((project) => <ProjectCard key={project.slug} project={project} />)}
        </div>

        <section className="mt-20 grid gap-8 border-t border-[#cfc5b6] pt-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16" aria-labelledby="how-to-use">
          <div>
            <p className="font-mono text-xs tracking-[0.24em] text-[#b04b39]">02 / HOW TO USE</p>
            <h2 id="how-to-use" className="mt-3 font-serif text-4xl tracking-tight">今天能做什么？</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <InfoStep icon={<BookOpen className="h-5 w-5" aria-hidden="true" />} number="01" title="看项目" text="先从介绍、截图和输出形式了解作品。" />
            <InfoStep icon={<Github className="h-5 w-5" aria-hidden="true" />} number="02" title="找源码" text="需要安装或进一步研究时，沿链接查看仓库。" />
            <InfoStep icon={<Play className="h-5 w-5" aria-hidden="true" />} number="03" title="等接入" text="在线服务开放后，会在对应项目卡片更新入口。" />
          </div>
        </section>
      </main>

    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-4xl leading-none text-[#f4eee4]">{value}</p>
      <p className="mt-2 text-xs text-[#aeb8b9]">{label}</p>
    </div>
  )
}

function InfoStep({ icon, number, title, text }: { icon: ReactNode; number: string; title: string; text: string }) {
  return (
    <div className="border-t-2 border-[#182c3d] pt-4">
      <div className="flex items-center justify-between text-[#b04b39]">
        {icon}
        <span className="font-mono text-xs">{number}</span>
      </div>
      <h3 className="mt-7 font-serif text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#65717a]">{text}</p>
    </div>
  )
}
