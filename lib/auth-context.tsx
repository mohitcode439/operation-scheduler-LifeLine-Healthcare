"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "./firebase-config"
import { logger } from "./logger"

type UserRole = "admin" | "user"

interface UserData {
  uid: string
  email: string | null
  displayName: string | null
  role: UserRole
  photoURL?: string | null
}

interface AuthContextType {
  user: UserData | null
  loading: boolean
  register: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: userData.role || "user",
            })
            logger.info(`User authenticated: ${firebaseUser.uid}`)
          } else {
            // If user document doesn't exist, create it with default role
            await setDoc(doc(db, "users", firebaseUser.uid), {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: "user",
              createdAt: new Date(),
            })

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: "user",
            })
            logger.info(`New user document created: ${firebaseUser.uid}`)
          }
        } catch (error) {
          logger.error("Error fetching user data:", error)
          // Set basic user info even if Firestore fetch fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: "user",
          })
        }
      } else {
        setUser(null)
        logger.info("User signed out")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const register = async (email: string, password: string, displayName: string, role: UserRole = "user") => {
    try {
      setLoading(true)
      logger.info(`Registering user: ${email}`)

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update profile with display name
      await updateProfile(user, { displayName })

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName,
        role,
        createdAt: new Date(),
      })

      logger.info(`User registered successfully: ${user.uid}`)
    } catch (error: any) {
      logger.error("Registration error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      logger.info(`Login attempt: ${email}`)
      await signInWithEmailAndPassword(auth, email, password)
      logger.info(`Login successful: ${email}`)
    } catch (error: any) {
      logger.error("Login error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      logger.info("Logout attempt")
      await signOut(auth)
      logger.info("Logout successful")
    } catch (error: any) {
      logger.error("Logout error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return <AuthContext.Provider value={{ user, loading, register, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
