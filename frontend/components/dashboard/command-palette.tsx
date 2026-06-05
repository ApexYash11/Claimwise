"use client"

import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import { Upload, FileText, MessageSquare, BarChart3, User, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState, useCallback } from "react"

const actions = [
  {
    id: "upload",
    icon: Upload,
    label: "Upload Policy",
    description: "Upload a new insurance policy",
    href: "/upload",
  },
  {
    id: "analyze",
    icon: FileText,
    label: "View Analysis",
    description: "Deep dive into policy details",
    href: "/analyze",
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "Open Chat",
    description: "Ask AI about your policies",
    href: "/chat",
  },
  {
    id: "compare",
    icon: BarChart3,
    label: "Compare Policies",
    description: "Side-by-side policy comparison",
    href: "/compare",
  },
  {
    id: "profile",
    icon: User,
    label: "Profile Settings",
    description: "Manage your account",
    href: "/profile",
  },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = useCallback(
    (item: (typeof actions)[number] | { id: string; label: string; action: () => void }) => {
      setOpen(false)
      setSearch("")
      if ("href" in item) {
        router.push(item.href)
      } else {
        item.action()
      }
    },
    [router],
  )

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [setTheme, resolvedTheme])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search actions..."
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            {actions.map((action) => (
              <Command.Item
                key={action.id}
                onSelect={() => handleSelect(action)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent"
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </div>
              </Command.Item>
            ))}
            <Command.Separator className="my-2 h-px bg-border" />
            <Command.Item
              onSelect={() => {
                toggleTheme()
                setOpen(false)
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">Toggle Theme</span>
                <span className="text-xs text-muted-foreground">Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode</span>
              </div>
            </Command.Item>
          </Command.List>
          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">esc</span> to close{" "}
            <span className="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</span> to open
          </div>
        </Command>
      </div>
    </div>
  )
}
