import { Router } from "express"
const router = Router()
import { getDepartmentScores, getCategoryScores, getActionPlanStats, getPlatformStats, getDepartmentScoresforParticular, getExpectationData, exportDepartmentResponses, exportDepartmentMapping, exportUserDepartmentSummary, getSentimentResponses, getSentimentCounts, getClusteredResponses, getAssignedPatterns } from "../controllers/analytics.controller.js"
import { summarizeExpectationsRuleBased, summarizeExpectationsAI, generateActionPlansFromAI, analyzeTrendsAndPredictions } from "../controllers/summarization.controller.js"
import { requireAuth } from "../middleware/auth.js"

// Apply auth middleware to all routes
router.use(requireAuth)

router.get("/stats", getPlatformStats)

// Get department scores
router.get("/department-scores", getDepartmentScores)

//Get scores given to a particular department by other departmnets
router.get("/department-scores/:id", getDepartmentScoresforParticular)

// Get category scores
router.get("/category-scores", getCategoryScores)

// Get action plan stats
router.get("/action-plan-stats", getActionPlanStats)

// Get Expectaions data
router.get("/expectation-data/:id", getExpectationData)

// Summarization endpoints
router.get("/summarize-expectations/rule", summarizeExpectationsRuleBased)
router.get("/summarize-expectations/ai", summarizeExpectationsAI)

// Enhanced AI features
router.post("/generate-action-plans", generateActionPlansFromAI)
router.get("/analyze-trends", analyzeTrendsAndPredictions)

// Export department responses to CSV
router.get("/export-department-responses", exportDepartmentResponses)

// Export department mapping (which departments can review which)
router.get("/export-department-mapping", exportDepartmentMapping)

// Export user department summary (user counts per department)
router.get("/export-user-department-summary", exportUserDepartmentSummary)

// Sentiment analysis endpoints
router.get("/sentiment-responses", getSentimentResponses)
router.get("/sentiment-counts", getSentimentCounts)
router.get("/clustered-responses", getClusteredResponses)
router.get("/assigned-patterns", getAssignedPatterns)

export default router

