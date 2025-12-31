"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { createApiUrlWithLogging } from "@/lib/url-utils"
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

interface FileWithPreview extends File {
  preview?: string
  id: string
  status: "uploading" | "success" | "error"
  progress: number
  error?: string
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
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([])
  const [policyId, setPolicyId] = useState<string | null>(null)
  const [policyInfo, setPolicyInfo] = useState<any>(null)
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
    setUploadedFiles(files)
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
      const originalFile = (files[0] as any)._originalFile || files[0]
      formData.append("file", originalFile, files[0].name)
      
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      // Check for duplicates
      if (session.data.session?.user?.id) {
        const { data: existingPolicies } = await supabase
          .from('policies')
          .select('policy_name')
          .eq('user_id', session.data.session.user.id)
          .eq('policy_name', files[0].name)
        
        if (existingPolicies && existingPolicies.length > 0) {
          setError(`A policy with the name "${files[0].name}" already exists.`)
          setUploading(false)
          return
        }
      }
      
      const uploadUrl = createApiUrlWithLogging("/upload-policy");
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      setPolicyId(data.policy_id)
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

    } catch (error: any) {
      console.error("Upload error:", error)
      setError(error.message || "Failed to upload policy. Please try again.")
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
                            <div key={step.id} className="flex items-start gap-4">
                              <div className={cn(
                                "relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors duration-300",
                                isCompleted ? "bg-teal-50 border-teal-500 text-teal-600" :
                                isCurrent ? "bg-white border-blue-500 text-blue-600 animate-pulse" :
                                "bg-slate-50 border-slate-200 text-slate-300"
                              )}>
                                {isCompleted ? (
                                  <CheckCircle className="w-6 h-6" />
                                ) : (
                                  <Icon className="w-5 h-5" />
                                )}
                              </div>
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
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {policyInfo && (
                    <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
                      <Button onClick={handleAnalyze} className="bg-slate-900 text-white hover:bg-slate-800">
                        View Analysis Results
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <Lock className="h-5 w-5 text-slate-600" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">Bank-Grade Security</h3>
              <p className="text-xs text-slate-500 mt-1">Your data is encrypted at rest and in transit</p>
            </div>
            <div className="p-4">
              <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <Shield className="h-5 w-5 text-slate-600" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">Private & Confidential</h3>
              <p className="text-xs text-slate-500 mt-1">We never share your data with third parties</p>
            </div>
            <div className="p-4">
              <div className="mx-auto w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-slate-600" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">Instant Analysis</h3>
              <p className="text-xs text-slate-500 mt-1">Get results in seconds, not days</p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

