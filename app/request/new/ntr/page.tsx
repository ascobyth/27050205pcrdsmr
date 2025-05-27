"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { ChevronLeft, ChevronRight, HelpCircle, Plus, Save, Trash2, Upload, Copy, Pencil, X } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { AutocompleteInput } from "@/components/ui/autocomplete-input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useAuth } from "@/components/auth-provider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Define proper types for Sample
interface Sample {
  category: string;
  grade?: string;
  lot?: string;
  sampleIdentity: string;
  type: string;
  form: string;
  tech?: string;
  feature?: string;
  plant?: string;
  samplingDate?: string;
  samplingTime?: string;
  generatedName: string;
}

// Interface for FormData
interface FormData {
  requestTitle: string;
  priority: string;
  useIONumber: string;
  ioNumber: string;
  costCenter: string;
  urgentMemo: File | null;
  samples: Sample[];
  testMethods: any[];
  approver: string; // Single approver selection
  urgencyType: string;
  urgencyReason: string;
  isOnBehalf: boolean; // Whether this request is on behalf of another user
  onBehalfOfUser: string; // ID of the user on whose behalf the request is made
  onBehalfOfName: string; // Name of the user on whose behalf the request is made
  onBehalfOfEmail: string; // Email of the user on whose behalf the request is made
  onBehalfOfCostCenter: string; // Cost center of the user on whose behalf the request is made
}

