"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { FileUpload } from "@/components/upload/file-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Shield, FileText, BarChart3, MessageSquare } from "lucide-react"
import Link from "next/link"


interface FileWithPreview extends File {
  preview?: string
  id: string
  status: "uploading" | "success" | "error"
  progress: number
  error?: string
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([])
  const [policyId, setPolicyId] = useState<string | null>(null)
  const [policyInfo, setPolicyInfo] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleFilesUploaded = async (files: FileWithPreview[]) => {
    setUploadedFiles(files)
    setUploading(true)
    setError("")
    try {
      if (!files || files.length === 0 || !files[0]) {
        setError("No file selected. Please upload a policy file.")
        setUploading(false)
        return
      }
      
      // Debug: log file details
      console.log("File to upload:", files[0])
      console.log("File name:", files[0].name)
      console.log("File size:", files[0].size)
      console.log("File type:", files[0].type)
      
      const formData = new FormData()
      formData.append("policy_name", files[0].name)
      // Use the original file stored in _originalFile
      const originalFile = (files[0] as any)._originalFile || files[0]
      formData.append("file", originalFile, files[0].name)
      // Get Supabase JWT
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      // Check if policy already exists
      if (session.data.session?.user?.id) {
        const { data: existingPolicies } = await supabase
          .from('policies')
          .select('policy_name')
          .eq('user_id', session.data.session.user.id)
          .eq('policy_name', files[0].name)
        
        if (existingPolicies && existingPolicies.length > 0) {
          setError(`A policy with the name "${files[0].name}" already exists. Please rename your file or delete the existing policy first.`)
          setUploading(false)
          return
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/upload-policy`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) {
        // Try to parse backend error message
        let errorMessage = `Upload failed with status ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData && errorData.detail) {
            errorMessage = errorData.detail
          } else if (errorData && typeof errorData === 'object') {
            errorMessage = JSON.stringify(errorData)
          }
        } catch (parseError) {
          // If we can't parse the error, use the status text
          errorMessage = `Upload failed: ${response.statusText || 'Unknown error'}`
        }
        throw new Error(errorMessage)
      }
      const data = await response.json()
      setPolicyId(data.policy_id)
      setPolicyInfo(data)
      // Store for analyze page - maintain list of all uploaded policies
      if (typeof window !== "undefined") {
        // Get existing policy IDs or create empty array
        const existingPolicyIds = JSON.parse(localStorage.getItem("claimwise_uploaded_policy_ids") || "[]")
        const existingPolicyInfos = JSON.parse(localStorage.getItem("claimwise_uploaded_policy_infos") || "[]")
        
        // Add new policy if not already exists
        if (!existingPolicyIds.includes(data.policy_id)) {
          existingPolicyIds.push(data.policy_id)
          existingPolicyInfos.push(data)
        }
        
        // Update localStorage with all policies
        localStorage.setItem("claimwise_uploaded_policy_ids", JSON.stringify(existingPolicyIds))
        localStorage.setItem("claimwise_uploaded_policy_infos", JSON.stringify(existingPolicyInfos))
        
        // Keep the latest policy for backward compatibility
        localStorage.setItem("claimwise_uploaded_policy_id", data.policy_id)
        localStorage.setItem("claimwise_uploaded_policy_info", JSON.stringify(data))
      }
      // Notify other parts of app to refresh dashboard stats
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("stats:refresh"))
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      let userFriendlyMessage = "Failed to upload policy. Please try again."
      
      if (error.message) {
        const errorMsg = error.message.toLowerCase()
        if (errorMsg.includes("duplicate") || errorMsg.includes("already exists")) {
          userFriendlyMessage = "This file has already been uploaded. The system will create a unique copy."
        } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
          userFriendlyMessage = "Network error. Please check your connection and try again."
        } else if (errorMsg.includes("authentication") || errorMsg.includes("unauthorized")) {
          userFriendlyMessage = "Authentication error. Please log in again."
        } else if (errorMsg.includes("file size") || errorMsg.includes("too large")) {
          userFriendlyMessage = "File is too large. Please upload a smaller file."
        } else if (error.message.length > 0 && error.message.length < 200) {
          // Show the actual error if it's not too long and seems user-friendly
          userFriendlyMessage = error.message
        }
      }
      
      setError(userFriendlyMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = () => {
    // navigate to analyze and trigger a stats refresh when returning
    router.push("/analyze")
    try {
      window.dispatchEvent(new Event("stats:refresh"))
    } catch (e) {
      // noop
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-gray-600 hover:text-gray-900">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Insurance Policies</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload your insurance documents and let our AI analyze them for comprehensive insights and
              recommendations.
            </p>
          </div>

          {/* Upload Component */}
          <div className="mb-8">
            <FileUpload onFilesUploaded={handleFilesUploaded} />
            {uploading && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div className="text-blue-700 font-medium">Uploading and analyzing your policy...</div>
                </div>
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-red-800 font-medium mb-1">Upload Error</div>
                    <div className="text-red-700 text-sm">{error}</div>
                    <button 
                      onClick={() => setError("")}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
            {policyInfo && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-green-800 font-medium mb-2">Policy Uploaded Successfully!</div>
                    <div className="space-y-1 text-sm text-green-700">
                      <div><strong>File:</strong> {policyInfo.policy_name || uploadedFiles[0]?.name}</div>
                      <div><strong>Policy ID:</strong> {policyId}</div>
                      {policyInfo.policy_number && <div><strong>Policy Number:</strong> {policyInfo.policy_number}</div>}
                    </div>
                    <div className="mt-3">
                      <Button onClick={handleAnalyze} className="bg-green-600 hover:bg-green-700 text-white">
                        Analyze Policy →
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* What Happens Next */}
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">What happens after upload?</CardTitle>
              <CardDescription>Our AI will analyze your policies and provide detailed insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Policy Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Extract key information, coverage details, and important terms from your policies.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Smart Comparison</h3>
                  <p className="text-sm text-gray-600">
                    Compare multiple policies to identify gaps, overlaps, and optimization opportunities.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">AI Insights</h3>
                  <p className="text-sm text-gray-600">
                    Get personalized recommendations and answers to your insurance questions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              <Shield className="w-4 h-4 inline mr-1" />
              Your documents are processed securely and never stored permanently on our servers.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

