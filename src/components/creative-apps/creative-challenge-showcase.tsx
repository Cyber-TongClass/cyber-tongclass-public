import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowUpRight, BookOpen, Github, Play, Sparkles } from "lucide-react"
import {
  creativeChallengeFeaturedProject,
  creativeChallengeShowcase,
  type ShowcaseProject,
} from "@/lib/creative-challenge-showcase"

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
const heroFocusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"

function ProjectCard({ project, featured = false }: { project: ShowcaseProject; featured?: boolean }) {
  return (
    <article
      id={project.slug}
      className={`group relative flex min-h-[22rem] flex-col justify-between overflow-hidden border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none sm:p-8 ${
        featured ? "lg:col-span-2 lg:min-h-[28rem]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[0.68rem] tracking-[0.24em] text-[hsl(350,55%,35%)]">{project.number} / {project.category}</p>
          <h2 className="mt-4 text-3xl font-extrabold leading-none tracking-tight text-slate-900 sm:text-4xl">{project.title}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{project.projectTitle}</p>
        </div>
        <span className="border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[0.62rem] tracking-[0.12em] text-slate-500">
          {project.status}
        </span>
      </div>

      {project.image ? (
        <div className="pointer-events-none absolute -bottom-7 -right-7 h-48 w-48 rotate-6 overflow-hidden border-8 border-white bg-white shadow-lg transition-transform duration-300 group-hover:rotate-2 group-hover:scale-105 motion-reduce:transition-none sm:h-60 sm:w-60">
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
        <p className="text-sm leading-7 text-slate-600">{project.description}</p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.68rem] tracking-[0.08em] text-slate-500">
          {project.outputs.map((output) => <span key={output}>＋ {output}</span>)}
        </div>
      </div>

      <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">{project.mode}</span>
        <div className="flex flex-wrap items-center gap-5">
          {project.slug === "tongxiaomiao" ? (
            <Link
              href="/intranet/apps/creative-challenge-2026/tongxiaomiao"
              className={`inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary ${focusRing}`}
            >
              浏览画廊 <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[hsl(350,55%,35%)] underline decoration-[hsl(350,55%,35%)]/40 underline-offset-4 hover:decoration-[hsl(350,55%,35%)] ${focusRing}`}
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
    <div className="min-h-screen bg-[hsl(211,30%,97%)] text-slate-900 selection:bg-primary/20 selection:text-primary">
      <section className="relative overflow-hidden bg-primary text-white">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[5rem] font-extrabold uppercase tracking-[0.15em] leading-none text-white/5 md:text-[8rem] lg:text-[10rem]" aria-hidden="true">CREATIVE CHALLENGE</div>
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
          <nav className="flex items-center justify-between border-b border-white/20 pb-5 text-xs tracking-[0.12em] text-white/70">
            <Link href="/" className={`hover:text-white ${heroFocusRing}`}>TONG CLASS / 主页</Link>
            <div className="flex items-center gap-5">
              <Link href="/intranet" className={`hover:text-white ${heroFocusRing}`}>返回内网</Link>
              <span>OPEN WORKS · 2026</span>
            </div>
          </nav>

          <div className="relative grid gap-12 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-20 lg:pt-24">
            <div>
              <p className="font-mono text-xs tracking-[0.28em] text-white/70">智慧通班 · 创意开发挑战赛</p>
              <h1 className="mt-6 max-w-3xl text-[clamp(3.7rem,11vw,8.5rem)] font-extrabold leading-[0.84] tracking-[-0.06em] text-white">
                创意挑战赛<br /><span className="text-white/70">精选部署成果</span>
              </h1>
              <a href="#works" className={`mt-9 inline-flex min-h-11 items-center gap-3 border border-white/60 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-primary ${heroFocusRing}`}>
                向下浏览作品 <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="relative min-h-[18rem] border-l border-white/30 pl-6 sm:min-h-[22rem] sm:pl-10">
              <p className="max-w-xs text-sm leading-7 text-white/70">由于本学期网站后端更新原因，在线使用功能将逐步推进。</p>
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

      <main id="works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.24em] text-[hsl(350,55%,35%)]">01 / WORKS</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">各显创意</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-500">点击对应卡片查看。</p>
        </div>

        {featured ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <ProjectCard project={featured} featured />
            <aside className="flex flex-col justify-between border border-[hsl(350,55%,35%)] bg-[hsl(350,55%,35%)] p-6 text-white sm:p-8">
              <div>
                <Sparkles className="h-7 w-7" aria-hidden="true" />
                <p className="mt-8 font-mono text-[0.68rem] tracking-[0.2em] text-white/70">现在可以直接浏览</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">看看通小喵吧！</h2>
                <p className="mt-5 text-sm leading-7 text-white/80">通小喵的角色图、动作参考、提示词和成图已经整理成一组可查看的案例。</p>
              </div>
              <Link href="#tongxiaomiao" className={`mt-10 inline-flex min-h-11 items-center gap-2 self-start border-b border-white/60 pb-1 text-sm font-medium text-white ${focusRing}`}>
                查看案例卡片 <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {remainingProjects.map((project) => <ProjectCard key={project.slug} project={project} />)}
        </div>

        <section className="mt-20 grid gap-8 border-t border-slate-300 pt-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16" aria-labelledby="how-to-use">
          <div>
            <p className="font-mono text-xs tracking-[0.24em] text-[hsl(350,55%,35%)]">02 / HOW TO USE</p>
            <h2 id="how-to-use" className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">今天能做什么？</h2>
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
      <p className="text-4xl font-extrabold leading-none text-white">{value}</p>
      <p className="mt-2 text-xs text-white/70">{label}</p>
    </div>
  )
}

function InfoStep({ icon, number, title, text }: { icon: ReactNode; number: string; title: string; text: string }) {
  return (
    <div className="border-t-2 border-primary pt-4">
      <div className="flex items-center justify-between text-[hsl(350,55%,35%)]">
        {icon}
        <span className="font-mono text-xs">{number}</span>
      </div>
      <h3 className="mt-7 text-2xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  )
}
