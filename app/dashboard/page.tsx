"use client"

import { Plus, Search, Filter, ChevronRight, ChevronLeft, MoreVertical, Star, FileText, Copy, ThumbsUp, Calendar, Clock, BarChart4, CreditCard, DollarSign, CalendarDays, CalendarRange, CalendarCheck, Loader2, ChevronDown, ChevronUp, Printer, MessageSquare, Edit } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RequestStatusBadge from "@/components/request-status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { RequestViewDetailsDialog } from "@/components/request-view-details-dialog"
import { EvaluationDialog } from "@/components/evaluation-dialog"

// Interface for request data from MongoDB
interface RequestData {
  _id: string
  requestNumber: string
  requestTitle: string
  requestStatus: string
  priority: string
  useIoNumber: boolean
  ioCostCenter?: string
  requesterCostCenter?: string
  jsonSampleList?: string
  jsonTestingList?: string
  createdAt: string
  updatedAt: string
  completeDate?: string
  terminateDate?: string
  cancelDate?: string
  isEvaluated?: boolean
  evaluationScore?: number
  evaluationComment?: string
  evaluationDate?: string
}

// Interface for transformed request data for UI
interface UIRequest {
  id: string
  title: string
  type: string
  status: "pending" | "approved" | "rejected" | "in-progress" | "completed" | "draft" | "submitted" | "Pending Receive" | "terminated" | "cancelled"
  priority: string
  submittedDate: string
  dueDate: string
  capability: string
  progress: number
  samples: string[]
  equipment: string[]
  evaluated: boolean
  completedDate?: string
}

