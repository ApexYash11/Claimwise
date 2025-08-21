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
      const formData = new FormData()
      formData.append("policy_name", files[0].name)
      formData.append("file", files[0])
      // Get Supabase JWT
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const response = await fetch(`${API_BASE_URL}/upload-policy`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) {
        // Try to parse backend error message
        let msg = `HTTP error! status: ${response.status}`
        try {
          const err = await response.json()
          if (err && err.detail) msg = err.detail
        } catch {}
        throw new Error(msg)
      }
      const data = await response.json()
      setPolicyId(data.policy_id)
      setPolicyInfo(data)
      // Store for analyze page if needed
      if (typeof window !== "undefined") {
        localStorage.setItem("claimwise_uploaded_policy_id", data.policy_id)
        localStorage.setItem("claimwise_uploaded_policy_info", JSON.stringify(data))
      }
    } catch (e: any) {
      setError(e.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = () => {
    router.push("/analyze")
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
            {uploading && <div className="text-blue-600 mt-4">Uploading...</div>}
            {error && <div className="text-red-600 mt-4">{error}</div>}
            {policyInfo && (
              <div className="mt-4 p-4 bg-green-50 rounded">
                <div className="font-semibold">Policy Uploaded!</div>
                <div>Policy Name: {policyInfo.policy_name || uploadedFiles[0]?.name}</div>
                <div>Policy ID: {policyId}</div>
                {policyInfo.policy_number && <div>Policy Number: {policyInfo.policy_number}</div>}
                <div className="mt-2">
                  <Button onClick={handleAnalyze} className="bg-blue-600 hover:bg-blue-700">Analyze Policy</Button>
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

