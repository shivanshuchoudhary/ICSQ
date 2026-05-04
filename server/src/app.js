import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ==> IMPORTANT: Load environment variables right at the top, before any other imports
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import express from 'express'
import cors from "cors"
import cookieParser from "cookie-parser"
import bodyParser from 'body-parser';
import { requestLogger, authLogger, errorLogger } from "./middleware/logging.middleware.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// CORS configuration for different environments
const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? [
        "http://10.130.18.60:5173",  // Production frontend (Vite dev server)
        "http://10.130.18.60:3000",  // Production frontend (serve)
        "http://10.130.18.60:8080",  // Production backend
        "http://10.130.18.60",       // Production without port
        "https://ICSQ.sobhaapps.com", // Custom domain
        "http://localhost:3000",     // Local frontend
        "http://localhost:5173",     // Local Vite dev server
        process.env.CLIENT_URL       // From environment variable
      ].filter(Boolean) // Remove undefined values
    : [
        "http://localhost:5173",     // Development Vite server (primary)
        "http://localhost:3000",     // Development serve
        "http://127.0.0.1:5173",    // Alternative localhost
        "http://127.0.0.1:3000",    // Alternative localhost
        process.env.CLIENT_URL,      // From environment variable
        "http://10.130.18.60:3000",  // Production frontend
        "http://10.130.18.60:5173",  // Production Vite server
        "https://ICSQ.sobhaapps.com" // Custom domain
      ].filter(Boolean), // Remove undefined values
  credentials: true,
}

app.use(
  cors(corsOptions),
  express.json({
    limit: "1mb",
  }),
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
  cookieParser(),
  bodyParser.json()
);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')))

// Add logging middleware
app.use(requestLogger)
app.use(authLogger)

app.get('/', ( _ , res) => {
  res.send("Server Working Successfully!");
})

// Special admin dashboard route
app.get('/admin-logs', (_, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'))
})

app.get('/health', (_, res) => {
  res.json({"message" : "Server is healthy"})
})

// Import routes
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"
import departmentRoutes from "./routes/department.routes.js"
import categoryRoutes from "./routes/category.routes.js"
import surveyRoutes from "./routes/survey.routes.js"
import sipocRoutes from "./routes/sipoc.routes.js"
import actionPlanRoutes from "./routes/actionPlan.routes.js"
import analyticsRoutes from "./routes/analytics.routes.js"
import departmentMappingRoutes from "./routes/departmentMapping.routes.js"
import logRoutes from "./routes/log.routes.js"
import hodDashboardRoutes from "./routes/hodDashboard.routes.js"


// API Routes
app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/users", userRoutes)
app.use("/api/v1/departments", departmentRoutes)
app.use("/api/v1/categories", categoryRoutes)
app.use("/api/v1/surveys", surveyRoutes)
app.use("/api/v1/sipoc", sipocRoutes)
app.use("/api/v1/action-plans", actionPlanRoutes)
app.use("/api/v1/analytics", analyticsRoutes)
app.use("/api/v1/department-mappings", departmentMappingRoutes)
app.use("/api/v1/logs", logRoutes)
app.use("/api/v1/hod-dashboard", hodDashboardRoutes)

// Add error logging middleware after routes
app.use(errorLogger)

export {app};
