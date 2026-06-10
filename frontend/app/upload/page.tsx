"use client"

import { useState } from "react"
import { getSupabase } from "@/lib/get-supabase"
import { createApiUrlWithLogging } from "@/lib/url-utils"
import { fetchWithTimeout } from "@/lib/fetch-with-timeout"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { FileUpload } from "@/components/upload/file-upload"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Shield, FileText, CheckCircle, Zap, Lock, ScrollText, BarChart3 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { PageWrapper } from "@/components/motion/page-wrapper"

interface FileWithPreview extends File {
  preview?: string
  id: string
  status: "uploading" | "success" | "error"
  progress: number
  error?: string
  _originalFile?: File
}

interface UploadPolicyResponse {
  policy_id: string
  extracted_text?: string
  status?: string
  indexing_mode?: string
}

const PROCESSING_STEPS = [
  { id: "upload", title: "Secure Upload", description: "Encrypting and transferring your document", icon: Lock },
  { id: "scan", title: "OCR Extraction", description: "Extracting text and structure", icon: FileText },
  { id: "analyze", title: "AI Analysis", description: "Scoring coverage and surfacing risks", icon: Zap },
  { id: "validate", title: "Validation", description: "Cross-referencing clauses", icon: Shield },
]

export default function UploadPage() {
  const [policyInfo, setPolicyInfo] = useState<UploadPolicyResponse | null>(null)
  const [uploading, setUploading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleFilesUploaded = async (files: FileWithPreview[]) => {
    setUploading(true)
    setCurrentStep(0)
    setError("")

    try {
      if (!files || files.length === 0 || !files[0]) {
        setError("No file selected. Please upload a policy file.")
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append("policy_name", files[0].name)
      const originalFile = files[0]._originalFile || files[0]
      formData.append("file", originalFile, files[0].name)

      const supabase = await getSupabase()
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      setCurrentStep(1)

      const uploadUrl = createApiUrlWithLogging("/upload-policy")
      const response = await fetchWithTimeout(uploadUrl, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeoutMs: 20000,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 409) {
          setError(`A policy with the name "${files[0].name}" already exists.`)
          setUploading(false)
          return
        }
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`)
      }

      const data = (await response.json()) as UploadPolicyResponse
      setPolicyInfo(data)
      setCurrentStep(PROCESSING_STEPS.length)

      if (typeof window !== "undefined") {
        const existingPolicyIds = JSON.parse(localStorage.getItem("claimwise_uploaded_policy_ids") || "[]")
        const existingPolicyInfos = JSON.parse(localStorage.getItem("claimwise_uploaded_policy_infos") || "[]")
        if (!existingPolicyIds.includes(data.policy_id)) {
          existingPolicyIds.push(data.policy_id)
          existingPolicyInfos.push(data)
        }
        localStorage.setItem("claimwise_uploaded_policy_ids", JSON.stringify(existingPolicyIds))
        localStorage.setItem("claimwise_uploaded_policy_infos", JSON.stringify(existingPolicyInfos))
        localStorage.setItem("claimwise_uploaded_policy_id", data.policy_id)
        localStorage.setItem("claimwise_uploaded_policy_info", JSON.stringify(data))
        window.dispatchEvent(new Event("stats:refresh"))
      }
    } catch (error: unknown) {
      console.error("Upload error:", error)
      setError(error instanceof Error ? error.message : "Failed to upload policy. Please try again.")
      setUploading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <PageWrapper>
          <main className="page-container-narrow py-8 space-y-8">
            <div>
              <Button variant="ghost" asChild className="text-muted-foreground">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>

            <div className="text-center max-w-2xl mx-auto">
              <h1>Upload Policy Document</h1>
              <p className="mt-2 text-muted-foreground">
                Upload a PDF, DOC, or image. We will extract, analyze, and surface coverage insights.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
              <Card>
                <CardContent className="p-6">
                  {!uploading && !policyInfo ? (
                    <div className="space-y-6">
                      <FileUpload onFilesUploaded={handleFilesUploaded} />
                      {error && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
                          <Shield className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-destructive">Upload Failed</p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">
                            {policyInfo ? "Analysis Complete" : "Processing Document..."}
                          </h3>
                          {policyInfo && (
                            <Badge variant="outline" className="bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.2)]">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                        </div>

                        <div className="relative">
                          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                          <div className="space-y-8 relative">
                            {PROCESSING_STEPS.map((step, index) => {
                              const isCompleted = currentStep > index || policyInfo
                              const isCurrent = currentStep === index && !policyInfo
                              const Icon = step.icon
                              return (
                                <div key={step.id} className="flex items-start gap-4">
                                  <div
                                    className={cn(
                                      "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border transition-colors",
                                      isCompleted
                                        ? "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success))] text-[hsl(var(--success))]"
                                        : isCurrent
                                          ? "bg-card border-foreground text-foreground"
                                          : "bg-muted/40 border-border text-muted-foreground",
                                    )}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle className="h-5 w-5" />
                                    ) : (
                                      <Icon className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="pt-1.5">
                                    <p className={cn("text-sm font-medium", isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground")}>
                                      {step.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {policyInfo && (
                        <div className="flex justify-end pt-4 border-t">
                          <Button onClick={() => router.push("/analyze")}>
                            View Analysis Results
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">What happens next</p>
                  <div className="space-y-3">
                    {[
                      { icon: ScrollText, label: "Clause extraction" },
                      { icon: Shield, label: "Risk & exclusion detection" },
                      { icon: BarChart3, label: "Coverage scoring" },
                      { icon: Zap, label: "Optimization recommendations" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Security</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      Encrypted at rest & in transit
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" />
                      SOC 2 compliant infrastructure
                    </div>
                  </div>
                </div>

                <Link href="/signup?sample=true">
                  <Button variant="outline" className="w-full justify-start text-sm font-normal">
                    <FileText className="h-4 w-4 mr-2" />
                    Try with a sample policy instead
                  </Button>
                </Link>
              </div>
            </div>
          </main>
        </PageWrapper>
      </div>
    </ProtectedRoute>
  )
}
