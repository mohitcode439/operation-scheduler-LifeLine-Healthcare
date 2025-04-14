"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { logger } from "@/lib/logger"
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { PlusIcon, SearchIcon, Trash2Icon, PencilIcon, AlertCircleIcon } from "lucide-react"

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  contactNumber: string
  medicalHistory?: string
}

export default function PatientsPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = user?.role === "admin"
    setIsAdmin(checkAdmin)

    // Redirect if not admin
    if (user && !checkAdmin) {
      router.push("/dashboard")
      return
    }

    // Only fetch patients if user is admin
    if (user && checkAdmin) {
      fetchPatients()
    }
  }, [user, router])

  const fetchPatients = async () => {
    try {
      logger.info("Fetching patients")
      setLoading(true)

      const patientsQuery = query(collection(db, "patients"), orderBy("name"))
      const patientsSnapshot = await getDocs(patientsQuery)

      const patientsList = patientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Patient[]

      setPatients(patientsList)
      setFilteredPatients(patientsList)
      logger.info(`Fetched ${patientsList.length} patients`)
    } catch (error) {
      logger.error("Error fetching patients:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load patients. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPatients(patients)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = patients.filter(
        (patient) =>
          patient.name.toLowerCase().includes(query) ||
          patient.gender.toLowerCase().includes(query) ||
          patient.contactNumber.includes(query) ||
          (patient.medicalHistory && patient.medicalHistory.toLowerCase().includes(query)),
      )
      setFilteredPatients(filtered)
    }
  }, [searchQuery, patients])

  const handleDeletePatient = async (id: string) => {
    if (!confirm("Are you sure you want to delete this patient?")) {
      return
    }

    try {
      logger.info(`Deleting patient: ${id}`)
      await deleteDoc(doc(db, "patients", id))

      setPatients(patients.filter((patient) => patient.id !== id))
      setFilteredPatients(filteredPatients.filter((patient) => patient.id !== id))

      toast({
        title: "Patient deleted",
        description: "The patient has been removed successfully.",
      })
      logger.info(`Patient deleted successfully: ${id}`)
    } catch (error) {
      logger.error(`Error deleting patient ${id}:`, error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete patient. Please try again.",
      })
    }
  }

  // If not admin, render nothing (redirect happens in useEffect)
  if (!isAdmin && user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
            <p className="text-gray-500">Manage patient information</p>
          </div>
          <Link href="/dashboard/patients/add">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patients Directory</CardTitle>
            <CardDescription>View all patients registered in the system</CardDescription>
            <div className="relative mt-4">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search patients by name, gender, or contact number..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading patients...</div>
            ) : filteredPatients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.age}</TableCell>
                      <TableCell>{patient.gender}</TableCell>
                      <TableCell>{patient.contactNumber}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/patients/edit/${patient.id}`}>
                          <Button variant="ghost" size="icon">
                            <PencilIcon className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePatient(patient.id)}>
                          <Trash2Icon className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 flex flex-col items-center">
                <AlertCircleIcon className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium">No patients found</h3>
                <p className="text-gray-500 mt-1">
                  {searchQuery ? "No patients match your search criteria" : "There are no patients in the system yet"}
                </p>
                <Link href="/dashboard/patients/add" className="mt-4">
                  <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Patient
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
