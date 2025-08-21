import type React from "react"
import type { Metadata } from "next"
import { Inter, Merriweather } from "next/font/google"
import "./globals.css"

import { AuthProvider } from "@/hooks/use-auth"
import { ThemeProvider } from "next-themes"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  variable: "--font-merriweather",
})

export const metadata: Metadata = {
  title: "ClaimWise - AI-Powered Insurance Policy Analysis",
  description: "Analyze, compare, and understand your insurance policies with AI-powered insights",
  generator: "ClaimWise",
}

  export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
  <html lang="en" className={`${inter.variable} ${merriweather.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
