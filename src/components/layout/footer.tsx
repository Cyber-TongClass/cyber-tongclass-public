import { siteCopy } from "@/config/site-copy"

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-100/30">
      <div className="container-custom py-8">
        <div className="border-t border-slate-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-white font-extrabold">通</span>
              </div>
              <span className="text-sm text-slate-600">
                {siteCopy.footer.tongClassName}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              &copy; {new Date().getFullYear()} {siteCopy.footer.tongClassCopyright}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
