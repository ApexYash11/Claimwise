"use client"

import { useState, useEffect } from "react"
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
import { ArrowLeft, ArrowRight, Shield, FileText, CheckCircle, Zap, Lock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
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
  {
    id: "upload",
    title: "Secure Upload",
    description: "Encrypting and transferring your document",
    icon: Lock
  },
  {
    id: "scan",
    title: "OCR Scanning",
    description: "Extracting text from PDF/Images",
    icon: FileText
  },
  {
    id: "analyze",
    title: "AI Analysis",
    description: "Identifying coverage and exclusions",
    icon: Zap
  },
  {
    id: "validate",
    title: "Validation",
    description: "Cross-referencing with medical standards",
    icon: Shield
  }
]

export default function UploadPage() {
  const [policyInfo, setPolicyInfo] = useState<UploadPolicyResponse | null>(null)
  const [uploading, setUploading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState("")
  const router = useRouter()

  // Simulate progress through steps when uploading
  useEffect(() => {
    if (uploading && currentStep < PROCESSING_STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [uploading, currentStep])

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
      
      const uploadUrl = createApiUrlWithLogging("/upload-policy");
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
      
      // Complete the steps
      setCurrentStep(PROCESSING_STEPS.length)

      // Store in local storage
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

  const handleAnalyze = () => {
    router.push("/analyze")
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <PageWrapper>
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Upload Policy Document
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Securely upload your insurance policy PDF. We&apos;ll analyze it to extract coverage details and find hidden benefits.
            </p>
          </div>

          {/* Main Upload Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm mb-12">
            <CardContent className="p-8">
              {!uploading && !policyInfo ? (
                <div className="space-y-8">
                  <FileUpload onFilesUploaded={handleFilesUploaded} />
                  
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-start gap-3">
                      <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900 dark:text-red-200">Upload Failed</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Processing Steps */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">
                        {policyInfo ? "Analysis Complete" : "Processing Document..."}
                      </h3>
                      {policyInfo && (
                        <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-200">
                          Ready
                        </Badge>
                      )}
                    </div>

                    <div className="relative">
                      {/* Connecting Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />

                      <div className="space-y-8 relative">
                        {PROCESSING_STEPS.map((step, index) => {
                          const isCompleted = currentStep > index || policyInfo
                          const isCurrent = currentStep === index && !policyInfo
                          const Icon = step.icon

                          return (
                            <motion.div
                              key={step.id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.35, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                              className="flex items-start gap-4"
                            >
                              <motion.div
                                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                                transition={isCurrent ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {}}
                                className={cn(
                                  "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors duration-300",
                                  isCompleted ? "bg-teal-50 border-teal-500 text-teal-600" :
                                  isCurrent ? "bg-white border-blue-500 text-blue-600" :
                                  "bg-slate-50 border-slate-200 text-slate-300"
                                )}
                              >
                                {isCompleted ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                  >
                                    <CheckCircle className="w-6 h-6" />
                                  </motion.div>
                                ) : (
                                  <Icon className="w-5 h-5" />
                                )}
                              </motion.div>
                              <div className="pt-2">
                                <h4 className={cn(
                                  "font-medium text-sm",
                                  isCompleted || isCurrent ? "text-slate-900 dark:text-slate-100" : "text-slate-400"
                                )}>
                                  {step.title}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  {step.description}
                                </p>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {policyInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800"
                    >
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button onClick={handleAnalyze} className="bg-slate-900 text-white hover:bg-slate-800">
                          View Analysis Results
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
          >
            {[
              { icon: Lock, title: "Bank-Grade Security", desc: "Your data is encrypted at rest and in transit" },
              { icon: Shield, title: "Private & Confidential", desc: "We never share your data with third parties" },
              { icon: Zap, title: "Instant Analysis", desc: "Get results in seconds, not days" },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                className="p-4"
              >
                <motion.div
                  className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                  whileHover={{ scale: 1.1, rotate: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <item.icon className="h-5 w-5 text-slate-600" />
                </motion.div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          </PageWrapper>
        </main>
      </div>
    </ProtectedRoute>
  )
}

