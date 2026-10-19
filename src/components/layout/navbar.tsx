"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { Search, Menu, User, LogOut, Settings, BookOpen, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

const navigation = [
  { name: "关于通班", href: "/about" },
  { name: "动态", href: "/news" },
  { name: "成员", href: "/members" },
  { name: "成果", href: "/publications" },
  { name: "资源", href: "/resources" },
  { name: "课程", href: "/courses", auth: true },
  { name: "活动", href: "/events", auth: true },
  { name: "内网", href: "/intranet", auth: true, loggedInOnly: true },
]

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const resolveHref = (href: string, auth?: boolean) => {
    if (auth && !isAuthenticated) {
      return `/login?next=${encodeURIComponent(href)}`
    }
    return href
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearchOpen(false)
      setSearchQuery("")
    }
  }

  const currentUserProfileHref = currentUser ? `/members/${currentUser.username || currentUser._id}` : "/members"
  const currentUserPhoto = currentUser?.realPhoto || currentUser?.avatar

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-custom flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Tong Class logo" width={36} height={36} className="h-9 w-9 rounded-md" priority />
          <div className="hidden sm:block leading-tight">
            <p className="text-base font-semibold text-slate-900">通用人工智能实验班</p>
            <p className="text-xs text-slate-500">Tong Class</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {navigation
            .filter((item) => !(item as any).loggedInOnly || isAuthenticated)
            .map((item) => (
            <Link
              key={item.name}
              href={resolveHref(item.href, item.auth)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                pathname === item.href
                  ? "text-[hsl(350,55%,35%)] border-[hsl(350,55%,35%)]"
                  : "text-slate-500 hover:text-slate-900 border-transparent"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          <div className="hidden md:block relative">
            <form onSubmit={handleSearch}>
              <Input
                type="search"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 lg:w-64 h-9 bg-slate-100/50 border-0 focus:bg-slate-100 focus:ring-1 focus:ring-primary"
              />
              {!searchQuery && (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
              )}
            </form>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSearchOpen((open) => !open)}>
            <Search className="h-5 w-5" />
          </Button>

          {isAuthenticated && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-900"
                >
                  {currentUserPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUserPhoto}
                      alt={currentUser.englishName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    (currentUser.englishName || currentUser.username || "U").slice(0, 1).toUpperCase()
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={currentUserProfileHref}>
                    <User className="h-4 w-4 mr-2" />
                    个人主页
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/my-publications">
                    <BookOpen className="h-4 w-4 mr-2" />
                    个人学术
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    账户设置
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="h-4 w-4 mr-2" />
                      管理后台
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden md:flex gap-2">
              <Link href="/login">
                <User className="h-4 w-4" />
                登录
              </Link>
            </Button>
          )}

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-left">菜单</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-2 mt-4">
                {navigation
                  .filter((item) => !(item as any).loggedInOnly || isAuthenticated)
                  .map((item) => (
                  <Link
                    key={item.name}
                    href={resolveHref(item.href, item.auth)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 text-sm font-medium border-l-[3px] transition-colors",
                      pathname === item.href
                        ? "text-[hsl(350,55%,35%)] border-[hsl(350,55%,35%)]"
                        : "text-slate-500 hover:text-slate-900 border-transparent"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}

                {isAuthenticated && currentUser ? (
                  <>
                    <Link
                      href={currentUserProfileHref}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 border-transparent"
                    >
                      个人主页
                    </Link>
                    <Link
                      href="/my-publications"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 border-transparent"
                    >
                      个人学术
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 border-transparent"
                    >
                      账户设置
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="px-4 py-3 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 border-transparent"
                      >
                        管理后台
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        logout()
                        setIsMobileMenuOpen(false)
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      退出登录
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <User className="h-4 w-4 mr-2" />
                      登录
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isSearchOpen && (
        <div className="md:hidden border-t border-slate-200 p-4 bg-white">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Input
                type="search"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-10"
                autoFocus
              />
              {!searchQuery && (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
              )}
            </div>
          </form>
        </div>
      )}
    </header>
  )
}
