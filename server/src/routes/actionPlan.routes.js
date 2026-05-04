import { Router } from "express"
const router = Router()
import {
  getActionPlansForAdmin,
  getActionPlansForHOD,
  getActionPlansForUser,
  getActionPlansForSurveyRespondent,
  createActionPlan,
  updateActionPlan,
  updateActionPlanStatus,
  deleteActionPlan,
  testEmailConfig,
  getIndividualActionPlansForUser,
} from "../controllers/actionPlan.controller.js"
import { requireAdmin, requireAuth, requireHOD } from "../middleware/auth.js"

// Apply auth middleware to all routes
router.use(requireAuth)

// Admin: get all action plans
router.get("/admin", requireAdmin, getActionPlansForAdmin)
// HOD: get all action plans for their department
router.get("/hod", requireHOD, getActionPlansForHOD)
// User: get all action plans assigned to them
router.get("/user", getActionPlansForUser)
// User: get action plans where they are original survey respondents
router.get("/survey-respondent", getActionPlansForSurveyRespondent)
// User: get individual action plans assigned to them
router.get("/individual", getIndividualActionPlansForUser)

// Create a new action plan (HOD or admin) - supports multiple users and individual action plans
router.post("/", requireHOD, createActionPlan)
// Update an action plan (HOD or admin)
router.put("/:id", updateActionPlan)
// User updates status of their assigned action plan
router.patch("/:id/status", updateActionPlanStatus)
// Delete an action plan (admin or HOD)
router.delete("/:id", requireHOD, deleteActionPlan)

// Test email configuration (admin only)
router.get("/test-email", requireAdmin, testEmailConfig)

export default router
