export type CoursePdf = {
  /** 页面上显示的自定义标题 */
  title: string
  /** PDF 放在 public/resources/tong-init-course/ 下时，从此路径开始填写 */
  href: string
  /** 可选的简短说明，例如课次或资料类型 */
  description?: string
}

/**
 * ToNG 通班人工智能科研先导课资料清单。
 *
 * 新增资料时：
 * 1. 将 PDF 上传至 public/resources/tong-init-course/；
 * 2. 在下方添加一项，并按需自定义 title。
 */
export const tongAiResearchCoursePdfs: CoursePdf[] = [
  {
    title: "第 0 讲 课件",
    description: "自学有道：文档、搜索与AI",
    href: "/resources/tong-init-course/slides-lec0.pdf",
  },
]
