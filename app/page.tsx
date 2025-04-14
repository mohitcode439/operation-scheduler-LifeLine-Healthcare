import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HospitalIcon, CalendarIcon, UserIcon } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <HospitalIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Operation Scheduler</h1>
          </div>
          <div className="space-x-2">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <section className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Streamline Your Hospital's Operation Theater Management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Efficiently schedule surgeries, manage resources, and optimize operation theater utilization with our
            comprehensive scheduling system.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" className="mr-4">
                Get Started
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </section>

        <section id="features" className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-blue-600" />
                Smart Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Intelligent scheduling system that considers doctor availability, operating room capabilities, and
                patient requirements to create optimal schedules.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="mr-2 h-5 w-5 text-blue-600" />
                Role-Based Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Separate interfaces for administrators and medical staff with appropriate permissions and functionality
                for each role.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HospitalIcon className="mr-2 h-5 w-5 text-blue-600" />
                Resource Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track and manage operating room resources, including equipment, medications, and staff assignments for
                each procedure.
              </CardDescription>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Operation Scheduler for Hospital Management. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
