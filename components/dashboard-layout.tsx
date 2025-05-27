"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Microscope,
  Package,
  Settings,
  User,
  X,
  ChevronDown,
  ChevronRight,
  Wrench,
  AlertTriangle,
  FlaskConical,
  Beaker,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "./auth-provider"
import ProtectedRoute from "./protected-route"

interface SidebarNavProps {
  isCollapsed: boolean
  links: {
    title: string
    label?: string
    icon: React.ReactNode
    variant: "default" | "ghost"
    href?: string
    subItems?: {
      title: string
      href: string
      icon?: React.ReactNode
    }[]
  }[]
  setIsCollapsed: (collapsed: boolean) => void
}

function SidebarNav({ links, isCollapsed, setIsCollapsed }: SidebarNavProps) {
  const pathname = usePathname()
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({})

  const toggleSubMenu = (title: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  return (
    <div data-collapsed={isCollapsed} className="relative group flex flex-col h-full py-2 data-[collapsed=true]:py-2">
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) =>
          link.href ? (
            <Link
              key={index}
              href={link.href}
              className={`flex items-center justify-between h-10 ${
                isCollapsed ? "justify-center w-10 px-0" : "px-3"
              } text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground ${
                pathname === link.href ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {link.icon}
                {!isCollapsed && <span>{link.title}</span>}
              </div>
              {!isCollapsed && link.label && <span className="ml-auto text-xs font-medium">{link.label}</span>}
            </Link>
          ) : (
            <div key={index}>
              <div
                className={`flex items-center justify-between h-10 ${
                  isCollapsed ? "justify-center w-10 px-0" : "px-3"
                } text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer`}
                onClick={() => !isCollapsed && link.subItems && toggleSubMenu(link.title)}
              >
                <div className="flex items-center gap-3">
                  {link.icon}
                  {!isCollapsed && <span>{link.title}</span>}
                </div>
                {!isCollapsed && link.subItems && (
                  <div className="ml-auto">
                    {openSubMenus[link.title] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
              {!isCollapsed && link.subItems && openSubMenus[link.title] && (
                <div className="ml-6 mt-1 space-y-1">
                  {link.subItems.map((subItem, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subItem.href}
                      className={`flex items-center h-8 px-3 text-sm text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground ${
                        pathname === subItem.href ? "bg-accent/50 text-accent-foreground" : ""
                      }`}
                    >
                      {subItem.icon && <div className="mr-2">{subItem.icon}</div>}
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </nav>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 hidden h-6 w-6 group-hover:flex"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({})

  const toggleSubMenu = (title: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  // Check if we're on the client-side before using window
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
      }
    }

    // Initial check
    checkIsMobile()

    // Add event listener
    window.addEventListener("resize", checkIsMobile)

    // Cleanup
    return () => {
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    // ลบเงื่อนไขนี้ออกเพราะทำให้เกิดการ redirect ที่ไม่ต้องการ
    // หรือถ้าต้องการให้มีการ redirect เฉพาะเมื่อเข้าสู่ระบบครั้งแรก ให้ใช้เงื่อนไขอื่น
  }, [pathname, router])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const links = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      variant: "default",
      href: "/dashboard",
    },
    {
      title: "Create Request",
      icon: <ClipboardList className="h-5 w-5" />,
      variant: "ghost",
      href: "/request/new",
    },
    {
      title: "Request Management",
      icon: <ClipboardList className="h-5 w-5" />,
      variant: "ghost",
      subItems: [
        {
          title: "NTR",
          href: "/request-management",
          icon: <FlaskConical className="h-4 w-4" />,
        },
        {
          title: "ASR",
          href: "/request-management/asr",
          icon: <Beaker className="h-4 w-4" />,
        },
        {
          title: "ER",
          href: "/request-management/er",
          icon: <Wrench className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Results Repository",
      icon: <FileText className="h-5 w-5" />,
      variant: "ghost",
      href: "/results-repository",
    },
    {
      title: "Analysis Toolkit",
      icon: <BarChart3 className="h-5 w-5" />,
      variant: "ghost",
      href: "/analysis-toolkit",
    },
    {
      title: "Staff Tools",
      icon: <Wrench className="h-5 w-5" />,
      variant: "ghost",
      subItems: [
        {
          title: "LAB360",
          href: "/lab360",
          icon: <FlaskConical className="h-4 w-4" />,
        },
        {
          title: "Equipment Management",
          href: "/lab360/equipment",
          icon: <Microscope className="h-4 w-4" />,
        },
        {
          title: "Spare Parts Inventory",
          href: "/lab360/inventory",
          icon: <Package className="h-4 w-4" />,
        },
        {
          title: "Maintenance & Calibration",
          href: "/lab360/maintenance",
          icon: <Wrench className="h-4 w-4" />,
        },
        {
          title: "Troubleshooting",
          href: "/lab360/troubleshooting",
          icon: <AlertTriangle className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Admin",
      icon: <Settings className="h-5 w-5" />,
      variant: "ghost",
      subItems: [
        {
          title: "User Management",
          href: "/admin/users",
          icon: <User className="h-4 w-4" />,
        },
        {
          title: "Database Configuration",
          href: "/admin/database-config",
          icon: <Package className="h-4 w-4" />,
        },
      ],
    },
  ]

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen w-full flex-col bg-muted/10">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-gradient-to-r from-blue-600 via-blue-500 to-green-500 px-4 sm:px-6 text-white shadow-md">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 md:hidden text-white hover:bg-white/20 hover:text-white"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0">
                  <div className="flex items-center border-b px-4 py-3 bg-gradient-to-r from-blue-600 to-green-500 text-white">
                    <div className="relative h-9 w-9 mr-3">
                      <div className="absolute inset-0 rounded-full bg-white opacity-90" />
                      <div className="absolute inset-[2px] rounded-full bg-gradient-to-r from-blue-600 to-green-500" />
                      <div className="absolute inset-[4px] rounded-full bg-white" />
                    </div>
                    <div className="flex flex-col">
                      <div className="font-bold text-lg">PCRD Smart Request</div>
                      <div className="text-xs text-white/80">Polymer Testing Management</div>
                    </div>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-white hover:bg-white/20 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                  </div>
                  <nav className="flex-1 overflow-auto py-2">
                    <div className="grid gap-1 px-2">
                      {links.map((link, index) =>
                        link.href ? (
                          <Link
                            key={index}
                            href={link.href}
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            {link.icon}
                            <span>{link.title}</span>
                          </Link>
                        ) : (
                          <div key={index}>
                            <div
                              className="flex items-center justify-between rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                              onClick={() => link.subItems && toggleSubMenu(link.title)}
                            >
                              <div className="flex items-center gap-3">
                                {link.icon}
                                <span>{link.title}</span>
                              </div>
                              {link.subItems && (
                                <div>
                                  {openSubMenus[link.title] ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>
                              )}
                            </div>
                            {link.subItems && openSubMenus[link.title] && (
                              <div className="ml-6 mt-1 space-y-1">
                                {link.subItems.map((subItem, subIndex) => (
                                  <Link
                                    key={subIndex}
                                    href={subItem.href}
                                    className="flex items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                  >
                                    {subItem.icon && <div className="mr-2">{subItem.icon}</div>}
                                    {subItem.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </nav>
                  <div className="border-t p-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-muted p-1">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{user?.name || "User"}</div>
                        <div className="text-xs text-muted-foreground">{user?.email || "user@example.com"}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}
            <Link href="/dashboard" className="flex items-center gap-3 py-1">
              <div className="relative h-9 w-9 shadow-lg">
                <div className="absolute inset-0 rounded-full bg-white opacity-90" />
                <div className="absolute inset-[2px] rounded-full bg-gradient-to-r from-blue-600 to-green-500" />
                <div className="absolute inset-[4px] rounded-full bg-white" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <div className="font-bold text-lg tracking-tight">PCRD Smart Request</div>
                  <div className="text-xs text-white/80">Polymer Testing Management</div>
                </div>
              )}
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 bg-white/10 rounded-full py-1 px-3 backdrop-blur-sm">
              <div className="rounded-full bg-white/90 p-1 shadow-sm">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium">{user?.name || "User"}</div>
                <div className="text-xs text-white/80">{user?.email || "user@example.com"}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 hover:text-white rounded-full"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </header>
        <div className="flex flex-1">
          <aside
            className={`${isMobile ? "hidden" : "flex"} w-14 flex-col border-r bg-background transition-all ${
              isCollapsed ? "md:w-14" : "md:w-64"
            }`}
          >
            <SidebarNav links={links} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          </aside>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

