"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { useToast } from "@/components/ui/use-toast"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { logger } from "@/lib/logger"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { ArrowLeftIcon, Loader2Icon } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  specialty: z.string().min(2, { message: "Specialty must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 characters" }),
  qualifications: z.string().optional(),
  experience: z.string().optional(),
  availability: z.string().optional(),
})

export default function EditDoctorPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const doctorId = params.id as string

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      specialty: "",
      email: "",
      phone: "",
      qualifications: "",
      experience: "",
      availability: "",
    },
  })

  useEffect(() => {
    setIsAdmin(user?.role === "admin")

    const fetchDoctor = async () => {
      try {
        setIsLoading(true)
        logger.info(`Fetching doctor data for ID: ${doctorId}`)

        const docRef = doc(db, "doctors", doctorId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const doctorData = docSnap.data()
          form.reset({
            name: doctorData.name || "",
            specialty: doctorData.specialty || "",
            email: doctorData.email || "",
            phone: doctorData.phone || "",
            qualifications: doctorData.qualifications || "",
            experience: doctorData.experience || "",
            availability: doctorData.availability || "",
          })
          logger.info("Doctor data fetched successfully")
        } else {
          logger.error("No doctor found with this ID")
          toast({
            variant: "destructive",
            title: "Error",
            description: "Doctor not found. Redirecting to doctors list.",
          })
          router.push("/dashboard/doctors")
        }
      } catch (error) {
        logger.error("Error fetching doctor data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load doctor data. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user && doctorId) {
      fetchDoctor()
    }
  }, [user, doctorId, db, form, router, toast])

  // Redirect if not admin
  useEffect(() => {
    if (user && !isLoading && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true)
      logger.info("Updating doctor", { id: doctorId, email: values.email })

      const docRef = doc(db, "doctors", doctorId)
      await updateDoc(docRef, {
        ...values,
        updatedAt: new Date(),
      })

      logger.info("Doctor updated successfully", { id: doctorId })

      toast({
        title: "Doctor updated",
        description: "The doctor information has been updated successfully.",
      })

      router.push("/dashboard/doctors")
    } catch (error) {
      logger.error("Error updating doctor:", error)

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update doctor. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading doctor data...</span>
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
          <Link href="/dashboard/doctors">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Edit Doctor</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Doctor Information</CardTitle>
            <CardDescription>Update the details of the doctor</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialty</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a specialty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cardiology">Cardiology</SelectItem>
                            <SelectItem value="Neurology">Neurology</SelectItem>
                            <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                            <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                            <SelectItem value="General Surgery">General Surgery</SelectItem>
                            <SelectItem value="Anesthesiology">Anesthesiology</SelectItem>
                            <SelectItem value="Oncology">Oncology</SelectItem>
                            <SelectItem value="Gynecology">Gynecology</SelectItem>
                            <SelectItem value="Dermatology">Dermatology</SelectItem>
                            <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                            <SelectItem value="Urology">Urology</SelectItem>
                            <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                            <SelectItem value="Radiology">Radiology</SelectItem>
                            <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="doctor@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="qualifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualifications</FormLabel>
                      <FormControl>
                        <Textarea placeholder="MD, PhD, Board Certifications, etc." {...field} />
                      </FormControl>
                      <FormDescription>List all relevant qualifications and certifications</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience</FormLabel>
                      <FormControl>
                        <Textarea placeholder="10+ years of experience in cardiology..." {...field} />
                      </FormControl>
                      <FormDescription>Briefly describe the doctor's professional experience</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Availability</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Monday-Friday, 9am-5pm" {...field} />
                      </FormControl>
                      <FormDescription>Specify the doctor's general availability for operations</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-4">
                  <Link href="/dashboard/doctors">
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Doctor"
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
