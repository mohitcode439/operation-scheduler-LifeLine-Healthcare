"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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

interface Doctor {
  id: string
  name: string
  specialty: string
  email: string
  phone: string
}

export default function DoctorsPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const { toast } = useToast()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchDoctors = async () => {
    try {
      logger.info("Fetching doctors")
      setLoading(true)

      const doctorsQuery = query(collection(db, "doctors"), orderBy("name"))
      const doctorsSnapshot = await getDocs(doctorsQuery)

      const doctorsList = doctorsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Doctor[]

      setDoctors(doctorsList)
      setFilteredDoctors(doctorsList)
      logger.info(`Fetched ${doctorsList.length} doctors`)
    } catch (error) {
      logger.error("Error fetching doctors:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load doctors. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDoctors()
    }
  }, [db, user])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDoctors(doctors)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = doctors.filter(
        (doctor) =>
          doctor.name.toLowerCase().includes(query) ||
          doctor.specialty.toLowerCase().includes(query) ||
          doctor.email.toLowerCase().includes(query),
      )
      setFilteredDoctors(filtered)
    }
  }, [searchQuery, doctors])

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this doctor?")) {
      return
    }

    try {
      logger.info(`Deleting doctor: ${id}`)
      await deleteDoc(doc(db, "doctors", id))

      setDoctors(doctors.filter((doctor) => doctor.id !== id))
      setFilteredDoctors(filteredDoctors.filter((doctor) => doctor.id !== id))

      toast({
        title: "Doctor deleted",
        description: "The doctor has been removed successfully.",
      })
      logger.info(`Doctor deleted successfully: ${id}`)
    } catch (error) {
      logger.error(`Error deleting doctor ${id}:`, error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete doctor. Please try again.",
      })
    }
  }

  const isAdmin = user?.role === "admin"

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Doctors</h1>
            <p className="text-gray-500">Manage and view doctor information</p>
          </div>
          {isAdmin && (
            <Link href="/dashboard/doctors/add">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Doctor
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Doctors Directory</CardTitle>
            <CardDescription>View all doctors registered in the system</CardDescription>
            <div className="relative mt-4">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search doctors by name, specialty, or email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading doctors...</div>
            ) : filteredDoctors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>{doctor.specialty}</TableCell>
                      <TableCell>{doctor.email}</TableCell>
                      <TableCell>{doctor.phone}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Link href={`/dashboard/doctors/edit/${doctor.id}`}>
                            <Button variant="ghost" size="icon">
                              <PencilIcon className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDoctor(doctor.id)}>
                            <Trash2Icon className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 flex flex-col items-center">
                <AlertCircleIcon className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium">No doctors found</h3>
                <p className="text-gray-500 mt-1">
                  {searchQuery ? "No doctors match your search criteria" : "There are no doctors in the system yet"}
                </p>
                {isAdmin && (
                  <Link href="/dashboard/doctors/add" className="mt-4">
                    <Button>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add Doctor
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
