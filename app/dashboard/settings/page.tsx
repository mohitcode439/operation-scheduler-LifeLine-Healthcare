"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useFirebase } from "@/lib/firebase-context"
import { logger } from "@/lib/logger"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth"
import { Loader2Icon, UserIcon, BellIcon, ShieldIcon } from "lucide-react"

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
})

const securityFormSchema = z
  .object({
    currentPassword: z.string().min(6, { message: "Current password must be at least 6 characters" }),
    newPassword: z.string().min(6, { message: "New password must be at least 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

const notificationsFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  operationReminders: z.boolean().default(true),
  systemUpdates: z.boolean().default(true),
})

export default function SettingsPage() {
  const { user } = useAuth()
  const { db, auth } = useFirebase()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false)
  const [isSubmittingSecurity, setIsSubmittingSecurity] = useState(false)
  const [isSubmittingNotifications, setIsSubmittingNotifications] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    operationReminders: true,
    systemUpdates: true,
  })

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
    },
  })

  const securityForm = useForm<z.infer<typeof securityFormSchema>>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const notificationsForm = useForm<z.infer<typeof notificationsFormSchema>>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: notificationSettings,
  })

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        logger.info("Fetching user settings")

        // Update profile form with current user data
        profileForm.reset({
          displayName: user.displayName || "",
          email: user.email || "",
        })

        // Fetch notification settings from Firestore
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          const settings = userData.notificationSettings || {
            emailNotifications: true,
            operationReminders: true,
            systemUpdates: true,
          }

          setNotificationSettings(settings)
          notificationsForm.reset(settings)
        }

        logger.info("User settings fetched successfully")
      } catch (error) {
        logger.error("Error fetching user settings:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user settings. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserSettings()
  }, [user, db, profileForm, notificationsForm])

  const onSubmitProfile = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user || !auth.currentUser) return

    try {
      setIsSubmittingProfile(true)
      logger.info("Updating user profile", { uid: user.uid })

      // Update display name in Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: values.displayName,
      })

      // Update email if changed
      if (values.email !== user.email) {
        await updateEmail(auth.currentUser, values.email)
      }

      // Update user document in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        displayName: values.displayName,
        email: values.email,
        updatedAt: new Date(),
      })

      logger.info("User profile updated successfully")

      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      })
    } catch (error) {
      logger.error("Error updating profile:", error)

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. You may need to re-login for email changes.",
      })
    } finally {
      setIsSubmittingProfile(false)
    }
  }

  const onSubmitSecurity = async (values: z.infer<typeof securityFormSchema>) => {
    if (!user || !auth.currentUser) return

    try {
      setIsSubmittingSecurity(true)
      logger.info("Updating user password", { uid: user.uid })

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(auth.currentUser.email || "", values.currentPassword)

      await reauthenticateWithCredential(auth.currentUser, credential)

      // Update password
      await updatePassword(auth.currentUser, values.newPassword)

      logger.info("Password updated successfully")

      // Reset form
      securityForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })
    } catch (error) {
      logger.error("Error updating password:", error)

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update password. Please check your current password and try again.",
      })
    } finally {
      setIsSubmittingSecurity(false)
    }
  }

  const onSubmitNotifications = async (values: z.infer<typeof notificationsFormSchema>) => {
    if (!user) return

    try {
      setIsSubmittingNotifications(true)
      logger.info("Updating notification settings", { uid: user.uid })

      // Update notification settings in Firestore
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        notificationSettings: values,
        updatedAt: new Date(),
      })

      setNotificationSettings(values)
      logger.info("Notification settings updated successfully")

      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      })
    } catch (error) {
      logger.error("Error updating notification settings:", error)

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
      })
    } finally {
      setIsSubmittingNotifications(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2Icon className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading settings...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center">
              <UserIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <ShieldIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center">
              <BellIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormDescription>This is your public display name.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormDescription>This email will be used for account-related notifications.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingProfile}>
                        {isSubmittingProfile ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Update your password and security preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSubmitSecurity)} className="space-y-6">
                    <FormField
                      control={securityForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormDescription>Password must be at least 6 characters long.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingSecurity}>
                        {isSubmittingSecurity ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Control which notifications you receive</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationsForm}>
                  <form onSubmit={notificationsForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
                    <FormField
                      control={notificationsForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>Receive notifications via email</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationsForm.control}
                      name="operationReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Operation Reminders</FormLabel>
                            <FormDescription>Receive reminders about upcoming operations</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={notificationsForm.control}
                      name="systemUpdates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">System Updates</FormLabel>
                            <FormDescription>
                              Receive notifications about system updates and maintenance
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingNotifications}>
                        {isSubmittingNotifications ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Preferences"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
