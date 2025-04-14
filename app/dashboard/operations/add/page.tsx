"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { logger } from "@/lib/logger"
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore"
import { ArrowLeftIcon, Loader2Icon, CalendarIcon } from "lucide-react"

const formSchema = z.object({
  patientName: z.string().min(2, { message: "Patient name must be at least 2 characters" }),
  patientId: z.string().optional(),
  doctorName: z.string().min(2, { message: "Doctor name must be at least 2 characters" }),
  doctorId: z.string().optional(),
  operationType: z.string().min(2, { message: "Operation type must be at least 2 characters" }),
  operatingTheater: z.string().min(1, { message: "Operating theater is required" }),
  date: z.date({ required_error: "Date and time is required" }),
  duration: z.string().min(1, { message: "Duration is required" }),
  status: z.enum(["scheduled", "completed", "cancelled"], { required_error: "Status is required" }),
  anesthesiaType: z.string().optional(),
  anesthesiologist: z.string().optional(),
  assistantSurgeon: z.string().optional(),
  nurses: z.string().optional(),
  preOpNotes: z.string().optional(),
  postOpNotes: z.string().optional(),
  requiredMaterials: z.string().optional(),
})

export default function AddOperationPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [doctors, setDoctors] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: "",
      patientId: "",
      doctorName: "",
      doctorId: "",
      operationType: "",
      operatingTheater: "",
      date: new Date(),
      duration: "",
      status: "scheduled",
      anesthesiaType: "",
      anesthesiologist: "",
      assistantSurgeon: "",
      nurses: "",
      preOpNotes: "",
      postOpNotes: "",
      requiredMaterials: "",
    },
  })

  useEffect(() => {
    setIsAdmin(user?.role === "admin")

    const fetchData = async () => {
      try {
        setIsLoading(true)
        logger.info("Fetching doctors and patients for operation form")

        // Fetch doctors
        const doctorsQuery = query(collection(db, "doctors"), orderBy("name"))
        const doctorsSnapshot = await getDocs(doctorsQuery)
        const doctorsList = doctorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          specialty: doc.data().specialty,
        }))
        setDoctors(doctorsList)

        // Fetch patients
        const patientsQuery = query(collection(db, "patients"), orderBy("name"))
        const patientsSnapshot = await getDocs(patientsQuery)
        const patientsList = patientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          age: doc.data().age,
          gender: doc.data().gender,
        }))
        setPatients(patientsList)

        logger.info("Doctors and patients fetched successfully")
      } catch (error) {
        logger.error("Error fetching doctors and patients:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load doctors and patients. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user, db, toast])

  // Redirect if not admin
  useEffect(() => {
    if (user && !isLoading && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true)
      logger.info("Adding new operation", { patient: values.patientName, doctor: values.doctorName })

      const operationData = {
        ...values,
        createdAt: new Date(),
        createdBy: user?.uid,
      }

      const docRef = await addDoc(collection(db, "operations"), operationData)

      logger.info("Operation added successfully", { id: docRef.id })

      toast({
        title: "Operation scheduled",
        description: "The operation has been scheduled successfully.",
      })

      router.push("/dashboard/operations")
    } catch (error) {
      logger.error("Error adding operation:", error)

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to schedule operation. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePatientSelect = (patientId: string) => {
    const selectedPatient = patients.find((patient) => patient.id === patientId)
    if (selectedPatient) {
      form.setValue("patientName", selectedPatient.name)
      form.setValue("patientId", selectedPatient.id)
    }
  }

  const handleDoctorSelect = (doctorId: string) => {
    const selectedDoctor = doctors.find((doctor) => doctor.id === doctorId)
    if (selectedDoctor) {
      form.setValue("doctorName", selectedDoctor.name)
      form.setValue("doctorId", selectedDoctor.id)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading form data...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/operations">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Operation</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Operation Details</CardTitle>
            <CardDescription>Enter the details of the operation to be scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Patient</FormLabel>
                          <Select onValueChange={handlePatientSelect} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a patient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients.map((patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.name} ({patient.age}, {patient.gender})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select from existing patients or enter a new patient name below
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientName"
                      render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel>Patient Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name="doctorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Doctor</FormLabel>
                          <Select onValueChange={handleDoctorSelect} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a doctor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {doctors.map((doctor) => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  Dr. {doctor.name} ({doctor.specialty})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select from existing doctors or enter a new doctor name below
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="doctorName"
                      render={({ field }) => (
                        <FormItem className="mt-2">
                          <FormLabel>Doctor Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Jane Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="operationType"
                    render={({ field }) => (
                      <Input placeholder="Operation Type" {...field} />
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="operatingTheater"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operating Theater</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select operating theater" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">OT #1 - General Surgery</SelectItem>
                            <SelectItem value="2">OT #2 - Cardiac</SelectItem>
                            <SelectItem value="3">OT #3 - Orthopedic</SelectItem>
                            <SelectItem value="4">OT #4 - Neurosurgery</SelectItem>
                            <SelectItem value="5">OT #5 - Ophthalmology</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date and Time</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value && "text-muted-foreground"
                                }`}
                              >
                                {field.value ? format(field.value, "PPP HH:mm") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            <div className="p-3 border-t border-border">
                              <Input
                                type="time"
                                onChange={(e) => {
                                  const date = new Date(field.value)
                                  const [hours, minutes] = e.target.value.split(":")
                                  date.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10))
                                  field.onChange(date)
                                }}
                                defaultValue={format(field.value || new Date(), "HH:mm")}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>The date and time of the operation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (hours)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0.5">0.5 hours (30 minutes)</SelectItem>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="1.5">1.5 hours (90 minutes)</SelectItem>
                            <SelectItem value="2">2 hours</SelectItem>
                            <SelectItem value="2.5">2.5 hours</SelectItem>
                            <SelectItem value="3">3 hours</SelectItem>
                            <SelectItem value="3.5">3.5 hours</SelectItem>
                            <SelectItem value="4">4 hours</SelectItem>
                            <SelectItem value="4.5">4.5 hours</SelectItem>
                            <SelectItem value="5">5 hours</SelectItem>
                            <SelectItem value="5.5">5.5 hours</SelectItem>
                            <SelectItem value="6">6 hours</SelectItem>
                            <SelectItem value="6+">6+ hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="scheduled" />
                            </FormControl>
                            <FormLabel className="font-normal">Scheduled</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="completed" />
                            </FormControl>
                            <FormLabel className="font-normal">Completed</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="cancelled" />
                            </FormControl>
                            <FormLabel className="font-normal">Cancelled</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="anesthesiaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anesthesia Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select anesthesia type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="General">General Anesthesia</SelectItem>
                            <SelectItem value="Regional">Regional Anesthesia</SelectItem>
                            <SelectItem value="Local">Local Anesthesia</SelectItem>
                            <SelectItem value="Sedation">Sedation</SelectItem>
                            <SelectItem value="Spinal">Spinal Anesthesia</SelectItem>
                            <SelectItem value="Epidural">Epidural Anesthesia</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="anesthesiologist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anesthesiologist</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  

                </div>

                <FormField
                  control={form.control}
                  name="requiredMaterials"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Materials</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List of required materials and equipment" {...field} />
                      </FormControl>
                      <FormDescription>List all special equipment and materials needed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="preOpNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pre-Operation Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Pre-operation instructions and notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postOpNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post-Operation Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Post-operation care instructions" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Link href="/dashboard/operations">
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      "Schedule Operation"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
