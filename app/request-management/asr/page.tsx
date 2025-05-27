"use client"

import React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Clock,
  Search,
  FileText,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowUpDown,
  ChevronLeft,
  Bell,
  Calendar,
  BarChart3,
  Beaker,
  FlaskConical,
  Microscope,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  Layers,
  Users,
  MoreHorizontal,
  Check,
  X,
  ChevronRight,
  RefreshCw,
  Loader2,
  PackageOpen,
} from "lucide-react"

// Import Capability related data
import CAPABILITY_CATEGORIES, {
  getCapabilityIcon,
  matchCapabilityToCategory
} from "@/models/Capability.ts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { RequestSummaryDialog } from "@/components/request-summary-dialog"
import { RequestStatusBadge } from "@/components/request-status-badge"
import { SampleReceiveDialog } from "@/components/sample-receive-dialog"
import { RequestViewDetailsDialog } from "@/components/request-view-details-dialog"
import { toast } from "sonner"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

// Type mapping component
const RequestTypeBadge = ({ type }: { type: string }) => {
  switch (type) {
    case "NTR":
      return <Badge variant="outline" className="bg-blue-50 text-blue-800 hover:bg-blue-50 border-blue-200">NTR</Badge>
    case "ASR":
      return <Badge variant="outline" className="bg-purple-50 text-purple-800 hover:bg-purple-50 border-purple-200">ASR</Badge>
    case "ER":
      return <Badge variant="outline" className="bg-green-50 text-green-800 hover:bg-green-50 border-green-200">ER</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default function ASRRequestManagementPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [capabilityFilter, setCapabilityFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRequests, setSelectedRequests] = useState<string[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  // Loading states
  const [loading, setLoading] = useState(true)
  const [batchActionLoading, setBatchActionLoading] = useState(false)

  // State for storing requests from API
  const [requests, setRequests] = useState<any[]>([])

  // Capabilities from API
  const [capabilities, setCapabilities] = useState<any[]>([])
  const [capabilityCounts, setCapabilityCounts] = useState<Record<string, number>>({})

  // Status counts
  const [pendingCount, setPendingCount] = useState(0)
  const [inProgressCount, setInProgressCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [terminatedCount, setTerminatedCount] = useState(0)

  // Fetch requests from API
  const fetchRequests = async () => {
    setLoading(true)
    try {
      console.log('Fetching ASR requests with filters:', {
        status: statusFilter,
        priority: priorityFilter,
        capability: capabilityFilter,
        type: 'asr',
        search: searchQuery,
        page: currentPage
      });

      const response = await fetch(
        `/api/requests/manage?status=${encodeURIComponent(statusFilter)}&priority=${priorityFilter}&capability=${capabilityFilter}&type=asr&search=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=${pageSize}`
      )
      const data = await response.json()

      if (data.success) {
        // Get basic request data
        const requestsData = data.data || [];

        // For pending receive requests, fetch the sample counts
        if (statusFilter === "pending receive sample" && requestsData.length > 0) {
          const requestsWithSampleCounts = await Promise.all(
            requestsData.map(async (request) => {
              try {
                const samplesResponse = await fetch(`/api/requests/samples?requestId=${request.id}`);
                const samplesData = await samplesResponse.json();

                if (samplesData.success) {
                  const samples = samplesData.data || [];
                  const totalSamples = samples.length;
                  const receivedSamples = samples.filter(
                    (sample) => sample.status !== "Pending Receive"
                  ).length;

                  return {
                    ...request,
                    samplesReceived: receivedSamples,
                    samplesTotal: totalSamples
                  };
                }
                return request;
              } catch (error) {
                console.error(`Error fetching samples for request ${request.id}:`, error);
                return request;
              }
            })
          );

          setRequests(requestsWithSampleCounts);
        } else {
          setRequests(requestsData);
        }

        setTotalPages(data.pagination.pages || 1)
        setTotalCount(data.pagination.total || 0)

        // Update capabilities data
        if (data.capabilities) {
          setCapabilities(data.capabilities)
        }

        // Update capability counts
        if (data.capabilityCounts) {
          setCapabilityCounts(data.capabilityCounts)
        }
      } else {
        console.error("Failed to fetch requests:", data.error)
        toast.error("Failed to fetch requests")
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Error fetching requests")
    } finally {
      setLoading(false)
    }
  }

  // Fetch status counts
  const fetchStatusCounts = async () => {
    try {
      const pendingResponse = await fetch(`/api/requests/manage?status=pending receive sample&type=asr&limit=1`)
      const inProgressResponse = await fetch(`/api/requests/manage?status=in-progress&type=asr&limit=1`)
      const completedResponse = await fetch(`/api/requests/manage?status=completed&type=asr&limit=1`)
      const rejectedResponse = await fetch(`/api/requests/manage?status=rejected&type=asr&limit=1`)
      const terminatedResponse = await fetch(`/api/requests/manage?status=terminated&type=asr&limit=1`)

      const pendingData = await pendingResponse.json()
      const inProgressData = await inProgressResponse.json()
      const completedData = await completedResponse.json()
      const rejectedData = await rejectedResponse.json()
      const terminatedData = await terminatedResponse.json()

      setPendingCount(pendingData.pagination?.total || 0)
      setInProgressCount(inProgressData.pagination?.total || 0)
      setCompletedCount(completedData.pagination?.total || 0)
      setRejectedCount(rejectedData.pagination?.total || 0)
      setTerminatedCount(terminatedData.pagination?.total || 0)
    } catch (error) {
      console.error("Error fetching status counts:", error)
      // If API fails, show counts based on current filtered requests
      if (requests.length > 0) {
        setPendingCount(requests.filter(req => req.status.toLowerCase().includes('pending')).length)
        setInProgressCount(requests.filter(req => req.status.toLowerCase().includes('in-progress')).length)
        setCompletedCount(requests.filter(req => req.status.toLowerCase().includes('completed')).length)
        setRejectedCount(requests.filter(req => req.status.toLowerCase().includes('rejected')).length)
        setTerminatedCount(requests.filter(req => req.status.toLowerCase().includes('terminated')).length)
      }
    }
  }

  // Fetch data when filters change
  useEffect(() => {
    fetchRequests()
    fetchStatusCounts()
  }, [statusFilter, priorityFilter, capabilityFilter, currentPage, pageSize])

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRequests()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Filter requests based on active tab (request type)
  const displayRequests = requests

  // Check if we should show checkboxes (when filtering by pending, in-progress, or completed)
  const showCheckboxes = statusFilter === "pending receive sample" || statusFilter === "in-progress" || statusFilter === "completed"

  // Handle checkbox selection
  const toggleSelectRequest = (id: string) => {
    setSelectedRequests((prev) => (prev.includes(id) ? prev.filter((requestId) => requestId !== id) : [...prev, id]))
  }

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedRequests.length === displayRequests.length) {
      setSelectedRequests([])
    } else {
      setSelectedRequests(displayRequests.map((req) => req.id))
    }
  }

  // Handle batch actions
  const handleBatchAction = async (action: string) => {
    if (selectedRequests.length === 0) return

    setBatchActionLoading(true)
    try {
      // Determine the new status based on the action
      const newStatus = action === "receive" ? "in-progress" :
                          action === "complete" ? "completed" :
                          action === "approve" ? "approved" :
                          action === "reject" ? "rejected" : ""

      if (!newStatus) {
        toast.error("Invalid action")
        return
      }

      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedRequests,
          status: newStatus,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Successfully updated ${data.data.totalUpdated} requests to ${newStatus}`)

        // Immediately update local state to reflect the change
        setRequests(
          requests.map(req =>
            selectedRequests.includes(req.id) ? { ...req, status: newStatus } : req
          )
        )

        // Update status counts based on the action
        if (action === "receive") {
          setPendingCount(prev => Math.max(0, prev - selectedRequests.length))
          setInProgressCount(prev => prev + selectedRequests.length)
        } else if (action === "complete") {
          setInProgressCount(prev => Math.max(0, prev - selectedRequests.length))
          setCompletedCount(prev => prev + selectedRequests.length)
        } else if (action === "reject") {
          setRejectedCount(prev => prev + selectedRequests.length)
        }

        setSelectedRequests([])
        fetchRequests()
        fetchStatusCounts()
      } else {
        throw new Error(data.error || "Failed to update requests")
      }
    } catch (error) {
      console.error(`Error performing batch action (${action}):`, error)
      toast.error("An error occurred while updating requests")
    } finally {
      setBatchActionLoading(false)
    }
  }

  const handleReceiveAll = () => handleBatchAction("receive")
  const handleCompleteAll = () => handleBatchAction("complete")
  const handleApproveAll = () => handleBatchAction("approve")
  const handleRejectAll = () => handleBatchAction("reject")

  // Handle opening request summary
  const handleOpenRequestSummary = (request: any) => {
    setSelectedRequest(request)
    setSummaryDialogOpen(true)
  }

  // Handle opening request details view
  const handleOpenRequestDetails = (e: React.MouseEvent, request: any) => {
    e.stopPropagation()
    setSelectedRequest(request)
    setViewDetailsDialogOpen(true)
  }

  // Handle status change from the summary dialog
  const handleStatusChange = (requestId: string, newStatus: string) => {
    // Update in local state
    setRequests(requests.map((req) => (req.id === requestId ? { ...req, status: newStatus } : req)))

    // Update counts based on status change
    const request = requests.find(req => req.id === requestId)
    if (request) {
      const oldStatus = request.status

      // Decrement old status count
      if (oldStatus.toLowerCase().includes('pending')) {
        setPendingCount(prev => Math.max(0, prev - 1))
      } else if (oldStatus.toLowerCase().includes('in-progress')) {
        setInProgressCount(prev => Math.max(0, prev - 1))
      } else if (oldStatus.toLowerCase().includes('completed')) {
        setCompletedCount(prev => Math.max(0, prev - 1))
      } else if (oldStatus.toLowerCase().includes('rejected')) {
        setRejectedCount(prev => Math.max(0, prev - 1))
      } else if (oldStatus.toLowerCase().includes('terminated')) {
        setTerminatedCount(prev => Math.max(0, prev - 1))
      }

      // Increment new status count
      if (newStatus.toLowerCase().includes('pending')) {
        setPendingCount(prev => prev + 1)
      } else if (newStatus.toLowerCase().includes('in-progress')) {
        setInProgressCount(prev => prev + 1)
      } else if (newStatus.toLowerCase().includes('completed')) {
        setCompletedCount(prev => prev + 1)
      } else if (newStatus.toLowerCase().includes('rejected')) {
        setRejectedCount(prev => prev + 1)
      } else if (newStatus.toLowerCase().includes('terminated')) {
        setTerminatedCount(prev => prev + 1)
      }
    }
  }

  // Capability icon component
  const CapabilityIcon = ({ capability }: { capability: string }) => {
    if (!capability) return <Beaker className="h-4 w-4 text-gray-600" />;

    const iconName = getCapabilityIcon(capability);

    switch (iconName) {
      case "Layers":
        return <Layers className="h-4 w-4 text-blue-600" />;
      case "Microscope":
        return <Microscope className="h-4 w-4 text-purple-600" />;
      case "FlaskConical":
        return <FlaskConical className="h-4 w-4 text-orange-600" />;
      case "BarChart3":
        return <BarChart3 className="h-4 w-4 text-orange-600" />;
      case "Beaker":
      default:
        return <Beaker className="h-4 w-4 text-green-600" />;
    }
  }

  // Priority badge component
  const PriorityBadge = ({ priority }: { priority: string }) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return <Badge className="bg-red-500 text-white hover:bg-red-600 font-medium px-3">Urgent</Badge>
      case "normal":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-medium px-3">Normal</Badge>
      default:
        return <Badge>{priority}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex flex-col">
        {/* Top navigation */}
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
                <Link href="/dashboard">
                  <ChevronLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600"></span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt="User" />
                      <AvatarFallback>AT</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="container px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">ASR Request Management</h1>
              <p className="text-muted-foreground">Manage and track ASR test requests in the PCRD system</p>
            </div>

            <Button
              onClick={() => {
                fetchRequests()
                fetchStatusCounts()
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* Main content area with sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="lg:w-64 space-y-4">
              {/* Capability Filter */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg font-medium">Capability Filter</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1 px-1">
                    <Button
                      variant={capabilityFilter === "all" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setCapabilityFilter("all")
                        setCurrentPage(1)
                      }}
                    >
                      <Beaker className="mr-2 h-4 w-4" />
                      All Capabilities
                      <Badge className="ml-auto" variant="secondary">
                        {totalCount}
                      </Badge>
                    </Button>

                    {/* Map through predefined capabilities from Capability.ts */}
                    {CAPABILITY_CATEGORIES.map((cap) => (
                      <Button
                        key={cap.id}
                        variant={capabilityFilter === cap.id ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => {
                          setCapabilityFilter(cap.id)
                          setCurrentPage(1)
                        }}
                      >
                        <CapabilityIcon capability={cap.name} />
                        <span className="ml-2">{cap.name}</span>
                        <Badge className="ml-auto" variant="secondary">
                          {capabilityCounts[cap.name] || 0}
                        </Badge>
                      </Button>
                    ))}

                    {/* Map through additional capabilities from API if not already in predefined list */}
                    {capabilities
                      .filter(cap =>
                        !CAPABILITY_CATEGORIES.some(
                          predefined => predefined.name.toLowerCase() === cap.name?.toLowerCase()
                        )
                      )
                      .map((cap) => (
                        <Button
                          key={cap.id}
                          variant={capabilityFilter === cap.id ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => {
                            setCapabilityFilter(cap.id)
                            setCurrentPage(1)
                          }}
                        >
                          <CapabilityIcon capability={cap.name} />
                          <span className="ml-2">{cap.name}</span>
                          <Badge className="ml-auto" variant="secondary">
                            {capabilityCounts[cap.name] || 0}
                          </Badge>
                        </Button>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Status Filter */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg font-medium">Status Filter</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1 px-1">
                    <Button
                      variant={statusFilter === "all" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setStatusFilter("all")
                        setSelectedRequests([])
                        setCurrentPage(1)
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      All ASR Requests
                      <Badge className="ml-auto" variant="secondary">
                        {totalCount}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "pending receive sample" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setStatusFilter("pending receive sample")
                        setSelectedRequests([])
                        setCurrentPage(1)
                      }}
                    >
                      <Clock3 className="mr-2 h-4 w-4 text-yellow-600" />
                      Pending Receive
                      <Badge className="ml-auto" variant="secondary">
                        {pendingCount}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "in-progress" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setStatusFilter("in-progress")
                        setSelectedRequests([])
                        setCurrentPage(1)
                      }}
                    >
                      <Clock className="mr-2 h-4 w-4 text-blue-600" />
                      In Progress
                      <Badge className="ml-auto" variant="secondary">
                        {inProgressCount}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "completed" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setStatusFilter("completed")
                        setSelectedRequests([])
                        setCurrentPage(1)
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      Completed
                      <Badge className="ml-auto" variant="secondary">
                        {completedCount}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "rejected" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setStatusFilter("rejected")
                        setSelectedRequests([])
                        setCurrentPage(1)
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Rejected
                      <Badge className="ml-auto" variant="secondary">
                        {rejectedCount}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "terminated" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setStatusFilter("terminated")
                        setSelectedRequests([])
                        setCurrentPage(1)
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4 text-gray-600" />
                      TERMINATED
                      <Badge className="ml-auto" variant="secondary">
                        {terminatedCount}
                      </Badge>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg font-medium">Priority Filter</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1 px-1">
                    <Button
                      variant={priorityFilter === "all" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setPriorityFilter("all")
                        setCurrentPage(1)
                      }}
                    >
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      All Priorities
                    </Button>
                    <Button
                      variant={priorityFilter === "urgent" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setPriorityFilter("urgent")
                        setCurrentPage(1)
                      }}
                    >
                      <AlertCircle className="mr-2 h-4 w-4 text-red-600" />
                      Urgent
                      <Badge className="ml-auto" variant="secondary">
                        {requests.filter((req) => req.priority?.toLowerCase() === "urgent").length}
                      </Badge>
                    </Button>
                    <Button
                      variant={priorityFilter === "normal" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setPriorityFilter("normal")
                        setCurrentPage(1)
                      }}
                    >
                      <ArrowUpDown className="mr-2 h-4 w-4 text-blue-600" />
                      Normal
                      <Badge className="ml-auto" variant="secondary">
                        {requests.filter((req) => req.priority?.toLowerCase() === "normal").length}
                      </Badge>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/request-management/assign-due">
                      <Calendar className="mr-2 h-4 w-4" />
                      Assign Due Dates
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main content */}
            <div className="flex-1">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50 text-purple-800 hover:bg-purple-50 border-purple-200">ASR</Badge>
                        {statusFilter === "all"
                          ? "All ASR Requests"
                          : statusFilter === "pending receive sample"
                            ? "Pending ASR Requests"
                            : statusFilter === "in-progress"
                              ? "In Progress ASR Requests"
                              : statusFilter === "completed"
                                ? "Completed ASR Requests"
                                : statusFilter === "rejected"
                                  ? "Rejected ASR Requests"
                                  : statusFilter === "approved"
                                    ? "Approved ASR Requests"
                                    : "ASR Requests"}
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search ASR requests..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full">
                    <Tabs defaultValue="table" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mx-6 my-2 w-[400px]">
                        <TabsTrigger value="table">Table View</TabsTrigger>
                        <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                      </TabsList>
                      <TabsContent value="table" className="m-0">
                      {/* Batch action buttons - only show when filtering by pending, in-progress, or completed */}
                      {showCheckboxes && selectedRequests.length > 0 && (
                        <div className="flex items-center justify-between p-4 bg-muted/10 border-b">
                          <div className="text-sm">
                            <span className="font-medium">{selectedRequests.length}</span> requests selected
                          </div>
                          <div className="flex gap-2">
                            {statusFilter === "pending receive sample" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={handleReceiveAll}
                                  disabled={batchActionLoading}
                                >
                                  {batchActionLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Clock className="mr-2 h-4 w-4" />
                                  )}
                                  Receive All
                                </Button>
                              </>
                            )}
                            {statusFilter === "in-progress" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={handleCompleteAll}
                                  disabled={batchActionLoading}
                                >
                                  {batchActionLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Complete All
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={handleApproveAll}
                                  disabled={batchActionLoading}
                                >
                                  {batchActionLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Approve All
                                </Button>
                              </>
                            )}
                            {statusFilter === "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={handleApproveAll}
                                  disabled={batchActionLoading}
                                >
                                  {batchActionLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Approve All
                                </Button>
                              </>
                            )}
                            {(statusFilter === "pending receive sample" ||
                              statusFilter === "in-progress" ||
                              statusFilter === "completed") && (
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleRejectAll}
                                disabled={batchActionLoading}
                              >
                                {batchActionLoading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="mr-2 h-4 w-4" />
                                )}
                                Reject All
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setSelectedRequests([])}>
                              Clear Selection
                            </Button>
                          </div>
                        </div>
                      )}

                      {loading ? (
                        <div className="flex justify-center items-center p-12">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Loading requests...</p>
                          </div>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              {showCheckboxes && (
                                <TableHead className="w-[40px]">
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={
                                        selectedRequests.length === displayRequests.length && displayRequests.length > 0
                                      }
                                      onCheckedChange={toggleSelectAll}
                                      aria-label="Select all requests"
                                    />
                                  </div>
                                </TableHead>
                              )}
                              <TableHead className="w-[100px]">ID</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Capability</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Progress</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayRequests.length > 0 ? (
                              displayRequests.map((request) => (
                                <TableRow
                                  key={request.id}
                                  className="hover:bg-muted/30 cursor-pointer"
                                  onClick={() => handleOpenRequestSummary(request)}
                                >
                                  {showCheckboxes && (
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-center">
                                        <Checkbox
                                          checked={selectedRequests.includes(request.id)}
                                          onCheckedChange={() => toggleSelectRequest(request.id)}
                                          aria-label={`Select request ${request.id}`}
                                        />
                                      </div>
                                    </TableCell>
                                  )}
                                  <TableCell className="font-medium">{request.id}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">{request.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {request.requester} • {request.department || "N/A"}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <RequestTypeBadge type={request.type} />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <CapabilityIcon capability={request.capability} />
                                      {request.capability || "-"}
                                      {request.status.toLowerCase() === "pending receive sample" && request.samplesReceived !== undefined && (
                                        <span className="text-xs bg-blue-50 px-2 py-0.5 rounded-full text-blue-700 border border-blue-200 ml-1">
                                          {request.samplesReceived} / {request.samplesTotal} received
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <RequestStatusBadge status={request.status} />
                                  </TableCell>
                                  <TableCell>
                                    <PriorityBadge priority={request.priority} />
                                  </TableCell>
                                  <TableCell>{request.dueDate || "-"}</TableCell>
                                  <TableCell>
                                    <div className="w-full flex items-center gap-2">
                                      <Progress value={request.progress} className="h-2 w-20" />
                                      <span className="text-xs">{request.progress}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                      {/* Status-specific action buttons */}
                                      {request.status.toLowerCase() === "pending receive sample" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                          title="Start Processing"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleStatusChange(request.id, "in-progress")
                                          }}
                                        >
                                          <Clock className="h-4 w-4" />
                                          <span className="sr-only">Start Processing</span>
                                        </Button>
                                      )}
                                      {request.status.toLowerCase() === "pending receive sample" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full text-green-600 hover:text-green-700 hover:bg-green-50"
                                          title="View & Receive Samples"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedRequest(request)
                                            setReceiveDialogOpen(true)
                                          }}
                                        >
                                          <PackageOpen className="h-4 w-4" />
                                          <span className="sr-only">View & Receive Samples</span>
                                        </Button>
                                      )}
                                      {request.status.toLowerCase() === "in-progress" && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-full text-green-600 hover:text-green-700 hover:bg-green-50"
                                          title="Mark as Completed"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleStatusChange(request.id, "completed")
                                          }}
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                          <span className="sr-only">Mark as Completed</span>
                                        </Button>
                                      )}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">More actions</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={(e) => handleOpenRequestDetails(e, request)}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            View Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem asChild>
                                            <Link href={`/request/${request.id}`}>
                                              <FileText className="h-4 w-4 mr-2" />
                                              Edit Request
                                            </Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem asChild>
                                            <Link href={`/results-repository/${request.id}`}>
                                              <BarChart3 className="h-4 w-4 mr-2" />
                                              View Results
                                            </Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleStatusChange(request.id, "rejected")
                                            }}
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject Request
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={showCheckboxes ? 10 : 9} className="text-center py-10">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-lg font-medium">No requests found</p>
                                    <p className="text-muted-foreground">
                                      {searchQuery
                                        ? `No requests match "${searchQuery}"`
                                        : "Try changing your filters to see more requests"}
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      )}

                      {/* Pagination */}
                      {displayRequests.length > 0 && totalPages > 1 && (
                        <div className="py-4 px-6 border-t flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Showing {(currentPage - 1) * pageSize + 1} to{" "}
                            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requests
                          </div>
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                  disabled={currentPage === 1}
                                />
                              </PaginationItem>

                              {/* Generate page numbers */}
                              {(() => {
                                const pages: number[] = [];
                                const maxNumbers = Math.min(5, totalPages);
                                let start = Math.max(1, currentPage - 2);
                                let end = start + maxNumbers - 1;

                                if (end > totalPages) {
                                  end = totalPages;
                                  start = Math.max(1, end - maxNumbers + 1);
                                }

                                for (let p = start; p <= end; p++) {
                                  pages.push(p);
                                }

                                const items = [] as JSX.Element[];

                                if (start > 1) {
                                  items.push(
                                    <PaginationItem key={1}>
                                      <PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1}>
                                        1
                                      </PaginationLink>
                                    </PaginationItem>
                                  );
                                  if (start > 2) {
                                    items.push(
                                      <PaginationItem key="start-ellipsis">
                                        <span className="p-2">...</span>
                                      </PaginationItem>
                                    );
                                  }
                                }

                                items.push(
                                  ...pages.map((page) => (
                                    <PaginationItem key={page}>
                                      <PaginationLink
                                        onClick={() => setCurrentPage(page)}
                                        isActive={currentPage === page}
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))
                                );

                                if (end < totalPages) {
                                  if (end < totalPages - 1) {
                                    items.push(
                                      <PaginationItem key="end-ellipsis">
                                        <span className="p-2">...</span>
                                      </PaginationItem>
                                    );
                                  }
                                  items.push(
                                    <PaginationItem key={totalPages}>
                                      <PaginationLink
                                        onClick={() => setCurrentPage(totalPages)}
                                        isActive={currentPage === totalPages}
                                      >
                                        {totalPages}
                                      </PaginationLink>
                                    </PaginationItem>
                                  );
                                }

                                return items;
                              })()}

                              <PaginationItem>
                                <PaginationNext
                                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                  disabled={currentPage === totalPages}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                    </TabsContent>

                      <TabsContent value="calendar" className="m-0 p-6">
                        <div className="flex flex-col items-center justify-center py-12 bg-muted/10 rounded-md">
                          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-lg font-medium">Calendar View</p>
                          <p className="text-muted-foreground">Calendar view is under development</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Request summary dialog */}
      {selectedRequest && (
        <RequestSummaryDialog
          request={selectedRequest}
          open={summaryDialogOpen}
          onOpenChange={setSummaryDialogOpen}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Sample receive dialog */}
      {selectedRequest && (
        <SampleReceiveDialog
          requestId={selectedRequest.id}
          open={receiveDialogOpen}
          onOpenChange={setReceiveDialogOpen}
          onSamplesReceived={handleStatusChange}
        />
      )}

      {/* Request details view dialog */}
      {selectedRequest && (
        <RequestViewDetailsDialog
          requestId={selectedRequest.id}
          open={viewDetailsDialogOpen}
          onOpenChange={setViewDetailsDialogOpen}
        />
      )}
    </div>
  )
}