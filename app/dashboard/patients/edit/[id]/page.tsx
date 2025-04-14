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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  age: z.coerce
    .number()
    .min(0, { message: "Age must be a positive number" })
    .max(150, { message: "Age must be less than 150" }),
  gender: z.enum(["male", "female", "other"], { message: "Please select a gender" }),
  contactNumber: z.string().min(10, { message: "Contact number must be at least 10 characters" }),
  address: z.string().optional(),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  emergencyContact: z.string().optional(),
})

export default function EditPatientPage() {
  const { user } = useAuth()
  const { db } = useFirebase()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const patientId = params.id as string

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      age: undefined,
      gender: undefined,
      contactNumber: "",
      address: "",
      medicalHistory: "",
      allergies: "",
      emergencyContact: "",
    },
  })

  useEffect(() => {
    setIsAdmin(user?.role === "admin")

    const fetchPatient = async () => {
      try {
        setIsLoading(true)
        logger.info(`Fetching patient data for ID: ${patientId}`)

        const docRef = doc(db, "patients", patientId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const patientData = docSnap.data()
          form.reset({
            name: patientData.name || "",
            age: patientData.age,
            gender: patientData.gender,
            contactNumber: patientData.contactNumber || "",
            address: patientData.address || "",
            medicalHistory: patientData.medicalHistory || "",
            allergies: patientData.allergies || "",
            emergencyContact: patientData.emergencyContact || "",
          })
          logger.info("Patient data fetched successfully")
        } else {
          logger.error("No patient found with this ID")
          toast({
            variant: "destructive",
            title: "Error",
            description: "Patient not found. Redirecting to patients list.",
          })
          router.push("/dashboard/patients")
        }
      } catch (error) {
        logger.error("Error fetching patient data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load patient data. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user && patientId) {
      fetchPatient()
    }
  }, [user, patientId, db, form, router, toast])

  // Redirect if not admin
  useEffect(() => {
    if (user && !isLoading && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true)
      logger.info("Updating patient", { id: patientId, name: values.name })

      const docRef = doc(db, "patients", patientId)
      await updateDoc(docRef, {
        ...values,
        updatedAt: new Date(),
      })

      logger.info("Patient updated successfully", { id: patientId })

      toast({
        title: "Patient updated",
        description: "The patient information has been updated successfully.",
      })

      router.push("/dashboard/patients")
    } catch (error) {
      logger.error("Error updating patient:", error)

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update patient. Please try again.",
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
          <span className="ml-2">Loading patient data...</span>
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
          <Link href="/dashboard/patients">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Edit Patient</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>Update the details of the patient</CardDescription>
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
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="35" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="male" />
                              </FormControl>
                              <FormLabel className="font-normal">Male</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="female" />
                              </FormControl>
                              <FormLabel className="font-normal">Female</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="other" />
                              </FormControl>
                              <FormLabel className="font-normal">Other</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
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
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, City, State, ZIP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="medicalHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical History</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Previous surgeries, chronic conditions, etc." {...field} />
                      </FormControl>
                      <FormDescription>Include any relevant medical history</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Medications, foods, or other allergies" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Name: John Doe, Relation: Spouse, Phone: (555) 987-6543" {...field} />
                      </FormControl>
                      <FormDescription>Name, relationship, and contact information</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-4">
                  <Link href="/dashboard/patients">
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
                      "Update Patient"
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
