"use client"

import type React from "react"

import { createContext, useContext } from "react"
import { app, auth, db, storage } from "./firebase-config"

interface FirebaseContextType {
  app: typeof app
  auth: typeof auth
  db: typeof db
  storage: typeof storage
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined)

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  return <FirebaseContext.Provider value={{ app, auth, db, storage }}>{children}</FirebaseContext.Provider>
}

export function useFirebase() {
  const context = useContext(FirebaseContext)
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider")
  }
  return context
}
