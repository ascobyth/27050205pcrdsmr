"use client"

import { Label } from "@/components/ui/label"

import { Checkbox } from "@/components/ui/checkbox"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Check, AlertCircle, Download, Printer, Trash2, Edit, RefreshCw } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

export default function RequestSummaryPage() {
  const searchParams = useSearchParams()
  const editRequestId = searchParams.get('edit')
  const isEditMode = !!editRequestId

  // Initialize with empty data, will be populated from localStorage
  const [requestData, setRequestData] = useState({
    requestTitle: "",
    requestId: `NTR-${new Date().getFullYear()}-XXXX`,
    priority: "normal",
    useIONumber: "yes",
    ioNumber: "",
    costCenter: "",
    urgentType: "",
    urgencyReason: "",
    approver: null,
    urgentMemo: null,
    samples: [],
    testMethods: [],
    totalCost: 0,
    estimatedTurnaround: 7,
    requester: {
      name: "",
      department: "",
      email: "",
      phone: "",
    },
    submissionDate: new Date().toISOString().split('T')[0],
    status: "draft",
    deletedMethods: [],
  })

  // State for editing remarks
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null)
  const [remarksValue, setRemarksValue] = useState("")

  // State for sample selection dialog
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false)
  const [currentMethodId, setCurrentMethodId] = useState<string | null>(null)
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([])

  // Load all form data from localStorage when the component mounts
  useEffect(() => {
    try {
      // Load the main form data (request title, priority, IO number, etc.)
      const savedFormData = localStorage.getItem("ntrFormData")
      if (savedFormData) {
        const parsedFormData = JSON.parse(savedFormData)
        console.log("Loaded form data from localStorage:", parsedFormData)

        // Update the request data with the form values
        setRequestData(prev => ({
          ...prev,
          requestTitle: parsedFormData.requestTitle || prev.requestTitle,
          priority: parsedFormData.priority || prev.priority,
          useIONumber: parsedFormData.useIONumber || prev.useIONumber,
          ioNumber: parsedFormData.ioNumber || prev.ioNumber,
          costCenter: parsedFormData.costCenter || prev.costCenter,
          urgentType: parsedFormData.urgentType || prev.urgentType,
          urgencyReason: parsedFormData.urgencyReason || prev.urgencyReason,
          approver: parsedFormData.approver || prev.approver,
          // Note: urgentMemo is a File object and can't be stored in localStorage
        }))
      } else {
        // Try the persistent storage if regular storage is not available
        const persistentFormData = localStorage.getItem("ntrFormData_persistent")
        if (persistentFormData) {
          const parsedPersistentData = JSON.parse(persistentFormData)
          console.log("Loaded form data from persistent storage:", parsedPersistentData)

          setRequestData(prev => ({
            ...prev,
            requestTitle: parsedPersistentData.requestTitle || prev.requestTitle,
            priority: parsedPersistentData.priority || prev.priority,
            useIONumber: parsedPersistentData.useIONumber || prev.useIONumber,
            ioNumber: parsedPersistentData.ioNumber || prev.ioNumber,
            costCenter: parsedPersistentData.costCenter || prev.costCenter,
            urgentType: parsedPersistentData.urgentType || prev.urgentType,
            urgencyReason: parsedPersistentData.urgencyReason || prev.urgencyReason,
            approver: parsedPersistentData.approver || prev.approver,
          }))
        }
      }

      // Load requester information from auth if available
      const userDataString = localStorage.getItem("userData")
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString)
          setRequestData(prev => ({
            ...prev,
            requester: {
              name: userData.name || userData.username || prev.requester.name,
              email: userData.email || prev.requester.email,
              department: userData.department || prev.requester.department,
              phone: userData.phone || prev.requester.phone,
            }
          }))
        } catch (error) {
          console.error("Error parsing user data:", error)
        }
      }

      // Load samples from localStorage
      const savedSamples = localStorage.getItem("ntrSamples")
      if (savedSamples) {
        const parsedSamples = JSON.parse(savedSamples)
        console.log("Loaded samples from localStorage:", parsedSamples)

        setRequestData((prev) => ({
          ...prev,
          samples: parsedSamples,
        }))
      }

      // Load test methods from localStorage
      const savedTestMethods = localStorage.getItem("ntrTestMethods")
      if (savedTestMethods) {
        const parsedTestMethods = JSON.parse(savedTestMethods)
        console.log("Loaded test methods from localStorage:", parsedTestMethods)

        // Ensure all samples in test methods are strings
        const sanitizedTestMethods = parsedTestMethods.map((method: any) => {
          // Ensure method.samples is an array of strings
          const sanitizedSamples = Array.isArray(method.samples)
            ? method.samples.map((sample: any) => {
                if (typeof sample === "string") return sample
                if (sample && typeof sample === "object") {
                  return sample.name || sample.generatedName || "Unknown Sample"
                }
                return "Unknown Sample"
              })
            : []

          // Ensure method.instances is an array of objects with samples as arrays of strings
          const sanitizedInstances = Array.isArray(method.instances)
            ? method.instances.map((instance: any) => {
                const instanceSamples = Array.isArray(instance.samples)
                  ? instance.samples.map((sample: any) => {
                      if (typeof sample === "string") return sample
                      if (sample && typeof sample === "object") {
                        return sample.name || sample.generatedName || "Unknown Sample"
                      }
                      return "Unknown Sample"
                    })
                  : []

                return {
                  ...instance,
                  samples: instanceSamples,
                }
              })
            : []

          return {
            ...method,
            samples: sanitizedSamples,
            instances: sanitizedInstances,
          }
        })

        setRequestData((prev) => ({
          ...prev,
          testMethods: sanitizedTestMethods,
        }))
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
      toast({
        title: "Error loading data",
        description: "There was a problem loading your request data. Some information may be missing.",
        variant: "destructive",
      })
    }
  }, [])

  const handleDownloadPdf = () => {
    // Basic print-to-PDF for now
    window.print()
  }

  const handleSubmit = async () => {
    try {
      // Show loading toast
      toast({
        title: "Submitting request...",
        description: "Please wait while we process your submission.",
      })

      // Filter out deleted methods
      const activeTestMethods = requestData.testMethods.filter(method => !method.isDeleted);

      // Log the current state of requestData for debugging
      console.log("Current request data before submission:", requestData);

      // Structure the data to exactly match the RequestList and TestingSampleList schemas
      // Ensure all user-entered data is correctly passed to the API
      const submissionData = {
        // Core request identification - use the exact title entered by the user
        requestTitle: requestData.requestTitle || "New Test Request",
        requestStatus: "Pending Receive",

        // Cost information - use the exact values entered by the user
        useIONumber: requestData.useIONumber || "no", // This will be converted to boolean on the server
        ioNumber: requestData.ioNumber || "",
        costCenter: requestData.costCenter || "",

        // Priority settings - use the exact values entered by the user
        priority: requestData.priority || "normal",
        urgentType: requestData.urgentType || "",
        urgencyReason: requestData.urgencyReason || "",

        // Approval information - use the exact approver selected by the user
        approver: requestData.approver || null,

        // Document uploads - use the file uploaded by the user if available
        urgentMemo: requestData.urgentMemo || null,

        // Requester information - use the authenticated user information
        requester: {
          name: requestData.requester?.name || "Anonymous",
          email: requestData.requester?.email || "anonymous@example.com",
          department: requestData.requester?.department || "",
        },

        // Sample information - preserve all original sample properties exactly as entered
        samples: requestData.samples.map(sample => {
          // Generate a unique ID if not present
          const sampleId = sample.id || `sample-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Return the sample with all its original properties
          return {
            ...sample, // Keep all original properties

            // Add required IDs if not present
            id: sampleId,
            sampleId: sampleId,

            // Ensure these fields are present with defaults if needed
            name: sample.name || sample.generatedName || "Unnamed Sample",
            generatedName: sample.generatedName || sample.name || "Unnamed Sample",
            remark: sample.remark || "",
          };
        }),

        // Test method information - preserve all original method properties
        testMethods: activeTestMethods.map(method => {
          // Generate a unique ID if not present
          const methodId = method.id || `method-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Return the method with all its original properties
          return {
            ...method, // Keep all original properties

            // Add required IDs if not present
            id: methodId,
            methodId: methodId,

            // Ensure these fields are present with defaults if needed
            name: method.name || "Unnamed Method",
            methodCode: method.methodCode || method.id || "unknown",
            category: method.category || "Unknown",
            price: method.price || 0,
            turnaround: method.turnaround || 7,
            remarks: method.remarks || "",
            testingRemark: method.remarks || "",

            // Ensure samples is an array of strings
            samples: Array.isArray(method.samples) ? method.samples : [],
          };
        }),

        // Additional fields required by RequestList schema
        isOnBehalf: false,
        isAsrRequest: false,
        isTechsprint: false,

        // Submission date
        submissionDate: new Date().toISOString(),
      };

      console.log("Submitting data:", submissionData);

      // Submit the request to the backend
      // Use a try-catch block to handle connection errors
      try {
        console.log('Submitting request to API...');

        // Choose the appropriate API endpoint based on edit mode
        const apiEndpoint = isEditMode
          ? `/api/requests/${editRequestId}`
          : '/api/requests/submit-request';

        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(apiEndpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `API request failed with status ${response.status}: ${errorData.error || response.statusText}`
          );
        }

        const result = await response.json();

        if (result.success) {
          if (isEditMode) {
            // Handle edit mode success
            toast({
              title: "Request updated successfully",
              description: `Request ${editRequestId} has been updated.`,
            });

            // Clear the form data from localStorage
            localStorage.removeItem('ntrFormData');
            localStorage.removeItem('ntrSamples');
            localStorage.removeItem('ntrTestMethods');

            // Redirect back to dashboard after update
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1000);
          } else {
            // Handle new request submission
            // Get the first request number for the toast message
            const firstRequestNumber = result.data.requestNumbers[0];
            const requestCount = result.data.requestNumbers.length;

            // Show success toast
            toast({
              title: "Request submitted successfully",
              description: requestCount > 1
                ? `Your ${requestCount} requests have been submitted. Primary request: ${firstRequestNumber}`
                : `Your request ${firstRequestNumber} has been submitted.`,
            });

            // Store the request numbers in localStorage for the confirmation page
            localStorage.setItem('submittedRequestNumbers', JSON.stringify(result.data.requestNumbers));
            localStorage.setItem('submittedRequestIds', JSON.stringify(result.data.requestIds));

            // Also store the first request number for backward compatibility
            localStorage.setItem('submittedRequestNumber', firstRequestNumber);
            localStorage.setItem('submittedRequestId', result.data.requestIds[0]);

            // Clear the form data from localStorage
            localStorage.removeItem('ntrFormData');
            localStorage.removeItem('ntrSamples');
            localStorage.removeItem('ntrTestMethods');

            // Redirect to confirmation page after submission
            setTimeout(() => {
              window.location.href = "/request/new/ntr/confirmation";
            }, 1000);
          }
        } else {
          // Show error toast
          toast({
            title: "Submission failed",
            description: result.error || "An error occurred while submitting your request.",
            variant: "destructive",
          });
        }
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);

        // Check if we're in development mode
        const isDevelopment = process.env.NODE_ENV === 'development';

        if (isDevelopment) {
          // For development/testing purposes, simulate a successful submission
          // This allows testing the flow without a working backend
          const mockRequestNumbers = [
            `RM-N-${new Date().getMonth() + 1}${String(new Date().getFullYear()).slice(-2)}-${Math.floor(10000 + Math.random() * 90000)}`,
            `MS-N-${new Date().getMonth() + 1}${String(new Date().getFullYear()).slice(-2)}-${Math.floor(10000 + Math.random() * 90000)}`
          ];
          const mockRequestIds = [`mock-${Date.now()}-1`, `mock-${Date.now()}-2`];

          // Show success toast with mock data
          toast({
            title: "Request submitted successfully (Development Mode)",
            description: `Your 2 requests have been submitted. Primary request: ${mockRequestNumbers[0]}`,
          });

          // Store the mock request numbers in localStorage for the confirmation page
          localStorage.setItem('submittedRequestNumbers', JSON.stringify(mockRequestNumbers));
          localStorage.setItem('submittedRequestIds', JSON.stringify(mockRequestIds));

          // Also store the first request number for backward compatibility
          localStorage.setItem('submittedRequestNumber', mockRequestNumbers[0]);
          localStorage.setItem('submittedRequestId', mockRequestIds[0]);

          // Clear the form data from localStorage
          localStorage.removeItem('ntrFormData');
          localStorage.removeItem('ntrSamples');
          localStorage.removeItem('ntrTestMethods');

          // Redirect to confirmation page after submission
          setTimeout(() => {
            window.location.href = "/request/new/ntr/confirmation";
          }, 1000);
        } else {
          // In production, show error toast
          toast({
            title: "Connection error",
            description: `Could not connect to the server. Please check your network connection and try again.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting request:", error);

      // Show error toast
      toast({
        title: "Submission failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Function to edit method remarks
  const startEditingRemarks = (methodId: string, currentRemarks: string) => {
    setEditingRemarks(methodId)
    setRemarksValue(currentRemarks)
  }

  const saveRemarks = (methodId: string) => {
    setRequestData((prev) => ({
      ...prev,
      testMethods: prev.testMethods.map((method) =>
        method.id === methodId ? { ...method, remarks: remarksValue } : method,
      ),
    }))
    setEditingRemarks(null)
  }

  // Function to delete a method
  const deleteMethod = (methodId: string) => {
    const methodToDelete = requestData.testMethods.find((m) => m.id === methodId)

    if (methodToDelete) {
      setRequestData((prev) => ({
        ...prev,
        testMethods: prev.testMethods.map((method) =>
          method.id === methodId ? { ...method, isDeleted: true } : method,
        ),
        deletedMethods: [...prev.deletedMethods, methodToDelete],
      }))

      toast({
        title: "Method removed",
        description: `${methodToDelete.name} has been removed from your request.`,
      })
    }
  }

  // Function to restore a deleted method
  const restoreMethod = (methodId: string) => {
    setRequestData((prev) => ({
      ...prev,
      testMethods: prev.testMethods.map((method) =>
        method.id === methodId ? { ...method, isDeleted: false } : method,
      ),
      deletedMethods: prev.deletedMethods.filter((m) => m.id !== methodId),
    }))

    toast({
      title: "Method restored",
      description: "The method has been restored to your request.",
    })
  }

  // Function to open sample selection dialog
  const openSampleSelection = (methodId: string) => {
    const method = requestData.testMethods.find((m) => m.id === methodId)
    if (method) {
      setCurrentMethodId(methodId)
      setSelectedSampleIds(method.samples)
      setSampleDialogOpen(true)
    }
  }

  // Function to save selected samples
  const saveSampleSelection = () => {
    if (currentMethodId) {
      setRequestData((prev) => ({
        ...prev,
        testMethods: prev.testMethods.map((method) =>
          method.id === currentMethodId ? { ...method, samples: selectedSampleIds } : method,
        ),
      }))
      setSampleDialogOpen(false)
      setCurrentMethodId(null)

      toast({
        title: "Samples updated",
        description: "The sample selection has been updated.",
      })
    }
  }

  // Calculate active methods (not deleted)
  const activeMethods = requestData.testMethods.filter((method) => !method.isDeleted)

  // Calculate total cost based on active methods
  const totalCost = activeMethods.reduce((sum, method) => sum + method.price, 0)

  // Calculate max turnaround time
  const maxTurnaround = activeMethods.length > 0 ? Math.max(...activeMethods.map((method) => method.turnaround)) : 0

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center space-x-2">
          <Link href="/request/new/ntr/test-methods">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back to Test Methods
            </Button>
          </Link>
        </div>

        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditMode ? "Edit Request" : "Request Summary"}
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {isEditMode ? "Editing" : "Draft"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {isEditMode
              ? "Review and update your request details"
              : "Review your request details before submission"
            }
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Request Information */}
            <Card>
              <CardHeader>
                <CardTitle>Request Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Request ID</p>
                    <p>{requestData.requestId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Submission Date</p>
                    <p>{requestData.submissionDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Request Title</p>
                    <p>{requestData.requestTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <p className="capitalize">{requestData.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IO Number</p>
                    <p>{requestData.ioNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cost Center</p>
                    <p>{requestData.costCenter}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Samples */}
            <Card>
              <CardHeader>
                <CardTitle>Samples ({requestData.samples.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requestData.samples.map((sample, index) => {
                    // Create a unique key using id or index as fallback
                    const uniqueKey = sample.id || `sample-${index}-${sample.name || sample.generatedName || index}`;

                    return (
                      <div key={uniqueKey} className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                          <p className="font-medium">{sample.name || sample.generatedName}</p>
                          <p className="text-sm text-muted-foreground">{sample.category}</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="h-3 w-3 mr-1" /> Ready
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Test Methods */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Test Methods ({activeMethods.length})</CardTitle>
                {requestData.deletedMethods.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRequestData((prev) => ({
                        ...prev,
                        testMethods: prev.testMethods.map((method) => ({ ...method, isDeleted: false })),
                        deletedMethods: [],
                      }))
                      toast({
                        title: "All methods restored",
                        description: "All deleted methods have been restored.",
                      })
                    }}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Restore All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requestData.testMethods.map((method, methodIndex) => {
                    // Skip deleted methods
                    if (method.isDeleted) return null

                    // Check if this is a parent method with instances
                    const isParent = method.isInstance !== true
                    const hasInstances =
                      isParent &&
                      requestData.testMethods.some((m) => m.isInstance && m.parentId === method.id && !m.isDeleted)

                    // Create a unique key using id or index as fallback
                    const methodKey = method.id || `method-${methodIndex}-${method.name || methodIndex}`;

                    return (
                      <div key={methodKey} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {method.category}
                              </Badge>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {method.price * 35} THB
                              </Badge>
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                {method.turnaround} days
                              </Badge>
                              {method.isInstance && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                  Instance
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openSampleSelection(method.id)}>
                              Samples ({method.samples.length})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMethod(method.id)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        {editingRemarks === method.id ? (
                          <div className="mt-3">
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium mb-1">Additional Requirements:</p>
                                <Input
                                  value={remarksValue}
                                  onChange={(e) => setRemarksValue(e.target.value)}
                                  placeholder="e.g., Temperature 180°C, specific conditions, etc."
                                />
                              </div>
                              <Button size="sm" onClick={() => saveRemarks(method.id)}>
                                Save
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEditingRemarks(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">Additional Requirements:</p>
                                <p className="text-sm text-muted-foreground">{method.remarks || "None specified"}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingRemarks(method.id, method.remarks)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <p className="text-sm font-medium">Samples to Test:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.isArray(method.samples) &&
                              method.samples.map((sample, idx) => {
                                // Ensure we're rendering a string
                                const sampleName =
                                  typeof sample === "string"
                                    ? sample
                                    : sample && typeof sample === "object" && (sample.name || sample.generatedName)
                                      ? sample.name || sample.generatedName
                                      : `Sample ${idx + 1}`

                                // Create a more unique key using method id, index, and sample name
                                const uniqueKey = `${method.id}-sample-${idx}-${sampleName.replace(/\s+/g, '-')}`

                                return (
                                  <Badge key={uniqueKey} variant="outline" className="bg-gray-100">
                                    {sampleName}
                                  </Badge>
                                )
                              })}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Show deleted methods section if any */}
                  {requestData.deletedMethods.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Deleted Methods</h3>
                      <div className="space-y-2">
                        {requestData.testMethods
                          .filter((m) => m.isDeleted)
                          .map((method, deletedIndex) => {
                            // Create a unique key using id or index as fallback
                            const deletedKey = method.id
                              ? `deleted-${method.id}`
                              : `deleted-method-${deletedIndex}-${method.name || deletedIndex}`;

                            return (
                              <div
                                key={deletedKey}
                                className="flex justify-between items-center p-3 border border-dashed rounded-md bg-gray-50"
                              >
                              <div>
                                <p className="font-medium text-muted-foreground">{method.name}</p>
                                <p className="text-xs text-muted-foreground">{method.category}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreMethod(method.id)}
                                className="flex items-center gap-1"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Restore
                              </Button>
                            </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex justify-between">
              <div className="flex space-x-3">
                <Button variant="outline" className="gap-2" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
              <div className="flex space-x-3">
                <Link href="/request/new/ntr">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Save current state to localStorage before navigating
                      try {
                        localStorage.setItem(
                          "ntrFormData",
                          JSON.stringify({
                            requestTitle: requestData.requestTitle,
                            priority: requestData.priority,
                            useIONumber: requestData.useIONumber,
                            ioNumber: requestData.ioNumber,
                            costCenter: requestData.costCenter,
                            // Add any other fields that need to be preserved
                          }),
                        )
                      } catch (error) {
                        console.error("Error saving form data to localStorage:", error)
                      }
                    }}
                  >
                    Edit Request
                  </Button>
                </Link>
                <Button
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  onClick={handleSubmit}
                >
                  {isEditMode ? "Update Request" : "Submit Request"}
                </Button>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            {/* Summary card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Request Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requester</p>
                    <p className="font-medium">{requestData.requester.name}</p>
                    <p className="text-sm text-muted-foreground">{requestData.requester.department}</p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Samples</p>
                    <p className="text-2xl font-bold">{requestData.samples.length}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Test Methods</p>
                    <p className="text-2xl font-bold">{activeMethods.length}</p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold">{totalCost * 35} THB</p>
                    <p className="text-xs text-muted-foreground">(${totalCost} USD)</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estimated Turnaround</p>
                    <p className="text-2xl font-bold">{maxTurnaround} days</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Request Status: Draft</p>
                      <p className="text-xs text-amber-700 mt-1">
                        This request has not been submitted yet. Review the details and click "Submit Request" when
                        ready.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Need help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 text-sm mb-4">
                  If you have any questions about your request or need assistance, please contact our support team.
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Contact Support</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sample Selection Dialog */}
      <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Samples</DialogTitle>
            <DialogDescription>Choose which samples to test with this method</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-[300px] overflow-y-auto border rounded-md p-2">
              {requestData.samples.map((sample, index) => {
                // Get a consistent sample identifier
                const sampleId = sample.id || String(sample.generatedName) || `sample-${index}`
                const sampleName = sample.generatedName || sample.name || `Sample ${index + 1}`

                return (
                  <div
                    key={sampleId}
                    className={`flex items-center space-x-2 p-2 rounded-md ${
                      selectedSampleIds.includes(sampleName) ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <Checkbox
                      id={`sample-${sampleId}`}
                      checked={selectedSampleIds.includes(sampleName)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSampleIds((prev) => [...prev, sampleName])
                        } else {
                          setSelectedSampleIds((prev) => prev.filter((id) => id !== sampleName))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`sample-${sampleId}`} className="text-sm font-medium cursor-pointer">
                        {sampleName}
                      </Label>
                      <p className="text-xs text-muted-foreground">{sample.category}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSampleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSampleSelection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

