import { Router } from "express"
const router = Router()
import { getSurveys, getSurveyById, createSurvey, updateSurvey, deleteSurvey, getSurveyAnalytics } from "../controllers/survey.controller.js"
import { requireAdmin, requireAuth, requireHOD } from "../middleware/auth.js"

// Apply auth middleware to all routes
router.use(requireAuth)

// Get all surveys with optional filters
router.get("/", getSurveys)

// Get detailed survey analytics (admin only)
router.get("/analytics", requireAdmin, getSurveyAnalytics)

// Get survey by ID
router.get("/:id", getSurveyById)

// Crdeate a new survey
router.post("/", createSurvey)

// Update a survey
router.put("/:id", requireHOD, updateSurvey)

// Delete a survey
router.delete("/:id", requireAdmin, deleteSurvey)

export default router
