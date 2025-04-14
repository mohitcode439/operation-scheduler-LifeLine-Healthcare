"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import {
  HospitalIcon,
  Menu,
  Home,
  Calendar,
  Users,
  UserCircle,
  ClipboardList,
  BarChart,
  Settings,
  LogOut,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      logger.info("Logout initiated")
      await logout()
      router.push("/")
    } catch (error) {
      logger.error("Logout error", error)
    }
  }

  const isAdmin = user?.role === "admin"

  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home, showFor: ["admin", "user"] },
    { name: "Schedule", href: "/dashboard/schedule", icon: Calendar, showFor: ["admin", "user"] },
    { name: "Doctors", href: "/dashboard/doctors", icon: UserCircle, showFor: ["admin", "user"] },
    { name: "Patients", href: "/dashboard/patients", icon: Users, showFor: ["admin"] },
    { name: "Operations", href: "/dashboard/operations", icon: ClipboardList, showFor: ["admin", "user"] },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart, showFor: ["admin"] },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, showFor: ["admin", "user"] },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <HospitalIcon className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-xl font-semibold">Operation Scheduler</span>
          </div>
          <div className="flex flex-col flex-grow">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigationItems.map((item) => {
                if (!item.showFor.includes(user?.role || "user")) return null

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      pathname === item.href
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        pathname === item.href ? "text-blue-700" : "text-gray-500"
                      }`}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.displayName || "User"}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                    {user?.role === "admin" ? "Administrator" : "User"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4">
          <div className="flex items-center">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center flex-shrink-0 px-4 h-16">
                    <HospitalIcon className="h-8 w-8 text-blue-600 mr-2" />
                    <span className="text-xl font-semibold">Operation Scheduler</span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <nav className="px-2 pt-2 pb-4 space-y-1">
                      {navigationItems.map((item) => {
                        if (!item.showFor.includes(user?.role || "user")) return null

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                              pathname === item.href
                                ? "bg-blue-100 text-blue-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          >
                            <item.icon
                              className={`mr-3 flex-shrink-0 h-6 w-6 ${
                                pathname === item.href ? "text-blue-700" : "text-gray-500"
                              }`}
                            />
                            {item.name}
                          </Link>
                        )
                      })}
                    </nav>
                  </div>
                  <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                    <div className="flex-shrink-0 w-full group block">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            {user?.displayName || "User"}
                          </p>
                          <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                            {user?.role === "admin" ? "Administrator" : "User"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                    <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                      <LogOut className="mr-3 h-5 w-5" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <HospitalIcon className="h-8 w-8 text-blue-600 ml-2" />
            <span className="text-xl font-semibold ml-2">Operation Scheduler</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none pt-16 md:pt-0">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
