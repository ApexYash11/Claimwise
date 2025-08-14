"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Filter, FileText, MessageSquare, BarChart3, Upload, Calendar, Clock } from "lucide-react"
import Link from "next/link"

interface HistoryItem {
  id: string
  type: "upload" | "analysis" | "chat" | "comparison"
  title: string
  description: string
  timestamp: Date
  status: "completed" | "processing" | "failed"
  details?: {
    filesProcessed?: number
    insightsGenerated?: number
    questionsAnswered?: number
    policiesCompared?: number
  }
}

const mockHistory: HistoryItem[] = [
  {
    id: "1",
    type: "upload",
    title: "Health Insurance Policy Upload",
    description: "BlueCross BlueShield comprehensive health plan",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: "completed",
    details: { filesProcessed: 1 },
  },
  {
    id: "2",
    type: "analysis",
    title: "Multi-Policy Analysis",
    description: "Analyzed health, auto, and home insurance policies",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    status: "completed",
    details: { insightsGenerated: 5 },
  },
  {
    id: "3",
    type: "chat",
    title: "Emergency Coverage Inquiry",
    description: "Asked about emergency room coverage and copays",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: "completed",
    details: { questionsAnswered: 3 },
  },
  {
    id: "4",
    type: "comparison",
    title: "Auto Insurance Comparison",
    description: "Compared State Farm vs Geico policies",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: "completed",
    details: { policiesCompared: 2 },
  },
  {
    id: "5",
    type: "upload",
    title: "Home Insurance Policy Upload",
    description: "Allstate homeowner's insurance policy",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: "completed",
    details: { filesProcessed: 1 },
  },
  {
    id: "6",
    type: "analysis",
    title: "Coverage Gap Analysis",
    description: "Identified potential gaps in liability coverage",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: "completed",
    details: { insightsGenerated: 3 },
  },
]

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "upload":
        return Upload
      case "analysis":
        return FileText
      case "chat":
        return MessageSquare
      case "comparison":
        return BarChart3
      default:
        return FileText
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const filteredHistory = mockHistory.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || item.type === filterType
    const matchesStatus = filterStatus === "all" || item.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const groupedHistory = filteredHistory.reduce(
    (groups, item) => {
      const date = item.timestamp.toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(item)
      return groups
    },
    {} as Record<string, HistoryItem[]>,
  )

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity History</h1>
            <p className="text-lg text-gray-600">
              View your complete history of uploads, analyses, and interactions with ClaimWise.
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search activities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Activity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="upload">Uploads</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="comparison">Comparisons</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* History List */}
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {new Date(date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h2>
                </div>

                <div className="space-y-3">
                  {items.map((item) => {
                    const Icon = getActivityIcon(item.type)
                    return (
                      <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                  {item.details && (
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                      {item.details.filesProcessed && (
                                        <span>{item.details.filesProcessed} files processed</span>
                                      )}
                                      {item.details.insightsGenerated && (
                                        <span>{item.details.insightsGenerated} insights generated</span>
                                      )}
                                      {item.details.questionsAnswered && (
                                        <span>{item.details.questionsAnswered} questions answered</span>
                                      )}
                                      {item.details.policiesCompared && (
                                        <span>{item.details.policiesCompared} policies compared</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {formatDate(item.timestamp)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {filteredHistory.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || filterType !== "all" || filterStatus !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "Start by uploading your first insurance policy to see your activity history."}
                </p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href="/upload">Upload Your First Policy</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
