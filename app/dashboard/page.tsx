"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { logger } from "@/lib/logger"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { CalendarIcon, UserCircleIcon, ClipboardListIcon, AlertCircleIcon } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    scheduledOperations: 0,
    upcomingOperations: 0,
  })
  const [recentOperations, setRecentOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        logger.info("Fetching dashboard data")
        setLoading(true)

        // Fetch counts
        const doctorsSnapshot = await getDocs(collection(db, "doctors"))
        const patientsSnapshot = await getDocs(collection(db, "patients"))

        const now = new Date()
        const operationsQuery = query(collection(db, "operations"))
        const operationsSnapshot = await getDocs(operationsQuery)

        const upcomingOperationsQuery = query(
          collection(db, "operations"),
          where("date", ">=", now),
          orderBy("date", "asc"),
        )
        const upcomingOperationsSnapshot = await getDocs(upcomingOperationsQuery)

        // Fetch recent operations
        const recentOperationsQuery = query(collection(db, "operations"), orderBy("date", "desc"), limit(5))
        const recentOperationsSnapshot = await getDocs(recentOperationsQuery)

        const recentOps = recentOperationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setStats({
          totalDoctors: doctorsSnapshot.size,
          totalPatients: patientsSnapshot.size,
          scheduledOperations: operationsSnapshot.size,
          upcomingOperations: upcomingOperationsSnapshot.size,
        })

        setRecentOperations(recentOps)
        logger.info("Dashboard data fetched successfully")
      } catch (error) {
        logger.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [db, user])

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (error) {
      logger.error("Error formatting date:", error)
      return "Invalid date"
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.displayName || "User"}!</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
              <UserCircleIcon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.totalDoctors}</div>
              <p className="text-xs text-gray-500">Registered medical professionals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <UserCircleIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.totalPatients}</div>
              <p className="text-xs text-gray-500">Registered patients</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Operations</CardTitle>
              <ClipboardListIcon className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.scheduledOperations}</div>
              <p className="text-xs text-gray-500">Total operations scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Operations</CardTitle>
              <CalendarIcon className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.upcomingOperations}</div>
              <p className="text-xs text-gray-500">Operations in the future</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recent">Recent Operations</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Operations</TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Operations</CardTitle>
                <CardDescription>The most recent operations scheduled in the system.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading recent operations...</div>
                ) : recentOperations.length > 0 ? (
                  <div className="space-y-4">
                    {recentOperations.map((operation) => (
                      <div key={operation.id} className="flex items-center p-4 border rounded-lg">
                        <div className="mr-4 bg-blue-100 p-2 rounded-full">
                          <ClipboardListIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{operation.patientName || "Unknown Patient"}</h3>
                          <p className="text-sm text-gray-500">
                            {operation.operationType || "General Surgery"} • OT #{operation.operatingTheater || "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatDate(operation.date)}</p>
                          <p className="text-xs text-gray-500">Dr. {operation.doctorName || "Unknown"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 flex flex-col items-center">
                    <AlertCircleIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <p>No operations found. Schedule an operation to see it here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Operations</CardTitle>
                <CardDescription>Operations scheduled for the future.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading upcoming operations...</div>
                ) : recentOperations.filter(
                    (op) => op.date && new Date(op.date.toDate ? op.date.toDate() : op.date) > new Date(),
                  ).length > 0 ? (
                  <div className="space-y-4">
                    {recentOperations
                      .filter((op) => op.date && new Date(op.date.toDate ? op.date.toDate() : op.date) > new Date())
                      .sort((a, b) => {
                        const dateA = new Date(a.date.toDate ? a.date.toDate() : a.date)
                        const dateB = new Date(b.date.toDate ? b.date.toDate() : b.date)
                        return dateA.getTime() - dateB.getTime()
                      })
                      .map((operation) => (
                        <div key={operation.id} className="flex items-center p-4 border rounded-lg">
                          <div className="mr-4 bg-green-100 p-2 rounded-full">
                            <CalendarIcon className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">{operation.patientName || "Unknown Patient"}</h3>
                            <p className="text-sm text-gray-500">
                              {operation.operationType || "General Surgery"} • OT #{operation.operatingTheater || "N/A"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatDate(operation.date)}</p>
                            <p className="text-xs text-gray-500">Dr. {operation.doctorName || "Unknown"}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 flex flex-col items-center">
                    <AlertCircleIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <p>No upcoming operations found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
