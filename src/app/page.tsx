"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, BookOpen, Users, FileText, Award, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNews, usePublications } from "@/lib/api"

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeFeature, setActiveFeature] = useState(0)
  const newsItems = useNews({ limit: 50 })
  const publications = usePublications({ limit: 50 })
  const featuredSlides = useMemo(() => {
    if (!newsItems) return []

    return [...newsItems]
      .filter((item) => item.showOnHomepage && item.coverImageUrl)
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((item) => {
        const normalizedContent = item.content.trim()
        const shouldOpenOriginalDirectly =
          !!item.sourceUrl && (!normalizedContent || normalizedContent === "暂无内容")

        return {
          id: item._id,
          title: item.title,
          description: item.homepageSubtitle?.trim() || "",
          category: item.category,
          href: shouldOpenOriginalDirectly ? item.sourceUrl! : `/news/${item._id}`,
          isExternal: shouldOpenOriginalDirectly,
          image: item.coverImageUrl!,
        }
      })
  }, [newsItems])

  useEffect(() => {
    if (featuredSlides.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featuredSlides.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [featuredSlides])

  useEffect(() => {
    if (activeSlide >= featuredSlides.length) {
      setActiveSlide(0)
    }
  }, [activeSlide, featuredSlides.length])

  const features = [
    {
      title: "通识·通智·通用",
      description: "交叉人文社科的「通识」、融会六大核心领域的「通智」、融入各行各业的「通用」，培养世界顶尖复合型人才",
      image: "https://cdn.jsdelivr.net/gh/Cyber-TongClass/news-assets@main/news%20images/%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6%E9%80%9A%E7%94%A8%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%E5%AE%9E%E9%AA%8C%E7%8F%AD_%E9%80%9A%E8%AF%86_%E9%80%9A%E6%99%BA_%E9%80%9A%E7%94%A8/assets/tongtongtong.webp",
      fit: "object-contain",
    },
    {
      title: "前沿课程体系",
      description: "打破了传统学科边界，为本科生量身定制了与世界前沿接轨的专属培养方案，覆盖了通用视觉、自然语言、认知推理、机器人、机器学习和多智能体等六大AI核心领域，同时注重AI与其他学科的交叉融合",
      image: "https://www.bigai.ai/wp-content/uploads/2022/10/%E7%A0%94%E7%A9%B6-e1666601512358.png",
    },
    {
      title: "顶尖科研实践",
      description: "构建从人工智能初级研讨班、人工智能系统实践到毕业设计的完整科研训练路径，聚焦 AI 领域，着力培养创新型、复合型通才",
      image: "https://cdn.jsdelivr.net/gh/Cyber-TongClass/news-assets@main/news%20images/%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6%E9%80%9A%E7%94%A8%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%E5%AE%9E%E9%AA%8C%E7%8F%AD_%E9%80%9A%E8%AF%86_%E9%80%9A%E6%99%BA_%E9%80%9A%E7%94%A8/assets/17776187945420.7835409329709796.jpg",
    },
    {
      title: "立体化的学术交流网络",
      description: "与UCLA、MIT、CMU等世界顶尖学府保持紧密交流，定期举办国际学术论坛，并有学生自主创办的\u201cTong Talk\u201d学术沙龙和以学生为主体参展的学术交流活动\u201cAI TechDay\u201d。",
      image: "https://cdn.jsdelivr.net/gh/Cyber-TongClass/news-assets@main/news%20images/%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6%E9%80%9A%E7%94%A8%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD%E5%AE%9E%E9%AA%8C%E7%8F%AD_%E9%80%9A%E8%AF%86_%E9%80%9A%E6%99%BA_%E9%80%9A%E7%94%A8/assets/17776187946490.7499788932747545.jpg",
    },
    {
      title: "顶尖的师资力量",
      description: "融合北大、清华人工智能领域的顶尖教研力量，汇聚 IEEE Fellow、长江学者等高水平师资，依托两校深厚的学科积淀，打造国内一流的 AI 人才培养平台",
      image: "https://cdn.jsdelivr.net/gh/Cyber-TongClass/news-assets@main/news%20images/%E5%B8%88%E8%B5%84.jpeg",
    },
  ]

  return (
    <div className="flex flex-col">
      <section className="relative w-full h-[360px] md:h-[480px] overflow-hidden border-b border-slate-200 bg-slate-950">
        {!newsItems ? (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
            <div className="text-center text-white/60">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80 mb-3" />
              <p className="text-sm">加载中...</p>
            </div>
          </div>
        ) : featuredSlides.length === 0 ? (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800" />
            <div className="container-custom relative h-full flex items-center">
              <div className="max-w-2xl text-white">
                <p className="inline-flex mb-4 text-xs tracking-wide uppercase bg-white/20 px-3 py-1 rounded-full">
                  首页轮播
                </p>
                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">欢迎来到北大通班</h1>
                <p className="text-white/90 text-base md:text-lg mb-6">
                  当前还没有勾选&ldquo;在首页轮播展示&rdquo;的已发布动态。你可以在后台新闻管理中为动态开启首页轮播。
                </p>
                <Button asChild size="lg" className="gap-2">
                  <Link href="/news">
                    查看动态 <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {featuredSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              idx === activeSlide ? "opacity-100 pointer-events-auto z-10" : "opacity-0 pointer-events-none z-0"
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
            <div className="container-custom relative h-full flex items-center">
              <div className="max-w-2xl text-white">
                <p className="inline-flex mb-4 text-xs tracking-wide uppercase bg-white/20 px-3 py-1 rounded-full">
                  {slide.category}
                </p>
                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">{slide.title}</h1>
                {slide.description ? (
                  <p className="text-white/90 text-base md:text-lg mb-6">{slide.description}</p>
                ) : null}
                <Button asChild size="lg" className="gap-2">
                  {slide.isExternal ? (
                    <a href={slide.href} target="_blank" rel="noopener noreferrer">
                      查看详情 <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link href={slide.href}>
                      查看详情 <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}

        <div className="absolute left-4 right-4 bottom-4 z-20 flex items-center justify-between">
          <div className="flex gap-2">
            {featuredSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveSlide(idx)}
                className={`h-2.5 rounded-full transition-all ${idx === activeSlide ? "w-8 bg-white" : "w-2.5 bg-white/50"}`}
                aria-label={`切换到第 ${idx + 1} 张`}
              />
            ))}
          </div>
          <div className="hidden sm:flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
              disabled={featuredSlides.length <= 1}
              onClick={() => setActiveSlide((prev) => (prev - 1 + featuredSlides.length) % featuredSlides.length)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
              disabled={featuredSlides.length <= 1}
              onClick={() => setActiveSlide((prev) => (prev + 1) % featuredSlides.length)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-gradient-to-b from-[hsl(211,40%,97%)] to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-[hsl(35,40%,55%)]/10 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">TONG CLASS</div>
          <div className="max-w-3xl mx-auto text-center space-y-6 relative">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-balance tracking-tight text-slate-900">通用人工智能实验班</h2>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto">北京大学 & 清华大学</p>
            <p className="text-slate-500">北京大学与清华大学于2021年联手开启，致力于培养具有国际视野的下一代人工智能领军人才</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="gap-2">
                <Link href="/about">
                  了解更多 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/members">查看成员</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-primary">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { label: "北清成员", value: "359", icon: Users },
              { label: "顶会论文", value: "104", icon: FileText },
              { label: "科研课题", value: "130", icon: BookOpen },
              { label: "奖项荣誉", value: "169", icon: Award },
            ].map((stat) => (
              <div key={stat.label} className="text-center text-white">
                <stat.icon className="h-8 w-8 mx-auto mb-3 opacity-80" />
                <div className="text-4xl md:text-5xl font-extrabold tracking-tight">{stat.value}</div>
                <div className="text-sm md:text-base mt-1 text-[hsl(211,40%,80%)] font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[hsl(25,20%,96%)] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-10">项目特色</h2>

          <div className="flex flex-col lg:flex-row gap-10 items-stretch">
            {/* Left: image panel */}
            <div className="w-full lg:w-1/2 aspect-[4/3] lg:aspect-auto relative bg-[hsl(25,20%,96%)]">
              {features.map((f, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                    activeFeature === idx ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <Image
                    src={f.image}
                    alt={f.title}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              ))}
            </div>

            {/* Right: tabs */}
            <div className="w-full lg:w-1/2 flex flex-col gap-3">
              {features.map((f, idx) => (
                <div
                  key={f.title}
                  onMouseEnter={() => setActiveFeature(idx)}
                  className={`group px-6 py-5 flex-1 flex flex-col justify-center cursor-pointer transition-all duration-300 bg-white shadow-sm hover:shadow-md ${
                    activeFeature === idx
                      ? "border-l-[3px] border-[hsl(350,55%,35%)]"
                      : "border-l-[3px] border-transparent"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[hsl(15,20%,60%)] mb-1">
                    {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <h3 className={`text-lg font-extrabold transition-all duration-300 ${activeFeature === idx ? "text-[hsl(350,55%,35%)] text-xl" : "text-slate-900"}`}>
                    {f.title}
                  </h3>
                  <div className={`grid transition-all duration-300 ${activeFeature === idx ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"}`}>
                    <p className="overflow-hidden text-sm text-slate-600 leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-24 bg-[hsl(211,30%,97%)]">
        <div className="absolute top-0 left-0 right-0 h-16 bg-[hsl(25,20%,96%)]" />
        <h2 className="relative z-10 text-4xl md:text-5xl font-extrabold text-slate-900 -mt-8 mb-10 container-custom">最新动态</h2>
        <div className="container-custom relative z-10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* 新闻 */}
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-[hsl(232,66%,30%)] mb-3" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>新闻</h3>
              <div className="space-y-2">
                {newsItems
                  ?.filter((n) => n.isPublished)
                  .sort((a, b) => b.publishedAt - a.publishedAt)
                  .slice(0, 4)
                  .map((item) => (
                    <Link
                      key={item._id}
                      href={item.sourceUrl || `/news/${item._id}`}
                      target={item.sourceUrl ? "_blank" : undefined}
                      rel={item.sourceUrl ? "noopener noreferrer" : undefined}
                    >
                      <div className="group bg-white px-4 py-3 shadow-sm hover:bg-slate-50 transition-colors duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(item.publishedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
              </div>
              <Link href="/news" className="block mt-2 bg-white shadow-sm hover:bg-slate-50 transition-colors duration-200 text-center py-2.5">
                <span className="text-sm font-bold text-[hsl(232,66%,30%)]">全部动态 →</span>
              </Link>
            </div>

            {/* 成果 */}
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-[hsl(232,66%,30%)] mb-3" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>成果</h3>
              <div className="space-y-2">
                {publications
                  ?.sort((a, b) => b.year - a.year)
                  .slice(0, 4)
                  .map((pub) => (
                    <Link key={pub._id} href={`/publications/${pub._id}`}>
                      <div className="group bg-white px-4 py-3 shadow-sm hover:bg-slate-50 transition-colors duration-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase text-primary">
                            {pub.venue}
                          </span>
                          <span className="text-xs text-slate-400">{pub.year}</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-[hsl(232,66%,30%)] transition-colors line-clamp-1">
                          {pub.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
              </div>
              <Link href="/publications" className="block mt-2 bg-white shadow-sm hover:bg-slate-50 transition-colors duration-200 text-center py-2.5">
                <span className="text-sm font-bold text-[hsl(232,66%,30%)]">全部成果 →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
