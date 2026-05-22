import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

const resourceLinks = [
  {
    category: "通班严选",
    links: [
      { name: "《通班生存指南》自学推荐", url: "https://mp.weixin.qq.com/s?__biz=Mzk1Nzg0MzM0OQ==&mid=2247485296&idx=1&sn=f7c3823303c1460b97a0927ca8aa672e&chksm=c3d9558af4aedc9cc0c7e8422606cbc62ac38c581970418dff6074054612a42e5ab67e3dc003&scene=178&cur_album_id=4091076469172944898&search_click_id=#rd" },
      { name: "人工智能入门指引 — 朱毅鑫老师", url: "https://yzhu.io/s/research/getting_started/" },
    ],
  },
  {
    category: "计算机入门",
    links: [
      { name: "CSDIY自学指南 - 仲殷旻学长", url: "http://csdiy.wiki/" },
      { name: "计算机系统学习推荐清单 — 游震邦学长", url: "https://www.overleaf.com/read/txqjnjxyxqqx" },
      { name: "CS61A: Structure and Interpretation of Computer Programs", url: "https://cs61a.org/" },
      { name: "The Missing Semester of Your CS Education", url: "https://missing.csail.mit.edu/" },
    ],
  },
  {
    category: "编程与算法入门",
    links: [
      { name: "CS50: Introduction to Programming with Python", url: "https://cs50.harvard.edu/python/" },
      { name: "Python编程入门教程: A Byte of Python", url: "https://python.swaroopch.com/" },
      { name: "The Python Tutorial官方文档", url: "https://docs.python.org/3/tutorial/" },
      { name: "MIT 6.006: Introduction to Algorithms", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/" },
      { name: "CS166: Advanced Data Structures", url: "https://web.stanford.edu/class/cs166/" },
      { name: "LeetCode在线编程练习平台", url: "https://leetcode.cn/" },
    ],
  },
  {
    category: "数学自学资料",
    links: [
      { name: "高等数学讲义 - 谢彦桐助教", url: "https://darkoxie.github.io/" },
      { name: "MIT 18.01SC: Single Variable Calculus", url: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/" },
      { name: "MIT 18.02SC: Multivariable Calculus", url: "https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/" },
      { name: "MIT 18.06 Linear Algebra (课程视频)", url: "https://www.youtube.com/playlist?list=PL49CF3715CB9EF31D" },
      { name: "MIT 18.06 Linear Algebra (讲义)", url: "https://rksmvv.ac.in/wp-content/uploads/2021/04/Gilbert_Strang_Linear_Algebra_and_Its_Applicatio_230928_225121.pdf" },
      { name: "Essence of Linear Algebra (3Blue1Brown)", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab" },
    ],
  },
  {
    category: "人工智能入门",
    links: [
      { name: "CS188: Artificial Intelligence", url: "https://inst.eecs.berkeley.edu/~cs188/archive/fa22/" },
      { name: "MIT 6.034: Artificial Intelligence", url: "https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/" },
      { name: "CS229: Machine Learning", url: "https://www.youtube.com/playlist?list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU" },
      { name: "CS230: Deep Learning", url: "https://www.youtube.com/playlist?list=PLoROMvodv4rOABXSygHTsbvUz4G_YQhOb" },
      { name: "CS5670: Introduction to Computer Vision", url: "https://www.cs.cornell.edu/courses/cs5670/2022sp/" },
      { name: "CS223A: Introduction to Robotics", url: "https://www.youtube.com/playlist?list=PL65CC0384A1798ADF" },
      { name: "MIT 6.4210/6.4212: Robotic Manipulation", url: "https://manipulation.csail.mit.edu" },
      { name: "Modern Robotics (Northwestern)", url: "https://modernrobotics.northwestern.edu/nu-gm-book-resource/" },
      { name: "Neural Networks (3Blue1Brown)", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi" },
    ],
  },
]

export default function ResourceLinksPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 relative">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-1/2 -translate-y-1/2 text-[5rem] md:text-[8rem] lg:text-[10rem] font-extrabold uppercase tracking-[0.15em] text-white/5 select-none pointer-events-none whitespace-nowrap leading-none" aria-hidden="true">RESOURCES</div>
          <div className="mb-4">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">自学资源</h1>
          </div>
          <p className="text-lg text-white/70 max-w-2xl">
            人工智能学习资源汇总，包括课程、书籍、论文与工具链接，由通班学术部维护更新。
          </p>
        </div>
      </section>

      <section className="bg-[hsl(211,30%,97%)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {resourceLinks.map((group) => (
              <div key={group.category}>
                <h2 className="text-xl font-extrabold text-slate-900 mb-4">{group.category}</h2>
                <div className="space-y-3">
                  {group.links.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-base font-medium text-slate-900 group-hover:text-primary transition-colors">
                          {link.name}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
