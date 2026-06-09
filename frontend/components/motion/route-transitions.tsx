"use client"

import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import type { ReactNode } from "react"

export function RouteTransitions({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
