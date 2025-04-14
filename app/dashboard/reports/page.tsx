"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { logger } from "@/lib/logger"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { DownloadIcon, Loader2Icon, AlertCircleIcon } from "lucide-react"

// Define colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

export default function ReportsPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [timeRange, setTimeRange] = useState("month")
  const [operationsByType, setOperationsByType] = useState<any[]>([])
  const [operationsByDoctor, setOperationsByDoctor] = useState<any[]>([])
  const [operationsByTheater, setOperationsByTheater] = useState<any[]>([])
  const [operationsList, setOperationsList] = useState<any[]>([])
  const [operationsByStatus, setOperationsByStatus] = useState<any[]>([])

  useEffect(() => {
    setIsAdmin(user?.role === "admin")

    if (user && user.role !== "admin") {
      setIsLoading(false)
      return
    }

    const fetchReportData = async () => {
      try {
        setIsLoading(true)
        logger.info("Fetching report data")

        // Calculate date range based on selected time range
        const now = new Date()
        const startDate = new Date()

        if (timeRange === "week") {
          startDate.setDate(now.getDate() - 7)
        } else if (timeRange === "month") {
          startDate.setMonth(now.getMonth() - 1)
        } else if (timeRange === "year") {
          startDate.setFullYear(now.getFullYear() - 1)
        }

        // Fetch operations within the date range
        const operationsQuery = query(
          collection(db, "operations"),
          where("date", ">=", startDate),
          orderBy("date", "desc"),
        )

        const operationsSnapshot = await getDocs(operationsQuery)
        const operations = operationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Process data for charts
        processOperationsByType(operations)
        processOperationsByDoctor(operations)
        processOperationsByTheater(operations)
        processOperationsByStatus(operations)
        setOperationsList(operations)

        logger.info("Report data fetched successfully")
      } catch (error) {
        logger.error("Error fetching report data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchReportData()
    }
  }, [user, db, timeRange])

  const processOperationsByType = (operations: any[]) => {
    const typeCount: Record<string, number> = {}

    operations.forEach((op) => {
      const type = op.operationType || "Unknown"
      typeCount[type] = (typeCount[type] || 0) + 1
    })

    const data = Object.entries(typeCount).map(([name, value]) => ({ name, value }))
    setOperationsByType(data)
  }

  const processOperationsByDoctor = (operations: any[]) => {
    const doctorCount: Record<string, number> = {}

    operations.forEach((op) => {
      const doctor = op.doctorName || "Unknown"
      doctorCount[doctor] = (doctorCount[doctor] || 0) + 1
    })

    const data = Object.entries(doctorCount).map(([name, value]) => ({ name, value }))
    setOperationsByDoctor(data)
  }

  const processOperationsByTheater = (operations: any[]) => {
    const theaterCount: Record<string, number> = {}

    operations.forEach((op) => {
      const theater = `OT #${op.operatingTheater || "Unknown"}`
      theaterCount[theater] = (theaterCount[theater] || 0) + 1
    })

    const data = Object.entries(theaterCount).map(([name, value]) => ({ name, value }))
    setOperationsByTheater(data)
  }

  const processOperationsByStatus = (operations: any[]) => {
    const statusCount: Record<string, number> = {
      Scheduled: 0,
      Completed: 0,
      Cancelled: 0,
    }

    operations.forEach((op) => {
      const status = op.status ? op.status.charAt(0).toUpperCase() + op.status.slice(1) : "Scheduled"
      statusCount[status] = (statusCount[status] || 0) + 1
    })

    const data = Object.entries(statusCount).map(([name, value]) => ({ name, value }))
    setOperationsByStatus(data)
  }

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
    } catch (error) {
      logger.error("Error formatting date:", error)
      return "Invalid date"
    }
  }

  const handleExportCSV = () => {
    try {
      logger.info("Exporting operations data as CSV")

      // Create CSV content
      const headers = ["Date", "Patient", "Doctor", "Type", "Theater", "Status"]
      const csvContent = [
        headers.join(","),
        ...operationsList.map((op) =>
          [
            formatDate(op.date),
            op.patientName || "Unknown",
            op.doctorName || "Unknown",
            op.operationType || "Unknown",
            `OT #${op.operatingTheater || "N/A"}`,
            op.status ? op.status.charAt(0).toUpperCase() + op.status.slice(1) : "Scheduled",
          ].join(","),
        ),
      ].join("\n")

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `operations_report_${timeRange}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      logger.info("CSV export completed")
    } catch (error) {
      logger.error("Error exporting CSV:", error)
    }
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircleIcon className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-gray-500">Only administrators can access the reports section.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-gray-500">Analyze operation data and generate reports</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportCSV} disabled={isLoading || operationsList.length === 0}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Loading report data...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Operations by Type</CardTitle>
                  <CardDescription>Distribution of operations by procedure type</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {operationsByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operationsByType} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <AlertCircleIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No data available for the selected time range</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operations by Status</CardTitle>
                  <CardDescription>Distribution of operations by current status</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {operationsByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={operationsByStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {operationsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <AlertCircleIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No data available for the selected time range</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Operations by Doctor</CardTitle>
                  <CardDescription>Number of operations performed by each doctor</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {operationsByDoctor.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operationsByDoctor} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <AlertCircleIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No data available for the selected time range</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operations by Theater</CardTitle>
                  <CardDescription>Distribution of operations by operating theater</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {operationsByTheater.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={operationsByTheater} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#FFBB28" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <AlertCircleIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No data available for the selected time range</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Operations</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <Card>
                  <CardHeader>
                    <CardTitle>Operations List</CardTitle>
                    <CardDescription>Detailed list of all operations in the selected time period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {operationsList.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Theater</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operationsList.map((op) => (
                            <TableRow key={op.id}>
                              <TableCell>{formatDate(op.date)}</TableCell>
                              <TableCell>{op.patientName || "Unknown"}</TableCell>
                              <TableCell>Dr. {op.doctorName || "Unknown"}</TableCell>
                              <TableCell>{op.operationType || "Unknown"}</TableCell>
                              <TableCell>OT #{op.operatingTheater || "N/A"}</TableCell>
                              <TableCell>
                                {op.status ? op.status.charAt(0).toUpperCase() + op.status.slice(1) : "Scheduled"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No operations found for the selected time range</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scheduled">
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Operations</CardTitle>
                    <CardDescription>List of scheduled operations in the selected time period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {operationsList.filter((op) => op.status === "scheduled" || !op.status).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Theater</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operationsList
                            .filter((op) => op.status === "scheduled" || !op.status)
                            .map((op) => (
                              <TableRow key={op.id}>
                                <TableCell>{formatDate(op.date)}</TableCell>
                                <TableCell>{op.patientName || "Unknown"}</TableCell>
                                <TableCell>Dr. {op.doctorName || "Unknown"}</TableCell>
                                <TableCell>{op.operationType || "Unknown"}</TableCell>
                                <TableCell>OT #{op.operatingTheater || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No scheduled operations found for the selected time range</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="completed">
                <Card>
                  <CardHeader>
                    <CardTitle>Completed Operations</CardTitle>
                    <CardDescription>List of completed operations in the selected time period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {operationsList.filter((op) => op.status === "completed").length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Theater</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operationsList
                            .filter((op) => op.status === "completed")
                            .map((op) => (
                              <TableRow key={op.id}>
                                <TableCell>{formatDate(op.date)}</TableCell>
                                <TableCell>{op.patientName || "Unknown"}</TableCell>
                                <TableCell>Dr. {op.doctorName || "Unknown"}</TableCell>
                                <TableCell>{op.operationType || "Unknown"}</TableCell>
                                <TableCell>OT #{op.operatingTheater || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No completed operations found for the selected time range</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cancelled">
                <Card>
                  <CardHeader>
                    <CardTitle>Cancelled Operations</CardTitle>
                    <CardDescription>List of cancelled operations in the selected time period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {operationsList.filter((op) => op.status === "cancelled").length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Theater</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {operationsList
                            .filter((op) => op.status === "cancelled")
                            .map((op) => (
                              <TableRow key={op.id}>
                                <TableCell>{formatDate(op.date)}</TableCell>
                                <TableCell>{op.patientName || "Unknown"}</TableCell>
                                <TableCell>Dr. {op.doctorName || "Unknown"}</TableCell>
                                <TableCell>{op.operationType || "Unknown"}</TableCell>
                                <TableCell>OT #{op.operatingTheater || "N/A"}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No cancelled operations found for the selected time range</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
