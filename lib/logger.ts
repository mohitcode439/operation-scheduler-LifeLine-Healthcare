// Simple logging utility that wraps console methods with additional functionality
// In a production environment, this could be replaced with a more robust logging solution

type LogLevel = "info" | "warn" | "error" | "debug"

class Logger {
  private prefix: string
  private enableConsole: boolean

  constructor(prefix = "Operation-Scheduler", enableConsole = true) {
    this.prefix = prefix
    this.enableConsole = enableConsole
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}] [${this.prefix}]: ${message}`
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage(level, message)

    if (this.enableConsole) {
      switch (level) {
        case "info":
          console.info(formattedMessage, ...args)
          break
        case "warn":
          console.warn(formattedMessage, ...args)
          break
        case "error":
          console.error(formattedMessage, ...args)
          break
        case "debug":
          console.debug(formattedMessage, ...args)
          break
      }
    }

    // In a production environment, you might want to send logs to a service
    // like Firebase Analytics, Sentry, or a custom backend
    this.persistLog(level, formattedMessage, args)
  }

  private persistLog(level: LogLevel, message: string, args: any[]): void {
    // This is where you would implement persistence logic
    // For example, sending to Firebase Analytics or a backend API

    // For now, we'll just store in localStorage for demonstration
    if (typeof window !== "undefined") {
      try {
        const logs = JSON.parse(localStorage.getItem("app_logs") || "[]")
        logs.push({
          timestamp: new Date().toISOString(),
          level,
          message,
          args: args.length ? JSON.stringify(args) : undefined,
        })

        // Keep only the last 100 logs to prevent localStorage from getting too large
        if (logs.length > 100) {
          logs.shift()
        }

        localStorage.setItem("app_logs", JSON.stringify(logs))
      } catch (error) {
        console.error("Failed to persist log:", error)
      }
    }
  }

  info(message: string, ...args: any[]): void {
    this.log("info", message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    this.log("warn", message, ...args)
  }

  error(message: string, ...args: any[]): void {
    this.log("error", message, ...args)
  }

  debug(message: string, ...args: any[]): void {
    this.log("debug", message, ...args)
  }

  // Get all logs (for admin viewing)
  getLogs(): any[] {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("app_logs") || "[]")
      } catch (error) {
        console.error("Failed to retrieve logs:", error)
        return []
      }
    }
    return []
  }
}

// Export a singleton instance
export const logger = new Logger()
