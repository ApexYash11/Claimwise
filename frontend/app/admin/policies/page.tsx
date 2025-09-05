"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, Save, X } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

import { createApiUrlWithLogging } from "@/lib/url-utils"

interface PolicyDebugInfo {
  id: string
  current_name: string
  policy_number: string
  created_at: string
  text_length: number
  is_test_data: boolean
}

export default function PolicyManagerPage() {
  const [policies, setPolicies] = useState<PolicyDebugInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState("")

  const sampleNames = [
    "StarHealth Family Insurance",
    "HDFC ERGO Car Insurance", 
    "LIC Jeevan Anand Life Policy",
    "Bajaj Allianz Home Shield",
    "Max Bupa Health Companion",
    "ICICI Lombard Motor Insurance",
    "Reliance General Health Policy",
    "SBI Life Insurance Plan",
    "Tata AIG Travel Insurance",
    "Oriental Insurance Home Plan"
  ]

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        console.error("No auth token")
        return
      }

      const debugUrl = createApiUrlWithLogging("/debug/policies");
      const response = await fetch(debugUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPolicies(data.policies)
      }
    } catch (error) {
      console.error("Error fetching policies:", error)
    } finally {
      setLoading(false)
    }
  }

  const updatePolicyName = async (policyId: string, name: string) => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) return

      const debugUrl = createApiUrlWithLogging(`/debug/update-policy-name/${policyId}?new_name=${encodeURIComponent(name)}`);
      const response = await fetch(debugUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Refresh the policies list
        fetchPolicies()
        setEditingId(null)
        setNewName("")
      }
    } catch (error) {
      console.error("Error updating policy name:", error)
    }
  }

  const startEdit = (policy: PolicyDebugInfo) => {
    setEditingId(policy.id)
    setNewName(policy.current_name || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNewName("")
  }

  const saveEdit = () => {
    if (editingId && newName.trim()) {
      updatePolicyName(editingId, newName.trim())
    }
  }

  const applySampleName = (policyId: string, index: number) => {
    const sampleName = sampleNames[index % sampleNames.length]
    updatePolicyName(policyId, sampleName)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center">Loading policies...</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Policy Name Manager</h1>
            <p className="text-gray-600">Update your policy names to display properly in the dashboard</p>
          </div>

          {/* Policies List */}
          <div className="space-y-4">
            {policies.map((policy, index) => (
              <Card key={policy.id} className="w-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Policy {policy.id.slice(0, 8)}</CardTitle>
                    <div className="flex gap-2">
                      {policy.is_test_data && (
                        <Badge variant="secondary">Test Data</Badge>
                      )}
                      <Badge variant="outline">{policy.text_length} chars</Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Current Name */}
                    <div>
                      <label className="text-sm font-medium text-gray-700">Current Name:</label>
                      {editingId === policy.id ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter new policy name"
                            className="flex-1"
                          />
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-medium">
                            {policy.current_name || "No name set"}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(policy)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Policy Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Policy Number:</span> {policy.policy_number || "Not set"}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(policy.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    {editingId !== policy.id && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Apply:</label>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => applySampleName(policy.id, index)}
                          >
                            Use Sample Name
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => applySampleName(policy.id, Math.floor(Math.random() * sampleNames.length))}
                          >
                            Random Name
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {policies.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No policies found. Upload some policies first.</p>
                <Button asChild className="mt-4">
                  <Link href="/upload">Upload Policies</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
