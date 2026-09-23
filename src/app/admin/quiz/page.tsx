import Link from "next/link";
export default function Page() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {[
        ["students", "课程账号", "导入选课名单，分配课程，激活和管理账号。"],
        ["courses", "课程与讲次", "配置课程、讲次与练习题数。"],
        ["question-banks", "私有题库", "上传题目和答案；分批校验完成后发布。"],
        ["progress", "学习进度", "查看完成记录、最新与最高成绩，导出进度。"],
      ].map(([path, title, text]) => (
        <Link
          key={path}
          href={`/admin/quiz/${path}`}
          className="rounded-xl border bg-white p-6 hover:shadow-md"
        >
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-3 text-sm text-slate-500">{text}</p>
        </Link>
      ))}
    </div>
  );
}
