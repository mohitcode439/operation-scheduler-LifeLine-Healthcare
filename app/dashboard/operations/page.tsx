"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { logger } from "@/lib/logger"
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { PlusIcon, SearchIcon, Trash2Icon, PencilIcon, AlertCircleIcon, EyeIcon } from "lucide-react"

interface Operation {
  id: string
  patientName: string
  doctorName: string
  operationType: string
  operatingTheater: string
  date: any
  status: "scheduled" | "completed" | "cancelled"
  anesthesiaType?: string
  anesthesiologist?: string
  assistantSurgeon?: string
  nurses?: string[]
  preOpNotes?: string
  postOpNotes?: string
  requiredMaterials?: string[]
}

export default function OperationsPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const [operations, setOperations] = useState<Operation[]>([])
  const [filteredOperations, setFilteredOperations] = useState<Operation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchOperations = async () => {
    try {
      logger.info("Fetching operations")
      setLoading(true)

      const operationsQuery = query(collection(db, "operations"), orderBy("date", "desc"))
      const operationsSnapshot = await getDocs(operationsQuery)

      const operationsList = operationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Operation[]

      setOperations(operationsList)
      setFilteredOperations(operationsList)
      logger.info(`Fetched ${operationsList.length} operations`)
    } catch (error) {
      logger.error("Error fetching operations:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load operations. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchOperations()
    }
  }, [db, user])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOperations(operations)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = operations.filter(
        (operation) =>
          operation.patientName?.toLowerCase().includes(query) ||
          operation.doctorName?.toLowerCase().includes(query) ||
          operation.operationType?.toLowerCase().includes(query) ||
          operation.operatingTheater?.toLowerCase().includes(query),
      )
      setFilteredOperations(filtered)
    }
  }, [searchQuery, operations])

  const handleDeleteOperation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this operation?")) {
      return
    }

    try {
      logger.info(`Deleting operation: ${id}`)
      await deleteDoc(doc(db, "operations", id))

      setOperations(operations.filter((operation) => operation.id !== id))
      setFilteredOperations(filteredOperations.filter((operation) => operation.id !== id))

      toast({
        title: "Operation deleted",
        description: "The operation has been removed successfully.",
      })
      logger.info(`Operation deleted successfully: ${id}`)
    } catch (error) {
      logger.error(`Error deleting operation ${id}:`, error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete operation. Please try again.",
      })
    }
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
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (error) {
      logger.error("Error formatting date:", error)
      return "Invalid date"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Scheduled
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const isAdmin = user?.role === "admin"

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
            <p className="text-gray-500">Manage and view scheduled operations</p>
          </div>
          {isAdmin && (
            <Link href="/dashboard/operations/add">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Schedule Operation
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Operations Schedule</CardTitle>
            <CardDescription>View all operations scheduled in the system</CardDescription>
            <div className="relative mt-4">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by patient, doctor, type, or theater..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading operations...</div>
            ) : filteredOperations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Theater</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperations.map((operation) => (
                    <TableRow key={operation.id}>
                      <TableCell className="font-medium">{operation.patientName || "Unknown"}</TableCell>
                      <TableCell>Dr. {operation.doctorName || "Unknown"}</TableCell>
                      <TableCell>{operation.operationType || "General Surgery"}</TableCell>
                      <TableCell>OT #{operation.operatingTheater || "N/A"}</TableCell>
                      <TableCell>{formatDate(operation.date)}</TableCell>
                      <TableCell>{getStatusBadge(operation.status || "scheduled")}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/operations/view/${operation.id}`}>
                          <Button variant="ghost" size="icon">
                            <EyeIcon className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </Link>
                        {isAdmin && (
                          <>
                            <Link href={`/dashboard/operations/edit/${operation.id}`}>
                              <Button variant="ghost" size="icon">
                                <PencilIcon className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOperation(operation.id)}>
                              <Trash2Icon className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 flex flex-col items-center">
                <AlertCircleIcon className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium">No operations found</h3>
                <p className="text-gray-500 mt-1">
                  {searchQuery
                    ? "No operations match your search criteria"
                    : "There are no operations scheduled in the system yet"}
                </p>
                {isAdmin && (
                  <Link href="/dashboard/operations/add" className="mt-4">
                    <Button>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Schedule Operation
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