export default function NTRPage() {
  const { user, isLoading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const editRequestId = searchParams.get('edit')
  const isEditMode = !!editRequestId

  const [loadingCostCenter, setLoadingCostCenter] = useState(true)
  const [costCenterError, setCostCenterError] = useState<string | null>(null)
  const [loadingEditData, setLoadingEditData] = useState(false)
  const [editDataError, setEditDataError] = useState<string | null>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    requestTitle: "",
    priority: "normal",
    useIONumber: "yes",
    ioNumber: "",
    costCenter: "",
    urgentMemo: null,
    samples: [],
    testMethods: [],
    approver: "", // Single approver selection
    urgencyType: "",
    urgencyReason: "",
    isOnBehalf: false,
    onBehalfOfUser: "",
    onBehalfOfName: "",
    onBehalfOfEmail: "",
    onBehalfOfCostCenter: ""
  })

  // Sample states
  const [sampleCategory, setSampleCategory] = useState("")
  const [currentSample, setCurrentSample] = useState<Sample>({
    category: "",
    grade: "",
    lot: "",
    sampleIdentity: "",
    type: "",
    form: "",
    tech: "",
    feature: "",
    plant: "",
    samplingDate: "",
    samplingTime: "",
    generatedName: "",
  })

  // Dialog state for the sample editor
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false)

  // Add these new state variables after the existing state declarations
  const [editMode, setEditMode] = useState(false)
  const [editingSampleIndex, setEditingSampleIndex] = useState<number | null>(null)
  const automaticNamingRef = useRef<HTMLDivElement>(null)
  const sampleSummaryRef = useRef<HTMLDivElement>(null)
  const addMoreButtonRef = useRef<HTMLButtonElement>(null)
  const [focusedSection, setFocusedSection] = useState<"naming" | "summary" | "addMore" | null>(null)
  const [showSampleSections, setShowSampleSections] = useState(false)
  const [highlightedField, setHighlightedField] = useState<string | null>("sample-category")

  // Save/Load dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [sampleListName, setSampleListName] = useState("")
  const [savedSampleLists, setSavedSampleLists] = useState<{ id: string; name: string; samples: Sample[] }[]>([
    {
      id: "1",
      name: "Polymer Film Samples",
      samples: [
        {
          category: "commercial",
          grade: "HD5000S",
          lot: "H23010101",
          sampleIdentity: "Test",
          type: "HDPE",
          form: "Pellet",
          generatedName: "HD5000S-H23010101-Test",
        },
        {
          category: "commercial",
          grade: "HD5300B",
          lot: "H23010102",
          sampleIdentity: "Control",
          type: "HDPE",
          form: "Pellet",
          generatedName: "HD5300B-H23010102-Control",
        },
      ],
    },
    {
      id: "2",
      name: "TD/NPD Research Samples",
      samples: [
        {
          category: "td",
          tech: "HighPerf",
          feature: "FP",
          sampleIdentity: "Lab01",
          type: "HDPE",
          form: "Powder",
          generatedName: "TD_HighPerf-FP-Lab01",
        },
        {
          category: "td",
          tech: "EcoRv",
          feature: "IM",
          sampleIdentity: "Lab02",
          type: "HDPE",
          form: "Powder",
          generatedName: "TD_EcoRv-IM-Lab02",
        },
      ],
    },
  ])

  // Required fields for each sample category
  const requiredFields = {
    commercial: ["grade", "lot", "sampleIdentity", "type", "form"],
    td: ["tech", "feature", "sampleIdentity", "type", "form"],
    benchmark: ["feature", "sampleIdentity", "type", "form"],
    inprocess: ["plant", "samplingDate", "samplingTime", "sampleIdentity", "type", "form"],
    chemicals: ["plant", "samplingDate", "samplingTime", "sampleIdentity", "type", "form"],
    cap: ["feature", "sampleIdentity", "type", "form"],
  }

  // Function to check if a field is required
  const isFieldRequired = (field: string) => {
    return requiredFields[sampleCategory as keyof typeof requiredFields]?.includes(field) || false
  }

  // Function to find the next empty required field
  const findNextEmptyRequiredField = () => {
    const fields = requiredFields[sampleCategory as keyof typeof requiredFields] || []
    for (const field of fields) {
      if (!currentSample[field as keyof typeof currentSample]) {
        return field
      }
    }
    return null
  }

  // Function to highlight the next empty required field
  const highlightNextEmptyField = () => {
    const nextField = findNextEmptyRequiredField()
    if (nextField) {
      setHighlightedField(nextField)
      // Focus on the field if possible
      const element = document.getElementById(nextField)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
        setTimeout(() => {
          element.focus()
        }, 500)
      }
    } else {
      setHighlightedField(null)
    }
  }

  // Check for empty required fields when sample category changes
  useEffect(() => {
    if (showSampleSections) {
      highlightNextEmptyField()
    }
  }, [sampleCategory, showSampleSections]);

  // Add effect to fetch user's cost center
  useEffect(() => {
    if (!authLoading && user?.email) {
      const fetchCostCenter = async () => {
        try {
          setLoadingCostCenter(true)
          const res = await fetch("/api/admin/users")
          if (!res.ok) throw new Error(`Error fetching users: ${res.statusText}`)
          const data = await res.json()
          // Check if data is an array or has a data property (for API compatibility)
          const users = Array.isArray(data) ? data : data.data || []
          const currentUser = users.find((u: any) => u.email === user.email)
          console.log("Current user data:", currentUser)
          if (currentUser?.costCenter) {
            console.log("Found cost center:", currentUser.costCenter)
            setFormData((prev) => ({ ...prev, costCenter: currentUser.costCenter }))
          } else {
            console.log("No cost center found for user:", user.email)
            setCostCenterError("No cost center found for this user")
          }
        } catch (error: any) {
          console.error("Failed to load cost center:", error)
          setCostCenterError(error.message)
        } finally {
          setLoadingCostCenter(false)
        }
      }
      fetchCostCenter()
    }
  }, [user?.email, authLoading]);

  // Load data from localStorage (only if not in edit mode)
  useEffect(() => {
    // Skip loading from localStorage if we're in edit mode
    if (isEditMode) {
      console.log("Skipping localStorage load because we're in edit mode")
      return
    }

    try {
      // First try to load from the persistent storage
      const persistentFormData = localStorage.getItem("ntrFormData_persistent")
      if (persistentFormData) {
        const parsedPersistentData = JSON.parse(persistentFormData)
        setFormData((prev) => ({
          ...prev,
          ...parsedPersistentData,
        }))
        console.log("Loaded form data from persistent storage:", parsedPersistentData)
      } else {
        // If no persistent data, try the regular key
        const savedFormData = localStorage.getItem("ntrFormData")
        if (savedFormData) {
          const parsedFormData = JSON.parse(savedFormData)
          setFormData((prev) => ({
            ...prev,
            ...parsedFormData,
          }))
          console.log("Loaded form data from regular storage:", parsedFormData)
          // Don't clear the saved form data after loading it
          // This allows the data to persist between page navigations
          // localStorage.removeItem("ntrFormData")
        }
      }

      // Load samples if available
      const savedSamples = localStorage.getItem("ntrSamples")
      if (savedSamples) {
        const parsedSamples = JSON.parse(savedSamples)
        setFormData((prev) => ({
          ...prev,
          samples: parsedSamples,
        }))

        // If samples exist, show the sample sections
        if (parsedSamples.length > 0) {
          setShowSampleSections(true)
        }
      }
    } catch (error) {
      console.error("Error loading saved data from localStorage:", error)
    }
  }, [isEditMode]);

  // Fetch commercial grades from the database
  useEffect(() => {
    const fetchCommercialGrades = async () => {
      try {
        setLoadingGrades(true)
        const res = await fetch("/api/commercial-samples")
        if (!res.ok) throw new Error(`Error fetching commercial samples: ${res.statusText}`)
        const data = await res.json()

        if (data.success && data.data) {
          // Format the data for the SearchableSelect component
          const gradeOptions = data.data
            .filter((sample: any) => sample.isActive !== false) // Only include active samples
            .map((sample: any) => ({
              value: sample.gradeName,
              label: sample.gradeName
            }))

          // Remove duplicates (in case there are multiple entries with the same grade name)
          const uniqueGrades = Array.from(
            new Map(gradeOptions.map((item: any) => [item.value, item])).values()
          )

          setCommercialGrades(uniqueGrades)
          console.log(`Loaded ${uniqueGrades.length} commercial grades from database`)
        } else {
          console.error("Commercial samples data is not in expected format:", data)
          setGradesError("Data format error. Please contact support.")
        }
      } catch (error: any) {
        console.error("Failed to fetch commercial grades:", error)
        setGradesError(error.message)
      } finally {
        setLoadingGrades(false)
      }
    }

    fetchCommercialGrades()
  }, [])

  // Fallback mock data for sample fields (used if API fails)
  const mockGrades = [
    { value: "HD5000S", label: "HD5000S" },
    { value: "HD5300B", label: "HD5300B" },
    { value: "HD5401GA", label: "HD5401GA" },
    { value: "PP1100NK", label: "PP1100NK" },
    { value: "PP2100JC", label: "PP2100JC" },
  ]

  // Interface for AppTech options
  interface AppTechOption {
    value: string;
    label: string;
    shortText: string;
  }

  // State for commercial grades
  const [commercialGrades, setCommercialGrades] = useState<{ value: string; label: string }[]>([])
  const [loadingGrades, setLoadingGrades] = useState(true)
  const [gradesError, setGradesError] = useState<string | null>(null)

  // State for AppTech data
  const [appTechs, setAppTechs] = useState<any[]>([])
  const [techCatOptions, setTechCatOptions] = useState<AppTechOption[]>([])
  const [featureAppOptions, setFeatureAppOptions] = useState<AppTechOption[]>([])
  const [loadingAppTechs, setLoadingAppTechs] = useState(true)
  const [appTechError, setAppTechError] = useState<string | null>(null)

  // Fetch AppTech data
  useEffect(() => {
    const fetchAppTechs = async () => {
      try {
        setLoadingAppTechs(true)
        const res = await fetch("/api/app-techs")
        if (!res.ok) throw new Error(`Error fetching AppTechs: ${res.statusText}`)
        const data = await res.json()

        if (data.success && data.data) {
          setAppTechs(data.data)

          // Filter for Tech/CAT options (Tech or CATALYST types)
          const techCatData = data.data.filter((item: any) =>
            item.appTechType === "Tech" || item.appTechType === "CATALYST"
          )

          // Filter for Feature/App options (Application or Feature types)
          const featureAppData = data.data.filter((item: any) =>
            item.appTechType === "Application" || item.appTechType === "Feature"
          )

          // Format for AutocompleteInput with shortText included
          setTechCatOptions(techCatData.map((item: any) => ({
            value: item._id,
            label: `${item.appTech} (${item.shortText})`,
            shortText: item.shortText // Include shortText for easy access
          })))

          setFeatureAppOptions(featureAppData.map((item: any) => ({
            value: item._id,
            label: `${item.appTech} (${item.shortText})`,
            shortText: item.shortText // Include shortText for easy access
          })))

          // Log success for debugging
          console.log(`Loaded ${techCatData.length} Tech/CAT options and ${featureAppData.length} Feature/App options`)
        } else {
          // Handle case where data is not in expected format
          console.error("AppTechs data is not in expected format:", data)
          setAppTechError("Data format error. Please contact support.")
        }
      } catch (error: any) {
        console.error("Failed to fetch AppTechs:", error)
        setAppTechError(error.message)
      } finally {
        setLoadingAppTechs(false)
      }
    }

    fetchAppTechs()
  }, [])

  const typeOptions = [
    { value: "HDPE", label: "HDPE" },
    { value: "LDPE", label: "LDPE" },
    { value: "LLDPE", label: "LLDPE" },
    { value: "UHWMPE", label: "UHWMPE" },
    { value: "PP", label: "PP" },
    { value: "PVC", label: "PVC" },
    { value: "Wax", label: "Wax" },
    { value: "Others", label: "Others" },
  ]

  const formOptions = [
    { value: "Pellet", label: "Pellet" },
    { value: "Powder", label: "Powder" },
    { value: "Flake", label: "Flake" },
    { value: "Scrap", label: "Scrap" },
    { value: "Specimen", label: "Specimen" },
    { value: "Liquid", label: "Liquid" },
    { value: "Others", label: "Others" },
  ]

  const plantOptions = [
    { value: "HD1", label: "HD1" },
    { value: "HD2", label: "HD2" },
    { value: "HD3", label: "HD3" },
    { value: "HD4", label: "HD4" },
    { value: "HD(LSP)", label: "HD(LSP)" },
    { value: "PP1", label: "PP1" },
    { value: "PP2", label: "PP2" },
    { value: "PP3", label: "PP3" },
    { value: "4P", label: "4P" },
    { value: "PP(LSP)", label: "PP(LSP)" },
    { value: "LDPE", label: "LDPE" },
    { value: "LLDPE", label: "LLDPE" },
  ]

  // State and effect to load IO numbers from database
  const [ioOptions, setIoOptions] = useState<{ value: string; label: string; }[]>([])
  const [loadingIoOptions, setLoadingIoOptions] = useState(true)
  const [ioError, setIoError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIoOptions = async () => {
      try {
        const res = await fetch("/api/admin/ios")
        if (!res.ok) throw new Error(`Error fetching IO Numbers: ${res.statusText}`)
        const data = await res.json()
        // Check if data is an array or has a data property (for API compatibility)
        const ios = Array.isArray(data) ? data : data.data || []
        const options = ios.map((io: any) => ({
          value: io.ioNo,
          label: `${io.ioNo} ${io.ioName}`
        }))
        setIoOptions(options)
      } catch (error: any) {
        console.error("Failed to fetch IO Numbers:", error)
        setIoError(error.message)
      } finally {
        setLoadingIoOptions(false)
      }
    }
    fetchIoOptions()
  }, [])

  // Urgency types
  const urgencyTypes = [
    { value: "claim", label: "Claim Complaint and Product quality problems" },
    { value: "decision", label: "Decision making" },
    { value: "plant", label: "Plant problem" },
    { value: "compliance", label: "Compliance" },
  ]

  // State for approvers from database
  const [approvers, setApprovers] = useState<{ value: string; label: string }[]>([])
  const [loadingApprovers, setLoadingApprovers] = useState(true)
  const [approversError, setApproversError] = useState<string | null>(null)

  // State for on-behalf users from database
  const [onBehalfUsers, setOnBehalfUsers] = useState<{ value: string; label: string; email: string; costCenter: string }[]>([])
  const [loadingOnBehalfUsers, setLoadingOnBehalfUsers] = useState(true)
  const [onBehalfUsersError, setOnBehalfUsersError] = useState<string | null>(null)

  // Fetch users that the current user can create requests on behalf of
  useEffect(() => {
    const fetchOnBehalfUsers = async () => {
      if (!user?.email) return // Wait until user is loaded

      try {
        setLoadingOnBehalfUsers(true)
        const res = await fetch(`/api/users/on-behalf?email=${encodeURIComponent(user.email)}`)
        if (!res.ok) throw new Error(`Error fetching on-behalf users: ${res.statusText}`)

        const data = await res.json()

        if (data.success && Array.isArray(data.data)) {
          const onBehalfUserOptions = data.data.map((user: any) => ({
            value: user._id,
            label: user.name,
            email: user.email,
            costCenter: user.costCenter || ''
          }))

          setOnBehalfUsers(onBehalfUserOptions)
          console.log(`Loaded ${onBehalfUserOptions.length} on-behalf users from database`)
        } else {
          console.error('Failed to fetch on-behalf users:', data.error || 'Unknown error')
          setOnBehalfUsersError(data.error || 'Unknown error')
        }
      } catch (error: any) {
        console.error('Failed to fetch on-behalf users:', error)
        setOnBehalfUsersError(error.message)
      } finally {
        setLoadingOnBehalfUsers(false)
      }
    }

    fetchOnBehalfUsers()
  }, [user?.email])

  // Fetch approvers from the database based on current user's approvers array
  useEffect(() => {
    const fetchApprovers = async () => {
      if (!user?.email) return // Wait until user is loaded

      try {
        setLoadingApprovers(true)

        // First get the current user's full details including approvers array
        const currentUserRes = await fetch("/api/admin/users")
        if (!currentUserRes.ok) throw new Error(`Error fetching users: ${currentUserRes.statusText}`)
        const allUsers = await currentUserRes.json()

        // Find the current user in the returned data
        const currentUser = Array.isArray(allUsers)
          ? allUsers.find((u: any) => u.email === user.email)
          : null

        if (!currentUser) {
          console.error("Current user not found in users list")
          setApproversError("Current user not found")
          setLoadingApprovers(false)
          return
        }

        console.log("Current user:", currentUser)
        console.log("Current user's approvers:", currentUser.approvers)

        // Check if the current user has approvers defined
        if (!Array.isArray(currentUser.approvers) || currentUser.approvers.length === 0) {
          console.log("Current user has no approvers defined")
          setApprovers([])
          setLoadingApprovers(false)
          return
        }

        // Get the approver user objects from the approvers array
        const approverIds = currentUser.approvers.map((approver: any) => {
          if (typeof approver === 'string') {
            return approver;
          } else if (approver && approver._id) {
            return approver._id;
          } else if (approver && approver.$oid) {
            return approver.$oid;
          } else if (approver && typeof approver === 'object') {
            // Try to get the string representation
            return String(approver);
          }
          return null;
        }).filter(Boolean) // Remove any null values

        console.log("Approver IDs:", approverIds)

        // Filter the users to only include those in the approvers array
        const approverOptions = Array.isArray(allUsers)
          ? allUsers
              .filter((user: any) => {
                // Get the user ID in string format for comparison
                const userId = user._id?.toString() || user.id?.toString()
                // Check if this user is in the approvers list
                return user.isActive !== false && approverIds.some(id =>
                  id.toString() === userId
                )
              })
              .map((user: any) => ({
                value: user._id,
                label: `${user.name || user.username} (${user.position || user.email})`,
              }))
          : []

        setApprovers(approverOptions)
        console.log(`Loaded ${approverOptions.length} approvers from database`)
      } catch (error: any) {
        console.error("Failed to fetch approvers:", error)
        setApproversError(error.message)
      } finally {
        setLoadingApprovers(false)
      }
    }

    fetchApprovers()
  }, [user?.email])

  // Load existing request data for edit mode
  useEffect(() => {
    if (isEditMode && editRequestId) {
      const loadRequestData = async () => {
        try {
          setLoadingEditData(true)
          setEditDataError(null)

          const response = await fetch(`/api/requests/details?requestId=${editRequestId}`)
          const result = await response.json()

          if (result.success && result.data) {
            const requestData = result.data

            // Parse samples from JSON string
            let samples: Sample[] = []
            try {
              if (requestData.jsonSampleList) {
                const sampleData = JSON.parse(requestData.jsonSampleList)
                samples = sampleData.map((sample: any) => ({
                  category: sample.category || "",
                  grade: sample.grade || "",
                  lot: sample.lot || "",
                  sampleIdentity: sample.sampleIdentity || "",
                  type: sample.type || "",
                  form: sample.form || "",
                  tech: sample.tech || "",
                  feature: sample.feature || "",
                  plant: sample.plant || "",
                  samplingDate: sample.samplingDate || "",
                  samplingTime: sample.samplingTime || "",
                  generatedName: sample.generatedName || sample.name || ""
                }))
              }
            } catch (e) {
              console.warn('Failed to parse sample list:', e)
            }

            // Parse test methods from JSON string
            let testMethods: any[] = []
            try {
              if (requestData.jsonTestingList) {
                testMethods = JSON.parse(requestData.jsonTestingList)
              }
            } catch (e) {
              console.warn('Failed to parse testing list:', e)
            }

            // Update form data with existing request data
            setFormData(prev => ({
              ...prev,
              requestTitle: requestData.requestTitle || "",
              priority: requestData.priority || "normal",
              useIONumber: requestData.useIoNumber ? "yes" : "no",
              ioNumber: requestData.ioCostCenter || "",
              costCenter: requestData.requesterCostCenter || "",
              urgentMemo: null, // File cannot be loaded from database
              samples: samples,
              testMethods: testMethods,
              approver: "", // Will need to be set by user
              urgencyType: requestData.urgentType || "",
              urgencyReason: requestData.urgencyReason || "",
              isOnBehalf: false, // Reset for edit mode
              onBehalfOfUser: "",
              onBehalfOfName: "",
              onBehalfOfEmail: "",
              onBehalfOfCostCenter: ""
            }))

            // Show sample sections if samples exist
            if (samples.length > 0) {
              setShowSampleSections(true)
            }

            // Save loaded data to localStorage for form persistence
            localStorage.setItem('ntrFormData', JSON.stringify({
              requestTitle: requestData.requestTitle || "",
              priority: requestData.priority || "normal",
              useIONumber: requestData.useIoNumber ? "yes" : "no",
              ioNumber: requestData.ioCostCenter || "",
              costCenter: requestData.requesterCostCenter || "",
              urgentMemo: null,
              approver: "",
              urgencyType: "",
              urgencyReason: "",
              isOnBehalf: false,
              onBehalfOfUser: "",
              onBehalfOfName: "",
              onBehalfOfEmail: "",
              onBehalfOfCostCenter: ""
            }))

            localStorage.setItem('ntrSamples', JSON.stringify(samples))
            localStorage.setItem('ntrTestMethods', JSON.stringify(testMethods))

            console.log('Loaded request data for editing:', requestData)
          } else {
            throw new Error(result.error || 'Failed to load request data')
          }
        } catch (error: any) {
          console.error('Error loading request data:', error)
          setEditDataError(error.message)
        } finally {
          setLoadingEditData(false)
        }
      }

      loadRequestData()
    }
  }, [isEditMode, editRequestId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle on behalf user selection
  const handleOnBehalfUserChange = (userId: string) => {
    // Find the selected user in the onBehalfUsers array
    const selectedUser = onBehalfUsers.find(user => user.value === userId)

    if (selectedUser) {
      setFormData(prev => ({
        ...prev,
        onBehalfOfUser: userId,
        onBehalfOfName: selectedUser.label,
        onBehalfOfEmail: selectedUser.email,
        onBehalfOfCostCenter: selectedUser.costCenter
      }))
    } else {
      // Reset on behalf fields if no user is selected
      setFormData(prev => ({
        ...prev,
        onBehalfOfUser: "",
        onBehalfOfName: "",
        onBehalfOfEmail: "",
        onBehalfOfCostCenter: ""
      }))
    }
  }

  // Handle on behalf toggle
  const handleOnBehalfToggle = (isOnBehalf: boolean) => {
    setFormData(prev => ({
      ...prev,
      isOnBehalf,
      // Reset on behalf fields if toggled off
      ...(!isOnBehalf && {
        onBehalfOfUser: "",
        onBehalfOfName: "",
        onBehalfOfEmail: "",
        onBehalfOfCostCenter: ""
      })
    }))
  }

  const handleSampleChange = (name: string, value: string) => {
    setCurrentSample((prev) => {
      const updatedSample = { ...prev, [name]: value }

      // Generate the sample name without category prefixes
      if (sampleCategory === "commercial" && updatedSample.grade && updatedSample.lot && updatedSample.sampleIdentity) {
        updatedSample.generatedName = `${updatedSample.grade}-${updatedSample.lot}-${updatedSample.sampleIdentity}`
      } else if (sampleCategory === "td" && updatedSample.tech && updatedSample.feature && updatedSample.sampleIdentity) {
        // Get short codes from the options arrays
        const techOption = techCatOptions.find((option) => option.value === updatedSample.tech)
        const featureOption = featureAppOptions.find((option) => option.value === updatedSample.feature)

        // Use shortText if available, otherwise fallback to ID
        const techShortCode = techOption ? techOption.shortText : updatedSample.tech
        const featureShortCode = featureOption ? featureOption.shortText : updatedSample.feature

        updatedSample.generatedName = `${techShortCode}-${featureShortCode}-${updatedSample.sampleIdentity}`
      } else if (sampleCategory === "benchmark" && updatedSample.feature && updatedSample.sampleIdentity) {
        // Get short code from the options array
        const featureOption = featureAppOptions.find((option) => option.value === updatedSample.feature)

        // Use shortText if available, otherwise fallback to ID
        const featureShortCode = featureOption ? featureOption.shortText : updatedSample.feature

        updatedSample.generatedName = `${featureShortCode}-${updatedSample.sampleIdentity}`
      } else if (sampleCategory === "inprocess" && updatedSample.plant && updatedSample.samplingDate && updatedSample.samplingTime && updatedSample.sampleIdentity) {
        updatedSample.generatedName = `${updatedSample.plant}-${updatedSample.samplingDate}-${updatedSample.samplingTime}-${updatedSample.sampleIdentity}`
      } else if (sampleCategory === "chemicals" && updatedSample.plant && updatedSample.samplingDate && updatedSample.samplingTime && updatedSample.sampleIdentity) {
        updatedSample.generatedName = `${updatedSample.plant}-${updatedSample.samplingDate}-${updatedSample.samplingTime}-${updatedSample.sampleIdentity}`
      } else if (sampleCategory === "cap" && updatedSample.feature && updatedSample.sampleIdentity) {
        // Get short code from the options array
        const featureOption = featureAppOptions.find((option) => option.value === updatedSample.feature)

        // Use shortText if available, otherwise fallback to ID
        const featureShortCode = featureOption ? featureOption.shortText : updatedSample.feature

        updatedSample.generatedName = `${featureShortCode}-${updatedSample.sampleIdentity}`
      } else {
        updatedSample.generatedName = ""
      }

      return updatedSample
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, urgentMemo: e.target.files?.[0] || null }))
    }
  }

  // Check for duplicate sample names
  const isDuplicateSampleName = (name: string, excludeIndex?: number) => {
    return formData.samples.some(
      (sample, index) => sample.generatedName === name && (excludeIndex === undefined || index !== excludeIndex),
    )
  }

  // Modify the handleAddSample function to retain form data and check for duplicates
  const handleAddSample = () => {
    if (currentSample.generatedName) {
      // Check for duplicate sample names
      const isDuplicate = isDuplicateSampleName(
        currentSample.generatedName,
        editMode && editingSampleIndex !== null ? editingSampleIndex : undefined
      )

      if (isDuplicate) {
        toast({
          title: "Duplicate sample name",
          description: "A sample with this name already exists. Please modify the sample details.",
        })
        return
      }

      if (editMode && editingSampleIndex !== null) {
        // Update existing sample
        const updatedSamples = [...formData.samples]
        updatedSamples[editingSampleIndex] = { ...currentSample }

        setFormData((prev) => ({
          ...prev,
          samples: updatedSamples,
        }))

        // Exit edit mode
        setEditMode(false)
        setEditingSampleIndex(null)

        toast({
          title: "Sample updated",
          description: `Sample "${currentSample.generatedName}" has been updated.`,
        })
      } else {
        // Add new sample
        setFormData((prev) => ({
          ...prev,
          samples: [...prev.samples, { ...currentSample }],
        }))

        toast({
          title: "Sample added",
          description: `Sample "${currentSample.generatedName}" has been added.`,
        })
      }

      // Don't reset the form completely, just clear identity fields to prepare for next sample
      setCurrentSample((prev) => ({
        ...prev,
        sampleIdentity: "",
        generatedName: "",
      }))

      // Close the dialog
      setSampleDialogOpen(false)

      // Reset highlighted field
      setHighlightedField(null)
    }
  }

  // Add a function to focus on the Automatic Sample Naming System
  const focusOnNamingSystem = () => {
    if (automaticNamingRef.current) {
      automaticNamingRef.current.scrollIntoView({ behavior: "smooth" })
      setFocusedSection("naming")
      setTimeout(() => setFocusedSection(null), 2000) // Remove highlight after 2 seconds
    }
  }

  // Update the handleRemoveSample function
  const handleRemoveSample = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      samples: prev.samples.filter((_, i) => i !== index),
    }))

    toast({
      title: "Sample removed",
      description: "The sample has been removed from your request.",
    })
  }

  // Update the handleCopySample function
  const handleCopySample = (sample: Sample) => {
    // Set current sample to the copied sample
    setCurrentSample({ ...sample })
    setSampleCategory(sample.category)

    // Exit edit mode if it was active
    setEditMode(false)
    setEditingSampleIndex(null)

    // Open the sample dialog for editing
    setSampleDialogOpen(true)

    toast({
      title: "Sample copied",
      description: "Sample details copied. Make changes and add as a new sample.",
    })
  }

  // Update the handleEditSample function
  const handleEditSample = (sample: Sample, index: number) => {
    openEditSampleDialog(sample, index)
  }

  const handleSaveSampleList = () => {
    if (sampleListName && formData.samples.length > 0) {
      setSavedSampleLists((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: sampleListName,
          samples: [...formData.samples],
        },
      ])
      setSampleListName("")
      setShowSaveDialog(false)
    }
  }

  const handleLoadSampleList = (listId: string) => {
    const list = savedSampleLists.find((list) => list.id === listId)
    if (list) {
      setFormData((prev) => ({
        ...prev,
        samples: [...list.samples],
      }))
      setShowLoadDialog(false)
      setShowSampleSections(true)
    }
  }

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate Request Information
      if (!formData.requestTitle) {
        toast({
          title: "Required Field Missing",
          description: "Please enter a request title to continue.",
        })
        return
      }

      if (formData.useIONumber === "yes" && !formData.ioNumber) {
        toast({
          title: "Required Field Missing",
          description: "Please select an IO Number to continue.",
        })
        return
      }
    }

    // If moving from step 2 to step 3, save samples to localStorage
    if (currentStep === 2) {
      try {
        localStorage.setItem("ntrSamples", JSON.stringify(formData.samples))
      } catch (error) {
        console.error("Error saving samples to localStorage:", error)
      }
    }

    // If moving from step 1 to step 2, save form data to localStorage
    if (currentStep === 1) {
      try {
        const formDataToSave = {
          requestTitle: formData.requestTitle,
          priority: formData.priority,
          useIONumber: formData.useIONumber,
          ioNumber: formData.ioNumber,
          costCenter: formData.costCenter,
          approver: formData.approver,
          urgencyType: formData.urgencyType,
          urgencyReason: formData.urgencyReason,
          // Add on behalf information
          isOnBehalf: formData.isOnBehalf,
          onBehalfOfUser: formData.onBehalfOfUser,
          onBehalfOfName: formData.onBehalfOfName,
          onBehalfOfEmail: formData.onBehalfOfEmail,
          onBehalfOfCostCenter: formData.onBehalfOfCostCenter,
        };

        // Save to both regular and persistent storage
        localStorage.setItem("ntrFormData", JSON.stringify(formDataToSave));
        localStorage.setItem("ntrFormData_persistent", JSON.stringify(formDataToSave));

        console.log("Saved form data to both storages in nextStep:", formDataToSave);
      } catch (error) {
        console.error("Error saving form data to localStorage:", error)
      }
    }

    setCurrentStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1)
  }

  // Function to start adding samples
  const startAddingSamples = () => {
    setShowSampleSections(true)
    setTimeout(() => {
      if (automaticNamingRef.current) {
        automaticNamingRef.current.scrollIntoView({ behavior: "smooth" })
        setFocusedSection("naming")
        setTimeout(() => {
          setFocusedSection(null)
          highlightNextEmptyField()
        }, 1000)
      }
    }, 100)
  }

  // Function to render sample form fields based on category
  const renderSampleFields = () => {
    switch (sampleCategory) {
      case "commercial":
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                {loadingGrades ? (
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">Loading grades...</span>
                  </div>
                ) : (
                  <SearchableSelect
                    id="grade"
                    options={commercialGrades.length > 0 ? commercialGrades : mockGrades}
                    value={currentSample.grade || ""}
                    onChange={(value) => handleSampleChange("grade", value)}
                    placeholder="Search grade..."
                    className={highlightedField === "grade" ? "ring-2 ring-blue-500 border-blue-500" : ""}
                  />
                )}
                {gradesError && (
                  <p className="text-xs text-red-500 mt-1">Error loading grades: {gradesError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot">Lot</Label>
                <Input
                  id="lot"
                  value={currentSample.lot || ""}
                  onChange={(e) => handleSampleChange("lot", e.target.value)}
                  className={highlightedField === "lot" ? "ring-2 ring-blue-500 border-blue-500" : ""}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sample-identity">Sample Identity</Label>
                <Input
                  id="sample-identity"
                  value={currentSample.sampleIdentity || ""}
                  onChange={(e) => handleSampleChange("sampleIdentity", e.target.value)}
                  className={highlightedField === "sampleIdentity" ? "ring-2 ring-blue-500 border-blue-500" : ""}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={currentSample.type || ""} onValueChange={(value) => handleSampleChange("type", value)}>
                  <SelectTrigger
                    id="type"
                    className={`w-full ${highlightedField === "type" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Select value={currentSample.form || ""} onValueChange={(value) => handleSampleChange("form", value)}>
                  <SelectTrigger
                    id="form"
                    className={`w-full ${highlightedField === "form" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case "td":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tech">Tech/CAT</Label>
                {loadingAppTechs ? (
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">Loading Tech/CAT options...</span>
                  </div>
                ) : (
                  <AutocompleteInput
                    id="tech"
                    options={techCatOptions.length > 0 ? techCatOptions : [{ value: "", label: "No Tech/CAT options available", shortText: "" }]}
                    value={currentSample.tech || ""}
                    onChange={(value) => handleSampleChange("tech", value)}
                    placeholder="Search Tech/CAT"
                    allowCustomValue={appTechError !== null}
                    className={`${highlightedField === "tech" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  />
                )}
                {appTechError && (
                  <p className="text-xs text-red-500 mt-1">Error loading Tech/CAT options: {appTechError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="feature">Feature/App</Label>
                {loadingAppTechs ? (
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">Loading Feature/App options...</span>
                  </div>
                ) : (
                  <AutocompleteInput
                    id="feature"
                    options={featureAppOptions.length > 0 ? featureAppOptions : [{ value: "", label: "No Feature/App options available", shortText: "" }]}
                    value={currentSample.feature || ""}
                    onChange={(value) => handleSampleChange("feature", value)}
                    placeholder="Search Feature/App"
                    allowCustomValue={appTechError !== null}
                    className={`${highlightedField === "feature" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  />
                )}
                {appTechError && (
                  <p className="text-xs text-red-500 mt-1">Error loading Feature/App options: {appTechError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sample-identity">Sample Identity</Label>
                <Input
                  id="sample-identity"
                  value={currentSample.sampleIdentity || ""}
                  onChange={(e) => handleSampleChange("sampleIdentity", e.target.value)}
                  className={`${highlightedField === "sampleIdentity" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={currentSample.type || ""} onValueChange={(value) => handleSampleChange("type", value)}>
                  <SelectTrigger
                    id="type"
                    className={`w-full ${highlightedField === "type" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Select value={currentSample.form || ""} onValueChange={(value) => handleSampleChange("form", value)}>
                  <SelectTrigger
                    id="form"
                    className={`w-full ${highlightedField === "form" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case "benchmark":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feature">Feature/App</Label>
                {loadingAppTechs ? (
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">Loading Feature/App options...</span>
                  </div>
                ) : (
                  <AutocompleteInput
                    id="feature"
                    options={featureAppOptions.length > 0 ? featureAppOptions : [{ value: "", label: "No Feature/App options available", shortText: "" }]}
                    value={currentSample.feature || ""}
                    onChange={(value) => handleSampleChange("feature", value)}
                    placeholder="Search Feature/App"
                    allowCustomValue={appTechError !== null}
                    className={`${highlightedField === "feature" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  />
                )}
                {appTechError && (
                  <p className="text-xs text-red-500 mt-1">Error loading Feature/App options: {appTechError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sample-identity">Sample Identity</Label>
                <Input
                  id="sample-identity"
                  value={currentSample.sampleIdentity || ""}
                  onChange={(e) => handleSampleChange("sampleIdentity", e.target.value)}
                  className={`${highlightedField === "sampleIdentity" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={currentSample.type || ""} onValueChange={(value) => handleSampleChange("type", value)}>
                  <SelectTrigger
                    id="type"
                    className={`w-full ${highlightedField === "type" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Select value={currentSample.form || ""} onValueChange={(value) => handleSampleChange("form", value)}>
                  <SelectTrigger
                    id="form"
                    className={`w-full ${highlightedField === "form" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case "inprocess":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="plant">Plant</Label>
                <Select value={currentSample.plant || ""} onValueChange={(value) => handleSampleChange("plant", value)}>
                  <SelectTrigger
                    id="plant"
                    className={`w-full ${highlightedField === "plant" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantOptions.map((plant) => (
                      <SelectItem key={plant.value} value={plant.value}>
                        {plant.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="samplingDate">Sampling Date</Label>
                <Input
                  id="samplingDate"
                  value={currentSample.samplingDate || ""}
                  onChange={(e) => handleSampleChange("samplingDate", e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className={`${highlightedField === "samplingDate" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="samplingTime">Sampling Time</Label>
                <Input
                  id="samplingTime"
                  value={currentSample.samplingTime || ""}
                  onChange={(e) => handleSampleChange("samplingTime", e.target.value)}
                  placeholder="HH:MM"
                  className={`${highlightedField === "samplingTime" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sample-identity">Sample Identity</Label>
                <Input
                  id="sample-identity"
                  value={currentSample.sampleIdentity || ""}
                  onChange={(e) => handleSampleChange("sampleIdentity", e.target.value)}
                  className={`${highlightedField === "sampleIdentity" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={currentSample.type || ""} onValueChange={(value) => handleSampleChange("type", value)}>
                  <SelectTrigger
                    id="type"
                    className={`w-full ${highlightedField === "type" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Select value={currentSample.form || ""} onValueChange={(value) => handleSampleChange("form", value)}>
                  <SelectTrigger
                    id="form"
                    className={`w-full ${highlightedField === "form" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case "chemicals":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="plant">Plant</Label>
                <Select value={currentSample.plant || ""} onValueChange={(value) => handleSampleChange("plant", value)}>
                  <SelectTrigger
                    id="plant"
                    className={`w-full ${highlightedField === "plant" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select plant" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantOptions.map((plant) => (
                      <SelectItem key={plant.value} value={plant.value}>
                        {plant.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="samplingDate">Sampling Date</Label>
                <Input
                  id="samplingDate"
                  value={currentSample.samplingDate || ""}
                  onChange={(e) => handleSampleChange("samplingDate", e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className={`${highlightedField === "samplingDate" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="samplingTime">Sampling Time</Label>
                <Input
                  id="samplingTime"
                  value={currentSample.samplingTime || ""}
                  onChange={(e) => handleSampleChange("samplingTime", e.target.value)}
                  placeholder="HH:MM"
                  className={`${highlightedField === "samplingTime" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sample-identity">Sample Identity</Label>
                <Input
                  id="sample-identity"
                  value={currentSample.sampleIdentity || ""}
                  onChange={(e) => handleSampleChange("sampleIdentity", e.target.value)}
                  className={`${highlightedField === "sampleIdentity" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={currentSample.type || ""} onValueChange={(value) => handleSampleChange("type", value)}>
                  <SelectTrigger
                    id="type"
                    className={`w-full ${highlightedField === "type" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Select value={currentSample.form || ""} onValueChange={(value) => handleSampleChange("form", value)}>
                  <SelectTrigger
                    id="form"
                    className={`w-full ${highlightedField === "form" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case "cap":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feature">Feature/App</Label>
                {loadingAppTechs ? (
                  <div className="flex items-center space-x-2 p-2 border rounded-md">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">Loading Feature/App options...</span>
                  </div>
                ) : (
                  <AutocompleteInput
                    id="feature"
                    options={featureAppOptions.length > 0 ? featureAppOptions : [{ value: "", label: "No Feature/App options available", shortText: "" }]}
                    value={currentSample.feature || ""}
                    onChange={(value) => handleSampleChange("feature", value)}
                    placeholder="Search Feature/App"
                    allowCustomValue={appTechError !== null}
                    className={`${highlightedField === "feature" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  />
                )}
                {appTechError && (
                  <p className="text-xs text-red-500 mt-1">Error loading Feature/App options: {appTechError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sample-identity">Sample Identity</Label>
                <Input
                  id="sample-identity"
                  value={currentSample.sampleIdentity || ""}
                  onChange={(e) => handleSampleChange("sampleIdentity", e.target.value)}
                  className={`${highlightedField === "sampleIdentity" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={currentSample.type} onValueChange={(value) => handleSampleChange("type", value)}>
                  <SelectTrigger
                    id="type"
                    className={`w-full ${highlightedField === "type" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Select value={currentSample.form} onValueChange={(value) => handleSampleChange("form", value)}>
                  <SelectTrigger
                    id="form"
                    className={`w-full ${highlightedField === "form" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                  >
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {formOptions.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Add a new function to convert samples to CSV format
  const convertSamplesToCSV = (samples: any[]) => {
    if (samples.length === 0) return '';

    // Get all possible headers from all samples
    const allKeys = new Set<string>();
    samples.forEach(sample => {
      Object.keys(sample).forEach(key => allKeys.add(key));
    });

    // Convert Set to Array and join with commas for the header row
    const headers = Array.from(allKeys);
    const headerRow = headers.join(',');

    // Create data rows
    const dataRows = samples.map(sample => {
      return headers.map(header => {
        // Handle fields that might contain commas by wrapping in quotes
        const value = sample[header] || '';
        return value.includes(',') ? `"${value}"` : value;
      }).join(',');
    });

    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n');
  };

  // Add a new function to handle saving samples as CSV
  const handleSaveCSV = () => {
    if (formData.samples.length === 0) {
      toast({
        title: "No samples to save",
        description: "Please add samples before saving.",
      });
      return;
    }

    const csvContent = convertSamplesToCSV(formData.samples);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const link = document.createElement('a');
    const fileName = sampleListName || `samples_${new Date().toISOString().slice(0,10)}`;
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.display = 'none';

    // Append the link to the body, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowSaveDialog(false);
    setSampleListName("");

    toast({
      title: "Samples saved",
      description: `${formData.samples.length} samples saved as CSV file.`,
    });
  };

  // Add a function to parse CSV back to sample objects
  const parseCSVToSamples = (csvText: string) => {
    const lines = csvText.split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    const samples = lines.slice(1).map(line => {
      const values = line.split(',');
      const sample: any = {};

      headers.forEach((header, index) => {
        // Handle quoted values
        let value = values[index] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        sample[header] = value;
      });

      return sample;
    });

    return samples.filter(sample => sample.generatedName); // Filter out empty rows
  };

  // Add a function to handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const samples = parseCSVToSamples(csvText);

        if (samples.length === 0) {
          toast({
            title: "Invalid CSV format",
            description: "Could not parse any valid samples from the file.",
          });
          return;
        }

        setFormData((prev) => ({
          ...prev,
          samples: [...samples],
        }));

        setShowLoadDialog(false);
        setShowSampleSections(true);

        toast({
          title: "Samples loaded",
          description: `${samples.length} samples loaded from CSV file.`,
        });
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast({
          title: "Error loading samples",
          description: "Failed to parse the CSV file. Please check the format.",
        });
      }
    };

    reader.readAsText(file);
  };

  // Open the sample dialog for adding a new sample
  const openAddSampleDialog = () => {
    setEditMode(false)
    setEditingSampleIndex(null)
    setCurrentSample({
      category: "",
      grade: "",
      lot: "",
      sampleIdentity: "",
      type: "",
      form: "",
      tech: "",
      feature: "",
      plant: "",
      samplingDate: "",
      samplingTime: "",
      generatedName: "",
    })
    setSampleCategory("")
    setShowSampleSections(true)
    setSampleDialogOpen(true)
    setTimeout(() => {
      highlightNextEmptyField()
    }, 100)
  }

  // Open the sample dialog for editing an existing sample
  const openEditSampleDialog = (sample: Sample, index: number) => {
    setCurrentSample({ ...sample })
    setSampleCategory(sample.category)
    setEditMode(true)
    setEditingSampleIndex(index)
    setSampleDialogOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Edit Normal Test Request (NTR)" : "Create Normal Test Request (NTR)"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? "Modify your existing test request details and samples"
              : "Request standard polymer testing methods with predefined parameters and workflows"
            }
          </p>
          {isEditMode && editRequestId && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Editing Request:</strong> {editRequestId}
              </p>
            </div>
          )}
        </div>

        {/* Loading indicator for edit mode */}
        {isEditMode && loadingEditData && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
              <span className="text-sm text-gray-600">Loading request data for editing...</span>
            </div>
          </div>
        )}

        {/* Error indicator for edit mode */}
        {isEditMode && editDataError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 text-red-500">⚠️</div>
              <div>
                <p className="text-sm text-red-700 font-medium">Failed to load request data</p>
                <p className="text-xs text-red-600">{editDataError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4 mb-6">
          <div className={`relative flex items-center justify-center h-10 w-10 rounded-full border ${currentStep >= 1 ? "bg-green-500 border-green-600 text-white" : "bg-muted border-muted-foreground/20 text-muted-foreground"}`}>
            1
          </div>
          <div className={`h-px flex-1 ${currentStep >= 2 ? "bg-green-500" : "bg-muted"}`} />
          <div className={`relative flex items-center justify-center h-10 w-10 rounded-full border ${currentStep >= 2 ? "bg-green-500 border-green-600 text-white" : "bg-muted border-muted-foreground/20 text-muted-foreground"}`}>
            2
          </div>
          <div className={`h-px flex-1 ${currentStep >= 3 ? "bg-green-500" : "bg-muted"}`} />
          <div className={`relative flex items-center justify-center h-10 w-10 rounded-full border ${currentStep >= 3 ? "bg-green-500 border-green-600 text-white" : "bg-muted border-muted-foreground/20 text-muted-foreground"}`}>
            3
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Request Information</CardTitle>
                  <CardDescription>Provide basic information about your test request</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="request-title">Request Title</Label>
                    <Input
                      id="request-title"
                      name="requestTitle"
                      value={formData.requestTitle}
                      onChange={handleChange}
                      placeholder="Enter a descriptive title for your request"
                      className={`w-full ${currentStep === 1 && !formData.requestTitle ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                      autoFocus
                      autoComplete="off"
                    />
                    {currentStep === 1 && !formData.requestTitle && (
                      <p className="text-sm text-red-500">Please enter a request title to continue</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <RadioGroup
                      value={formData.priority}
                      onValueChange={(value) => handleSelectChange("priority", value)}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="normal" id="priority-normal" />
                        <Label htmlFor="priority-normal" className="font-normal">
                          Normal (Approximately 14 working days)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="urgent" id="priority-urgent" />
                        <Label htmlFor="priority-urgent" className="font-normal">
                          Urgent (Min. 5 days, higher cost)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Use IO Number</Label>
                    <RadioGroup
                      value={formData.useIONumber}
                      onValueChange={(value) => handleSelectChange("useIONumber", value)}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="use-io-yes" />
                        <Label htmlFor="use-io-yes" className="font-normal">
                          Yes, use IO Number
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="use-io-no" />
                        <Label htmlFor="use-io-no" className="font-normal">
                          No, don't use IO Number
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {formData.useIONumber === "yes" && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="io-number">IO Number</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-80 text-sm">Select the IO Number associated with your project.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Select
                            value={formData.ioNumber}
                            onValueChange={(value) => handleSelectChange("ioNumber", value)}
                            disabled={loadingIoOptions}
                          >
                            <SelectTrigger
                              id="io-number"
                              className={
                                formData.useIONumber === "yes" && !formData.ioNumber
                                  ? "ring-2 ring-blue-500 border-blue-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select IO Number" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {loadingIoOptions ? (
                                <SelectItem value="loading" disabled>Loading IO Numbers...</SelectItem>
                              ) : (
                                ioOptions.map((io) => (
                                  <SelectItem key={io.value} value={io.value}>
                                    {io.label}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {ioError && (
                            <p className="text-sm text-red-500">Failed to load IO Numbers: {ioError}</p>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="cost-center">Cost Center</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-80 text-sm">This is automatically populated based on your profile.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          id="cost-center"
                          name="costCenter"
                          value={formData.costCenter}
                          disabled
                          className="bg-gray-100"
                          autoComplete="off"
                        />
                        {loadingCostCenter && (
                          <p className="text-sm text-muted-foreground">Loading cost center...</p>
                        )}
                        {costCenterError && (
                          <p className="text-sm text-red-500">Failed to load cost center: {costCenterError}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* On Behalf Of section */}
                  <div className="space-y-2">
                    <Label>Create Request on Behalf of Someone</Label>
                    <RadioGroup
                      value={formData.isOnBehalf ? "yes" : "no"}
                      onValueChange={(value) => handleOnBehalfToggle(value === "yes")}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="on-behalf-no" />
                        <Label htmlFor="on-behalf-no" className="font-normal">
                          No, create request for myself
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="on-behalf-yes" />
                        <Label htmlFor="on-behalf-yes" className="font-normal">
                          Yes, create request on behalf of someone else
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.isOnBehalf && (
                    <div className="space-y-4 p-4 border rounded-md bg-blue-50">
                      <h3 className="font-medium">On Behalf Details</h3>

                      <div className="space-y-2">
                        <Label htmlFor="on-behalf-user">Select User</Label>
                        <Select
                          value={formData.onBehalfOfUser}
                          onValueChange={handleOnBehalfUserChange}
                          disabled={loadingOnBehalfUsers || onBehalfUsers.length === 0}
                        >
                          <SelectTrigger id="on-behalf-user">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {loadingOnBehalfUsers ? (
                              <SelectItem value="loading" disabled>Loading users...</SelectItem>
                            ) : onBehalfUsers.length > 0 ? (
                              onBehalfUsers.map((user) => (
                                <SelectItem key={user.value} value={user.value}>
                                  {user.label} ({user.email})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No users available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {onBehalfUsersError ? (
                          <p className="text-sm text-red-500">Failed to load users: {onBehalfUsersError}</p>
                        ) : onBehalfUsers.length === 0 && !loadingOnBehalfUsers ? (
                          <div>
                            <p className="text-sm text-amber-600 mb-1">No users found that you can create requests on behalf of.</p>
                            <p className="text-xs text-muted-foreground">This could be because:</p>
                            <ul className="text-xs text-muted-foreground list-disc pl-5 mt-1">
                              <li>You don't have any users in your "On Behalf Access" list</li>
                              <li>The database configuration needs to be updated</li>
                              <li>There's a data format issue in the user records</li>
                            </ul>
                            <p className="text-xs text-muted-foreground mt-1">Please contact an administrator for assistance.</p>
                          </div>
                        ) : null}
                      </div>

                      {formData.onBehalfOfUser && (
                        <div className="space-y-2">
                          <Label htmlFor="on-behalf-cost-center">User's Cost Center</Label>
                          <Input
                            id="on-behalf-cost-center"
                            value={formData.onBehalfOfCostCenter}
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {formData.priority === "urgent" && (
                    <div className="space-y-4 p-4 border rounded-md bg-blue-50">
                      <h3 className="font-medium">Urgent Request Details</h3>

                      <div className="space-y-2">
                        <Label htmlFor="urgency-type">Urgency Type</Label>
                        <Select
                          value={formData.urgencyType}
                          onValueChange={(value) => handleSelectChange("urgencyType", value)}
                        >
                          <SelectTrigger id="urgency-type">
                            <SelectValue placeholder="Select urgency type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {urgencyTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="urgency-reason">Reason for Urgency</Label>
                        <Textarea
                          id="urgency-reason"
                          name="urgencyReason"
                          value={formData.urgencyReason}
                          onChange={handleChange}
                          placeholder="Please explain why this request is urgent"
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="approver">Approver</Label>
                        <Select
                          value={formData.approver}
                          onValueChange={(value) => handleSelectChange("approver", value)}
                          disabled={loadingApprovers || approvers.length === 0}
                        >
                          <SelectTrigger id="approver">
                            <SelectValue placeholder="Select approver" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {loadingApprovers ? (
                              <SelectItem value="loading" disabled>Loading approvers...</SelectItem>
                            ) : approvers.length > 0 ? (
                              approvers.map((approver) => (
                                <SelectItem key={approver.value} value={approver.value}>
                                  {approver.label}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No approvers available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {approversError ? (
                          <p className="text-sm text-red-500">Failed to load approvers: {approversError}</p>
                        ) : approvers.length === 0 && !loadingApprovers ? (
                          <p className="text-sm text-amber-600">You don't have any approvers assigned to your account. Please contact an administrator.</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="urgent-memo">Urgent Request Memo (Optional)</Label>
                        <div className="flex items-center space-x-2">
                          <Input id="urgent-memo" type="file" className="hidden" onChange={handleFileChange} />
                          <div className="flex-1 rounded-md border border-dashed border-gray-300 p-4 bg-white">
                            <div className="flex flex-col items-center justify-center space-y-2 text-center">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Upload urgent request memo</p>
                                <p className="text-xs text-muted-foreground">
                                  PDF or Word document with approval from your manager
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById("urgent-memo")?.click()}
                              >
                                Select File
                              </Button>
                            </div>
                          </div>
                        </div>
                        {formData.urgentMemo && (
                          <p className="text-sm text-muted-foreground">Selected file: {formData.urgentMemo.name}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Sample Information</CardTitle>
                  <CardDescription>Add one or more samples for testing</CardDescription>
                </CardHeader>
                <CardContent>
                  {formData.samples.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <h3 className="text-lg font-medium">No samples added yet</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Click the button below to start adding samples to your request. You'll be guided through the
                          process step by step.
                        </p>
                        <Button
                          onClick={openAddSampleDialog}
                          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Click to start adding samples
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h3 className="text-lg font-medium">Samples</h3>
                          <p className="text-sm text-muted-foreground">
                            {formData.samples.length} sample(s) added
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" onClick={handleSaveCSV}>
                            <Save className="mr-2 h-4 w-4" />
                            Save CSV
                          </Button>
                          <Button variant="outline" onClick={() => setShowLoadDialog(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Load CSV
                          </Button>
                          <Button
                            onClick={openAddSampleDialog}
                            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Sample
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Sample Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Form</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.samples.map((sample, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs">
                                    {index + 1}
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium">{sample.generatedName}</TableCell>
                                <TableCell>
                                  {sample.category === "commercial"
                                    ? "Commercial Grade"
                                    : sample.category === "td"
                                      ? "TD/NPD"
                                      : sample.category === "benchmark"
                                        ? "Benchmark"
                                        : sample.category === "inprocess"
                                          ? "Inprocess/Chemicals"
                                          : sample.category === "chemicals"
                                            ? "Chemicals/Substances"
                                            : "Cap Development"}
                                </TableCell>
                                <TableCell>{sample.type}</TableCell>
                                <TableCell>{sample.form}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleCopySample(sample)}>
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleEditSample(sample, index)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSample(index)}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Test Method Selection</CardTitle>
                  <CardDescription>Select the test methods you want to apply to your samples</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Manual Selection</Label>
                    <p className="text-sm text-muted-foreground">
                      Browse our comprehensive catalog of test methods and select the ones you need.
                    </p>
                    <Link href={`/request/new/ntr/test-methods${isEditMode ? `?edit=${editRequestId}` : ''}`}>
                      <Button className="mt-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 w-full">
                        {isEditMode ? "Edit Test Method Selection" : "Browse Test Method Catalog"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-6 flex justify-between">
              {currentStep > 1 && (
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {currentStep < 3 ? (
                <Button
                  className="ml-auto bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  onClick={nextStep}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Link href={`/request/new/ntr/summary${isEditMode ? `?edit=${editRequestId}` : ''}`}>
                  <Button className="ml-auto bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
                    {isEditMode ? "Review Changes" : "Submit Request"}
                  </Button>
                </Link>
              )}
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
                    <p className="text-sm font-medium text-muted-foreground">Request Title</p>
                    <p className="font-medium">{formData.requestTitle || "Not specified"}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                    <p className="font-medium capitalize">{formData.priority}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IO Number</p>
                    <p className="font-medium">
                      {formData.useIONumber === "yes" ? formData.ioNumber || "Not selected" : "Not using IO Number"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Samples</p>
                    <p className="text-2xl font-bold">{formData.samples.length}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Test Methods</p>
                    <p className="text-2xl font-bold">{formData.testMethods.length}</p>
                  </div>

                  {formData.priority === "urgent" && formData.approver && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approver</p>
                      <p className="font-medium">
                        {approvers.find(a => a.value === formData.approver)?.label || "Not selected"}
                      </p>
                    </div>
                  )}

                  {formData.isOnBehalf && formData.onBehalfOfName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">On Behalf Of</p>
                      <p className="font-medium">{formData.onBehalfOfName}</p>
                      <p className="text-xs text-muted-foreground">{formData.onBehalfOfEmail}</p>
                      <p className="text-xs text-muted-foreground">Cost Center: {formData.onBehalfOfCostCenter || "Not available"}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sample Dialog */}
      <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Sample" : "Add New Sample"}</DialogTitle>
            <DialogDescription>
              {editMode
                ? "Modify the sample details below"
                : "Fill out the sample details to add a new sample to your request"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sample Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="sample-category">Sample Category</Label>
              <Select
                value={sampleCategory}
                onValueChange={(value) => {
                  setSampleCategory(value)
                  setCurrentSample((prev) => ({
                    ...prev,
                    category: value,
                  }))
                }}
              >
                <SelectTrigger
                  id="sample-category"
                  className={highlightedField === "sample-category" ? "ring-2 ring-blue-500 border-blue-500" : ""}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial Grade</SelectItem>
                  <SelectItem value="td">TD/NPD</SelectItem>
                  <SelectItem value="benchmark">Benchmark</SelectItem>
                  <SelectItem value="inprocess">Inprocess/Chemicals</SelectItem>
                  <SelectItem value="chemicals">Chemicals/Substances</SelectItem>
                  <SelectItem value="cap">Cap Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sample Fields based on category */}
            {sampleCategory && (
              <div className="space-y-6">
                {/* Category-specific fields */}
                {sampleCategory === "commercial" && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade</Label>
                      {loadingGrades ? (
                        <div className="flex items-center space-x-2 p-2 border rounded-md">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          <span className="text-sm text-muted-foreground">Loading grades...</span>
                        </div>
                      ) : (
                        <SearchableSelect
                          id="grade"
                          options={commercialGrades.length > 0 ? commercialGrades : mockGrades}
                          value={currentSample.grade || ""}
                          onChange={(value) => handleSampleChange("grade", value)}
                          placeholder="Search grade..."
                          className={highlightedField === "grade" ? "ring-2 ring-blue-500 border-blue-500" : ""}
                        />
                      )}
                      {gradesError && (
                        <p className="text-xs text-red-500 mt-1">Error loading grades: {gradesError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lot">Lot</Label>
                      <Input
                        id="lot"
                        value={currentSample.lot || ""}
                        onChange={(e) => handleSampleChange("lot", e.target.value)}
                        className={highlightedField === "lot" ? "ring-2 ring-blue-500 border-blue-500" : ""}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}

                {sampleCategory === "td" && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tech">Tech/CAT</Label>
                      {loadingAppTechs ? (
                        <div className="flex items-center space-x-2 p-2 border rounded-md">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          <span className="text-sm text-muted-foreground">Loading Tech/CAT options...</span>
                        </div>
                      ) : (
                        <AutocompleteInput
                          id="tech"
                          options={techCatOptions.length > 0 ? techCatOptions : [{ value: "", label: "No Tech/CAT options available", shortText: "" }]}
                          value={currentSample.tech || ""}
                          onChange={(value) => handleSampleChange("tech", value)}
                          placeholder="Search Tech/CAT"
                          allowCustomValue={appTechError !== null}
                          className={`${highlightedField === "tech" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                        />
                      )}
                      {appTechError && (
                        <p className="text-xs text-red-500 mt-1">Error loading Tech/CAT options: {appTechError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="feature">Feature/App</Label>
                      {loadingAppTechs ? (
                        <div className="flex items-center space-x-2 p-2 border rounded-md">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          <span className="text-sm text-muted-foreground">Loading Feature/App options...</span>
                        </div>
                      ) : (
                        <AutocompleteInput
                          id="feature"
                          options={featureAppOptions.length > 0 ? featureAppOptions : [{ value: "", label: "No Feature/App options available", shortText: "" }]}
                          value={currentSample.feature || ""}
                          onChange={(value) => handleSampleChange("feature", value)}
                          placeholder="Search Feature/App"
                          allowCustomValue={appTechError !== null}
                          className={`${highlightedField === "feature" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                        />
                      )}
                      {appTechError && (
                        <p className="text-xs text-red-500 mt-1">Error loading Feature/App options: {appTechError}</p>
                      )}
                    </div>
                  </div>
                )}

                {sampleCategory === "benchmark" && (
                  <div className="space-y-2">
                    <Label htmlFor="feature">Feature/App</Label>
                    {loadingAppTechs ? (
                      <div className="flex items-center space-x-2 p-2 border rounded-md">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                        <span className="text-sm text-muted-foreground">Loading Feature/App options...</span>
                      </div>
                    ) : (
                      <AutocompleteInput
                        id="feature"
                        options={featureAppOptions.length > 0 ? featureAppOptions : [{ value: "", label: "No Feature/App options available", shortText: "" }]}
                        value={currentSample.feature || ""}
                        onChange={(value) => handleSampleChange("feature", value)}
                        placeholder="Search Feature/App"
                        allowCustomValue={appTechError !== null}
                        className={`${highlightedField === "feature" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                      />
                    )}
                    {appTechError && (
                      <p className="text-xs text-red-500 mt-1">Error loading Feature/App options: {appTechError}</p>
                    )}
                  </div>
                )}

                {(sampleCategory === "inprocess" || sampleCategory === "chemicals") && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="plant">Plant</Label>
                      <Select
                        value={currentSample.plant || ""}
                        onValueChange={(value) => handleSampleChange("plant", value)}
                      >
                        <SelectTrigger
                          id="plant"
                          className={`w-full ${highlightedField === "plant" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                        >
                          <SelectValue placeholder="Select plant" />
                        </SelectTrigger>
                        <SelectContent>
                          {plantOptions.map((plant) => (
                            <SelectItem key={plant.value} value={plant.value}>
                              {plant.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="samplingDate">Sampling Date</Label>
                      <Input
                        id="samplingDate"
                        value={currentSample.samplingDate || ""}
                        onChange={(e) => handleSampleChange("samplingDate", e.target.value)}
                        placeholder="MM/DD/YYYY"
                        className={`${highlightedField === "samplingDate" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="samplingTime">Sampling Time</Label>
                      <Input
                        id="samplingTime"
                        value={currentSample.samplingTime || ""}
                        onChange={(e) => handleSampleChange("samplingTime", e.target.value)}
                        placeholder="HH:MM"
                        className={`${highlightedField === "samplingTime" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}

                {sampleCategory === "cap" && (
                  <div className="space-y-2">
                    <Label htmlFor="feature">Feature/App</Label>
                    {loadingAppTechs ? (
                      <div className="flex items-center space-x-2 p-2 border rounded-md">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                        <span className="text-sm text-muted-foreground">Loading Feature/App options...</span>
                      </div>
                    ) : (
                      <AutocompleteInput
                        id="feature"
                        options={featureAppOptions.length > 0 ? featureAppOptions : [{ value: "", label: "No Feature/App options available", shortText: "" }]}
                        value={currentSample.feature || ""}
                        onChange={(value) => handleSampleChange("feature", value)}
                        placeholder="Search Feature/App"
                        allowCustomValue={appTechError !== null}
                        className={`${highlightedField === "feature" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                      />
                    )}
                    {appTechError && (
                      <p className="text-xs text-red-500 mt-1">Error loading Feature/App options: {appTechError}</p>
                    )}
                  </div>
                )}

                {/* Common fields for all sample categories */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="sample-identity">Sample Identity</Label>
                    <Input
                      id="sample-identity"
                      value={currentSample.sampleIdentity || ""}
                      onChange={(e) => handleSampleChange("sampleIdentity", e.target.value)}
                      className={highlightedField === "sampleIdentity" ? "ring-2 ring-blue-500 border-blue-500" : ""}
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={currentSample.type || ""} onValueChange={(value) => handleSampleChange("type", value)}>
                      <SelectTrigger
                        id="type"
                        className={`w-full ${highlightedField === "type" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="form">Form</Label>
                    <Select value={currentSample.form || ""} onValueChange={(value) => handleSampleChange("form", value)}>
                      <SelectTrigger
                        id="form"
                        className={`w-full ${highlightedField === "form" ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
                      >
                        <SelectValue placeholder="Select form" />
                      </SelectTrigger>
                      <SelectContent>
                        {formOptions.map((form) => (
                          <SelectItem key={form.value} value={form.value}>
                            {form.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generated-name">Generated Sample Name</Label>
                  <Input
                    id="generated-name"
                    value={currentSample.generatedName || ""}
                    disabled
                    className="bg-gray-100 font-medium"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSampleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSample}
              disabled={!currentSample.generatedName}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              {editMode ? "Update Sample" : "Add Sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Sample Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Sample List</DialogTitle>
            <DialogDescription>Upload a previously saved sample list (CSV format)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="csv-upload">Upload CSV File</Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
              <p className="text-sm text-muted-foreground mt-2">
                The CSV file should contain sample data exported from this application.
              </p>
            </div>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Or select a saved list:</h4>
              {savedSampleLists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved sample lists found.</p>
              ) : (
                <div className="space-y-2">
                  {savedSampleLists.map((list) => (
                    <div
                      key={list.id}
                      className="flex justify-between items-center p-3 border rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => handleLoadSampleList(list.id)}
                    >
                      <div>
                        <p className="font-medium">{list.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {list.samples.length} sample(s)
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Load
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

