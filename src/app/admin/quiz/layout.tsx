import Link from "next/link";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">课程练习平台</h1>
        <p className="mt-2 text-slate-500">课程账号、私有题库与学习进度</p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b pb-3">
        {[
          ["", "概览"],
          ["/students", "课程账号"],
          ["/courses", "课程与讲次"],
          ["/question-banks", "题库"],
          ["/progress", "学习进度"],
        ].map(([path, label]) => (
          <Link
            key={path}
            href={`/admin/quiz${path}`}
            className="rounded-md px-3 py-2 text-sm hover:bg-slate-100"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
