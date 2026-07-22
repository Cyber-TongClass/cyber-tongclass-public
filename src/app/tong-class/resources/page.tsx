import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

const publicResources = [
  {
    id: "survival-guide",
    title: "通班生存指南",
    description: "写给北大通班学生的人工智能专业学习指南，涵盖入学指南、课程选择、编程入门、资源推荐、科研入门建议等内容，由历届通班学生参与编写维护。",
    href: "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzk1Nzg0MzM0OQ==&action=getalbum&album_id=4091076469172944898&scene=126#wechat_redirect",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80",
    external: true,
  },
  {
    id: "public-links",
    title: "自学资源链接",
    description: "人工智能学习资源汇总，包括课程、书籍、文章、工具等链接，由通班学术部维护更新。",
    href: "/tong-class/resources/links",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "course-reviews",
    title: "课程测评",
    description: "通班课程测评系统，仅对通班内部成员开放，汇集了历年来同学们的课程评价与反馈。",
    href: "/tong-class/courses",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
  },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">RESOURCES</div>
          <div className="mb-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">学习资源</h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl">
            面向全体公众的资源汇总，包括一代代通班学子参与编写的学习指南、自学资源链接等。
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {publicResources.map((resource) => (
              <div key={resource.id} id={resource.id} className="group bg-white shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col md:flex-row overflow-hidden">
                <div className="flex-1 p-6 md:p-8">
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-3 group-hover:text-primary transition-colors">{resource.title}</h3>
                  <p className="text-slate-600 leading-relaxed mb-5">{resource.description}</p>
                  <Button asChild variant="outline">
                    {resource.external ? (
                      <a href={resource.href} target="_blank" rel="noopener noreferrer">访问资源</a>
                    ) : (
                      <Link href={resource.href}>访问资源</Link>
                    )}
                  </Button>
                </div>
                <div className="md:w-56 lg:w-64 flex-shrink-0 h-36 md:h-auto bg-slate-100 relative">
                  <Image
                    src={resource.image}
                    alt={resource.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 256px"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
