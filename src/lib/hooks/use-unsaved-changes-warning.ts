"use client"

import { useEffect } from "react"

export function useUnsavedChangesWarning(
  enabled: boolean,
  message = "当前页面有未保存的更改，确定离开吗？",
) {
  useEffect(() => {
    if (!enabled) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    const interceptLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!target) return
      const href = target.getAttribute("href")
      if (!href || href.startsWith("#") || target.getAttribute("target") === "_blank") return
      if (!window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", interceptLink, true)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", interceptLink, true)
    }
  }, [enabled, message])
}