export default function DashboardPage() {
  // State for real request data
  const [requests, setRequests] = useState<UIRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedCapability, setSelectedCapability] = useState("all")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const requestsPerPage = 3 // Show 3 requests per page

  // State for expanded samples and equipment
  const [expandedSamples, setExpandedSamples] = useState<Record<string, boolean>>({})
  const [expandedEquipment, setExpandedEquipment] = useState<Record<string, boolean>>({})

  // State for view details dialog
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false)
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<UIRequest | null>(null)

  // State for capabilities from database
  const [capabilities, setCapabilities] = useState([
    { id: "all", label: "All" }
  ])
  const [loadingCapabilities, setLoadingCapabilities] = useState(true)

  // State for evaluation dialog
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false)
  const [selectedRequestForEvaluation, setSelectedRequestForEvaluation] = useState<UIRequest | null>(null)

  // State for user score
  const [userScore, setUserScore] = useState(0)
  const [loadingScore, setLoadingScore] = useState(true)

  // Functions to toggle expanded state
  const toggleSamples = (requestId: string) => {
    setExpandedSamples(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }))
  }

  const toggleEquipment = (requestId: string) => {
    setExpandedEquipment(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }))
  }

  // Functions for menu actions
  const handlePrintTag = (requestId: string) => {
    toast.success(`Print Tag initiated for ${requestId}`)
    // TODO: Implement actual print tag functionality
  }

  const handleComplaint = (requestId: string) => {
    toast.info(`Complaint form opened for ${requestId}`)
    // TODO: Implement actual complaint functionality
  }

  const handleEditRequest = (request: UIRequest) => {
    const requestType = request.type.toLowerCase()
    const editUrl = `/request/new/${requestType}?edit=${request.id}`

    toast.info(`Opening ${request.type} request for editing: ${request.id}`)

    // Use Next.js router for client-side navigation
    try {
      const { push } = require('next/navigation')
      push(editUrl)
    } catch (err) {
      // Fallback to window location if router is not available
      window.location.href = editUrl
    }
  }

  // Handle opening request details view
  const handleOpenRequestDetails = (request: UIRequest) => {
    setSelectedRequestForDetails(request)
    setViewDetailsDialogOpen(true)
  }

  // Handle evaluation request
  const handleEvaluateRequest = (request: UIRequest) => {
    setSelectedRequestForEvaluation(request)
    setEvaluationDialogOpen(true)
  }

  // Handle evaluation completion
  const handleEvaluationComplete = () => {
    // Refresh requests to update evaluation status
    fetchRequests()
    // Refresh user score
    fetchUserScore()
  }

  // Fetch user score from API
  const fetchUserScore = async () => {
    try {
      setLoadingScore(true)
      const response = await fetch('/api/users/score?email=admin@admin.com') // TODO: Get from auth context
      const result = await response.json()

      console.log('User score API response:', result)

      if (result.success && result.data) {
        setUserScore(result.data.score || 0) // score = totalEvaluations from UserScore table
        console.log('Updated user score:', result.data.score)
      } else {
        console.warn('Failed to fetch user score:', result.error)
        setUserScore(0) // Default to 0 if failed
      }
    } catch (err) {
      console.error('Error fetching user score:', err)
      setUserScore(0) // Default to 0 if error
    } finally {
      setLoadingScore(false)
    }
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedType, selectedCapability])

  // Function to transform MongoDB data to UI format
  const transformRequestData = (dbRequest: RequestData): UIRequest => {
    // Parse samples from JSON string
    let samples: string[] = []
    try {
      if (dbRequest.jsonSampleList) {
        const sampleData = JSON.parse(dbRequest.jsonSampleList)
        samples = sampleData.map((sample: any) => sample.generatedName || sample.name || sample.sampleIdentity || 'Unknown Sample')
      }
    } catch (e) {
      console.warn('Failed to parse sample list:', e)
    }

    // Parse testing methods from JSON string to get equipment/capability info
    let capability = "General Testing"
    let equipment: string[] = []
    try {
      if (dbRequest.jsonTestingList) {
        const testingData = JSON.parse(dbRequest.jsonTestingList)
        if (testingData.length > 0) {
          capability = testingData[0].capabilityName || "General Testing"
          // For now, use method names as equipment (can be enhanced later)
          equipment = testingData.map((test: any) => test.name || 'Unknown Equipment')
        }
      }
    } catch (e) {
      console.warn('Failed to parse testing list:', e)
    }

    // Calculate progress based on status
    const getProgress = (status: string): number => {
      switch (status.toLowerCase()) {
        case 'draft': return 5
        case 'submitted': return 15
        case 'pending receive': return 25
        case 'in-progress': return 60
        case 'completed': return 100
        case 'rejected': return 0
        case 'terminated': return 0
        case 'cancelled': return 0
        default: return 10
      }
    }

    // Determine request type from request number
    const getRequestType = (requestNumber: string): string => {
      if (requestNumber.includes('RE-N')) return 'NTR'
      if (requestNumber.includes('ASR')) return 'ASR'
      if (requestNumber.includes('ER')) return 'ER'
      return 'NTR'
    }

    return {
      id: dbRequest.requestNumber,
      title: dbRequest.requestTitle,
      type: getRequestType(dbRequest.requestNumber),
      status: dbRequest.requestStatus as any,
      priority: dbRequest.priority || 'normal',
      submittedDate: new Date(dbRequest.createdAt).toLocaleDateString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), // Default 7 days from creation
      capability,
      progress: getProgress(dbRequest.requestStatus),
      samples,
      equipment,
      evaluated: dbRequest.isEvaluated || false,
      completedDate: dbRequest.completeDate ? new Date(dbRequest.completeDate).toLocaleDateString() : undefined
    }
  }

  // Fetch capabilities from API
  const fetchCapabilities = async () => {
    try {
      setLoadingCapabilities(true)
      const response = await fetch('/api/capabilities')
      const result = await response.json()

      if (result.success && result.data) {
        console.log('Capabilities data from API:', result.data)
        // Transform capabilities data to dropdown format
        const transformedCapabilities = [
          { id: "all", label: "All" },
          ...result.data.map((capability: any) => ({
            id: capability._id,
            label: capability.capabilityName
          }))
        ]
        setCapabilities(transformedCapabilities)
      } else {
        throw new Error(result.error || 'Failed to fetch capabilities')
      }
    } catch (err) {
      console.error('Error fetching capabilities:', err)
      // Keep default capabilities as fallback
      setCapabilities([
        { id: "all", label: "All" },
        { id: "microstructure", label: "Microstructure" },
        { id: "rheology", label: "Rheology" },
        { id: "mechanical", label: "Mechanical Testing" },
        { id: "thermal", label: "Thermal Analysis" },
        { id: "microscopy", label: "Microscopy" },
        { id: "barrier", label: "Barrier Properties" },
        { id: "surface", label: "Surface Analysis" },
      ])
    } finally {
      setLoadingCapabilities(false)
    }
  }

  // Fetch requests from API
  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/requests')
      const result = await response.json()

      if (result.success && result.data) {
        console.log('Raw data from API:', result.data)
        const transformedRequests = result.data.map(transformRequestData)
        console.log('Transformed requests:', transformedRequests)
        setRequests(transformedRequests)
      } else {
        throw new Error(result.error || 'Failed to fetch requests')
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch requests')
      toast.error('Failed to load requests from database')
      // Use sample data as fallback
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  // Load requests, capabilities, and user score on component mount
  useEffect(() => {
    fetchRequests()
    fetchCapabilities()
    fetchUserScore()
  }, [])

  // Calculate summary statistics from real data
  const calculateSummary = () => {
    const currentYear = new Date().getFullYear()
    // Parse dates more carefully and handle different date formats
    const ytdRequests = requests.filter(req => {
      try {
        const reqDate = new Date(req.submittedDate)
        return reqDate.getFullYear() === currentYear
      } catch (e) {
        console.warn('Failed to parse date:', req.submittedDate)
        return true // Include if we can't parse the date
      }
    })

    return {
      ytdTotal: requests.length, // Show all requests for now
      inProgress: requests.filter(req => req.status === 'in-progress' || req.status === 'Pending Receive').length,
      completed: requests.filter(req => req.status === 'completed').length,
      terminated: requests.filter(req => req.status === 'terminated' || req.status === 'cancelled' || req.status === 'rejected').length
    }
  }

  const summary = calculateSummary()

  // Filter and search logic
  const filteredRequests = requests.filter(request => {
    // Search filter - search in ID, title, and samples
    const matchesSearch = searchTerm === "" ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.samples.some(sample => sample.toLowerCase().includes(searchTerm.toLowerCase()))

    // Type filter
    const matchesType = selectedType === "all" ||
      request.type.toLowerCase() === selectedType.toLowerCase()

    // Capability filter - match by capability name
    const matchesCapability = selectedCapability === "all" || (() => {
      // Find the selected capability object to get its label
      const selectedCapabilityObj = capabilities.find(cap => cap.id === selectedCapability)
      if (!selectedCapabilityObj) return true

      // Match by capability name (case insensitive)
      return request.capability.toLowerCase().includes(selectedCapabilityObj.label.toLowerCase())
    })()

    return matchesSearch && matchesType && matchesCapability
  })

  // Pagination functions
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage)
  const startIndex = (currentPage - 1) * requestsPerPage
  const endIndex = startIndex + requestsPerPage
  const currentRequests = filteredRequests.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Clear filters function
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedType("all")
    setSelectedCapability("all")
  }

  // Get filter counts for display
  const getFilterCounts = () => {
    return {
      all: requests.length,
      ntr: requests.filter(r => r.type === 'NTR').length,
      asr: requests.filter(r => r.type === 'ASR').length,
      er: requests.filter(r => r.type === 'ER').length
    }
  }

  const filterCounts = getFilterCounts()

  const notifications = [
    {
      id: 1,
      message: "Your request NTR-2023-0123 has been assigned to an operator",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      message: "Results for NTR-2023-0120 are now available",
      timestamp: "1 day ago",
      read: false,
    },
    {
      id: 3,
      message: "Your ASR-2023-0087 has been approved by the capability head",
      timestamp: "2 days ago",
      read: true,
    },
  ]

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-orange-500"
      case "in-progress":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "delayed":
        return "bg-red-500"
      case "terminated":
        return "bg-gray-500"
      case "approved":
        return "bg-green-500"
      case "rejected":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // IO Numbers for filter
  const ioNumbers = [
    { id: "all", label: "Select all" },
    { id: "non-io", label: "Non-IO" },
    { id: "100060001234", label: "100060001234" },
    { id: "100060005678", label: "100060005678" },
  ]

  // Capabilities are now loaded from database via state

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center space-x-2 text-lg font-medium">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <span>Score:</span>
            {loadingScore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="font-bold text-yellow-600">
                {userScore} evaluations
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3 space-y-4">
            {/* Filter Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IO Filter Card */}
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center">
                  <div className="mr-2 p-1.5 rounded-full bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-bold text-blue-800">My IO</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {ioNumbers.map((io) => (
                      <div
                        key={io.id}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                          io.id === "all"
                            ? "bg-blue-500 text-white"
                            : "bg-white hover:bg-blue-100 border border-blue-200"
                        } transition-colors cursor-pointer`}
                      >
                        <Checkbox
                          id={`io-${io.id}`}
                          defaultChecked={io.id === "all"}
                          className={io.id === "all" ? "text-white border-white" : ""}
                        />
                        <label
                          htmlFor={`io-${io.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {io.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Date Period Filter Card */}
              <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 overflow-hidden">
                <CardHeader className="pb-2 flex flex-row items-center">
                  <div className="mr-2 p-1.5 rounded-full bg-amber-100">
                    <CalendarRange className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="text-lg font-bold text-amber-800">Select Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 bg-white p-2 rounded-md border border-amber-200">
                        <CalendarDays className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">From</span>
                        <Input type="date" className="w-40 border-amber-200 focus-visible:ring-amber-400" />
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-md border border-amber-200">
                        <CalendarCheck className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">To</span>
                        <Input type="date" className="w-40 border-amber-200 focus-visible:ring-amber-400" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="bg-white border-amber-200 text-amber-800 hover:bg-amber-100 hover:text-amber-900">
                        <Clock className="mr-2 h-4 w-4" />
                        Past 30 days
                      </Button>
                      <Button variant="outline" className="bg-white border-amber-200 text-amber-800 hover:bg-amber-100 hover:text-amber-900">
                        <Calendar className="mr-2 h-4 w-4" />
                        Past 3 months
                      </Button>
                      <Button variant="outline" className="bg-white border-amber-200 text-amber-800 hover:bg-amber-100 hover:text-amber-900">
                        <BarChart4 className="mr-2 h-4 w-4" />
                        This Year
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Request Summary */}
              <div className="md:col-span-4">
                <Card className="h-full bg-gradient-to-r from-green-50 to-teal-50 border-green-200 overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center">
                    <div className="mr-2 p-1.5 rounded-full bg-green-100">
                      <BarChart4 className="h-5 w-5 text-green-600" />
                    </div>
                    <CardTitle className="text-lg font-bold text-green-800">My REQUEST SUMMARY</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-white border border-green-200 rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-lg font-medium text-green-800">YTD {new Date().getFullYear()}</div>
                        <div className="text-3xl font-bold text-green-900">{loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : summary.ytdTotal}</div>
                        <div className="text-sm text-green-700">Total Requests</div>
                      </div>
                      <div className="bg-white border border-yellow-200 rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-lg font-medium text-yellow-800">In-progress</div>
                        <div className="text-3xl font-bold text-yellow-900">{loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : summary.inProgress}</div>
                        <div className="text-sm text-yellow-700">Active Requests</div>
                      </div>
                      <div className="bg-white border border-blue-200 rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-lg font-medium text-blue-800">Complete</div>
                        <div className="text-3xl font-bold text-blue-900">{loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : summary.completed}</div>
                        <div className="text-sm text-blue-700">Finished</div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-lg font-medium text-gray-800">Terminate</div>
                        <div className="text-3xl font-bold text-gray-900">{loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto" /> : summary.terminated}</div>
                        <div className="text-sm text-gray-700">Closed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Expense Card */}
              <div className="md:col-span-1">
                <Card className="h-full bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center">
                    <div className="mr-2 p-1.5 rounded-full bg-purple-100">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg font-bold text-purple-800">EXPENSE</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-3 bg-white p-3 rounded-lg border border-purple-200">
                      <div className="text-center">
                        <div className="text-sm font-medium text-purple-700">Plan</div>
                        <div className="text-xl font-bold text-purple-900">
                          2.5 <span className="text-sm font-normal">MTHB</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-purple-700">Spending</div>
                        <div className="text-xl font-bold text-purple-900">
                          1.8 <span className="text-sm font-normal">MTHB</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-purple-200">
                      <Progress value={72} className="h-3 w-full bg-purple-100" />
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs font-medium text-purple-700">0 MTHB</div>
                        <div className="text-xs font-medium text-purple-900">72% of budget used</div>
                        <div className="text-xs font-medium text-purple-700">2.5 MTHB</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
          <div className="md:w-2/3">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My REQUESTs</CardTitle>
                  <CardDescription>Track and manage your recent test requests</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href="/request/new">
                    <Button className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
                      <Plus className="mr-2 h-4 w-4" />
                      New Request
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by ID, title, or samples..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={showAdvancedFilters ? "bg-blue-50 border-blue-200" : ""}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  {(searchTerm || selectedType !== "all" || selectedCapability !== "all") && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex justify-between items-center mb-4">
                  <Tabs value={selectedType} onValueChange={setSelectedType} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="all">
                        All ({filterCounts.all})
                      </TabsTrigger>
                      <TabsTrigger value="ntr">
                        NTR ({filterCounts.ntr})
                      </TabsTrigger>
                      <TabsTrigger value="asr">
                        ASR ({filterCounts.asr})
                      </TabsTrigger>
                      <TabsTrigger value="er">
                        ER ({filterCounts.er})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <Select value={selectedCapability} onValueChange={setSelectedCapability} disabled={loadingCapabilities}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={loadingCapabilities ? "Loading..." : "Select capability"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCapabilities ? (
                        <SelectItem value="loading" disabled>Loading capabilities...</SelectItem>
                      ) : (
                        capabilities.map((capability) => (
                          <SelectItem key={capability.id} value={capability.id}>
                            {capability.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Advanced Filters</h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowAdvancedFilters(false)}>
                        ×
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                        <Select>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="Pending Receive">Pending Receive</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                        <Select>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All priorities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All priorities</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Range</label>
                        <Select>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All time</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This week</SelectItem>
                            <SelectItem value="month">This month</SelectItem>
                            <SelectItem value="quarter">This quarter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Summary */}
                {(searchTerm || selectedType !== "all" || selectedCapability !== "all") && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm">
                      <span className="font-medium">{filteredRequests.length}</span> of <span className="font-medium">{requests.length}</span> requests match your filters
                    </div>
                    {filteredRequests.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        Try adjusting your search or filters
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading requests from database...</span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <div className="text-red-600 mb-2">Failed to load requests</div>
                      <div className="text-sm text-muted-foreground mb-4">{error}</div>
                      <Button onClick={fetchRequests} variant="outline">
                        Try Again
                      </Button>
                    </div>
                  ) : currentRequests.length === 0 ? (
                    <div className="text-center py-8">
                      {(searchTerm || selectedType !== "all" || selectedCapability !== "all") ? (
                        <div>
                          <div className="text-muted-foreground mb-4">
                            No requests match your current filters
                          </div>
                          <div className="space-x-2">
                            <Button variant="outline" onClick={clearFilters}>
                              Clear Filters
                            </Button>
                            <Link href="/request/new">
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Request
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-muted-foreground mb-4">No requests found</div>
                          <Link href="/request/new">
                            <Button>
                              <Plus className="mr-2 h-4 w-4" />
                              Create Your First Request
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    currentRequests.map((request) => (
                    <div key={request.id} className="flex flex-col space-y-2 rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{request.id}</span>
                            <RequestStatusBadge status={request.status} />
                            {request.priority === "high" && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                High Priority
                              </span>
                            )}
                            {request.evaluated && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Evaluated</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <span className="text-sm font-medium">{request.title}</span>

                          <div className="mt-2 space-y-3">
                            {/* Samples Section with Expandable Button */}
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Samples</span>
                                {request.samples.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleSamples(request.id)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    {expandedSamples[request.id] ? (
                                      <>
                                        Hide <ChevronUp className="ml-1 h-3 w-3" />
                                      </>
                                    ) : (
                                      <>
                                        Show All ({request.samples.length}) <ChevronDown className="ml-1 h-3 w-3" />
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1 mt-1">
                                {expandedSamples[request.id] ? (
                                  // Show all samples when expanded
                                  request.samples.map((sample, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                    >
                                      {sample}
                                    </span>
                                  ))
                                ) : (
                                  // Show limited samples when collapsed
                                  <>
                                    {request.samples.slice(0, 2).map((sample, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                      >
                                        {sample}
                                      </span>
                                    ))}
                                    {request.samples.length > 2 && (
                                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                        +{request.samples.length - 2} more
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Equipment Section with Expandable Button */}
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Equipment</span>
                                {request.equipment.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleEquipment(request.id)}
                                    className="h-6 px-2 text-xs"
                                  >
                                    {expandedEquipment[request.id] ? (
                                      <>
                                        Hide <ChevronUp className="ml-1 h-3 w-3" />
                                      </>
                                    ) : (
                                      <>
                                        Show All ({request.equipment.length}) <ChevronDown className="ml-1 h-3 w-3" />
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1 mt-1">
                                {expandedEquipment[request.id] ? (
                                  // Show all equipment when expanded
                                  request.equipment.map((equipment, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10"
                                    >
                                      {equipment}
                                    </span>
                                  ))
                                ) : (
                                  // Show limited equipment when collapsed
                                  <>
                                    {request.equipment.slice(0, 2).map((equipment, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10"
                                      >
                                        {equipment}
                                      </span>
                                    ))}
                                    {request.equipment.length > 2 && (
                                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                        +{request.equipment.length - 2} more
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                            <span>Submitted: {request.submittedDate}</span>
                            <span>Due: {request.dueDate}</span>
                            {request.completedDate && <span>Completed: {request.completedDate}</span>}
                            <span>Capability: {request.capability}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {!request.evaluated && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                              onClick={() => handleEvaluateRequest(request)}
                            >
                              <ThumbsUp className="mr-2 h-4 w-4" />
                              Evaluate
                            </Button>
                          )}

                          {/* Show star icon for evaluated requests */}
                          {request.evaluated && (
                            <div className="flex items-center text-yellow-500">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="text-xs ml-1 text-muted-foreground">Evaluated</span>
                            </div>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg">
                              <DropdownMenuItem onClick={() => handleOpenRequestDetails(request)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintTag(request.id)}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Tag
                              </DropdownMenuItem>
                              {/* Edit Request - Only show for Pending Receive status */}
                              {request.status === "Pending Receive" && (
                                <DropdownMenuItem onClick={() => handleEditRequest(request)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Request
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Star className="mr-2 h-4 w-4" />
                                Set as a request template
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate Request
                              </DropdownMenuItem>
                              {/* Evaluate my Request - Show for all requests that haven't been evaluated */}
                              {!request.evaluated && (
                                <DropdownMenuItem onClick={() => handleEvaluateRequest(request)} className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50">
                                  <ThumbsUp className="mr-2 h-4 w-4" />
                                  Evaluate my Request
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleComplaint(request.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Complaint
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-medium">Progress</span>
                          <span>{request.progress}%</span>
                        </div>
                        <Progress value={request.progress} className="h-2 w-full" />
                      </div>
                    </div>
                    ))
                  )}

                  {/* Pagination Controls */}
                  {!loading && !error && filteredRequests.length > requestsPerPage && (
                    <div className="flex items-center justify-center space-x-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="flex items-center"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className={`w-8 h-8 p-0 ${
                              currentPage === page
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Show pagination info */}
                  {!loading && !error && filteredRequests.length > 0 && (
                    <div className="text-center text-sm text-muted-foreground mt-4">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="md:w-1/3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Stay updated on your request status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start space-x-4 rounded-lg p-3 ${
                        notification.read ? "bg-background" : "bg-blue-50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-2 w-2 rounded-full ${notification.read ? "bg-transparent" : "bg-blue-500"}`}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
                      </div>
                      {!notification.read && (
                        <Button variant="outline" size="sm" className="ml-auto">
                          Got It
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    View All Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Request details view dialog */}
      {selectedRequestForDetails && (
        <RequestViewDetailsDialog
          requestId={selectedRequestForDetails.id}
          open={viewDetailsDialogOpen}
          onOpenChange={setViewDetailsDialogOpen}
        />
      )}

      {/* Evaluation dialog */}
      {selectedRequestForEvaluation && (
        <EvaluationDialog
          open={evaluationDialogOpen}
          onOpenChange={setEvaluationDialogOpen}
          requestId={selectedRequestForEvaluation.id}
          requestTitle={selectedRequestForEvaluation.title}
          userEmail="user@example.com" // TODO: Get from auth context
          onEvaluationComplete={handleEvaluationComplete}
        />
      )}
    </DashboardLayout>
  )
}
