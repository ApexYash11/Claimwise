"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, ImageIcon, X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileWithPreview extends File {
  preview?: string
  id: string
  status: "uploading" | "success" | "error"
  progress: number
  error?: string
}

interface FileUploadProps {
  onFilesUploaded: (files: FileWithPreview[]) => void
  maxFiles?: number
  maxSize?: number
}

export function FileUpload({ onFilesUploaded, maxFiles = 5, maxSize = 10 * 1024 * 1024 }: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [error, setError] = useState("")

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError("")

      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map((file) => file.errors[0]?.message).join(", ")
        setError(errors)
        return
      }

      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      const newFiles: FileWithPreview[] = acceptedFiles.map((file) => ({
        ...file,
        id: Math.random().toString(36).substr(2, 9),
        status: "uploading" as const,
        progress: 0,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }))

      setFiles((prev) => [...prev, ...newFiles])

      // Simulate upload progress
      newFiles.forEach((file) => {
        simulateUpload(file)
      })
    },
    [files.length, maxFiles],
  )

  const simulateUpload = (file: FileWithPreview) => {
    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === file.id) {
            const newProgress = Math.min(f.progress + Math.random() * 30, 100)
            if (newProgress >= 100) {
              clearInterval(interval)
              return { ...f, progress: 100, status: "success" as const }
            }
            return { ...f, progress: newProgress }
          }
          return f
        }),
      )
    }, 200)
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== fileId)
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize,
    multiple: true,
  })

  const handleAnalyze = () => {
    const successfulFiles = files.filter((f) => f.status === "success")
    onFilesUploaded(successfulFiles)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={cn("text-center cursor-pointer transition-colors", isDragActive && "text-blue-600")}
          >
            <input {...getInputProps()} />
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isDragActive ? "Drop files here" : "Upload your insurance policies"}
            </h3>
            <p className="text-gray-600 mb-4">Drag and drop your files here, or click to browse</p>
            <p className="text-sm text-gray-500">
              Supports PDF, DOC, DOCX, TXT, and image files up to {maxSize / (1024 * 1024)}MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Uploaded Files</h4>
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      {file.type.startsWith("image/") ? (
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                      {/* Progress Bar */}
                      {file.status === "uploading" && (
                        <div className="mt-2">
                          <Progress value={file.progress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{Math.round(file.progress)}% uploaded</p>
                        </div>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {file.status === "success" && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {file.status === "error" && <AlertCircle className="w-5 h-5 text-red-600" />}
                    </div>

                    {/* Remove Button */}
                    <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} className="flex-shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analyze Button */}
          {files.some((f) => f.status === "success") && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleAnalyze}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!files.some((f) => f.status === "success")}
              >
                Analyze Policies ({files.filter((f) => f.status === "success").length})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
