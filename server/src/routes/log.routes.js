import express from "express"
import {
  getLogsController,
  getLogsByUser,
  getLogsByDepartment,
  getLogsByAction,
  getLogsByResourceType,
  getLogsByDateRange,
  getLogsStatistics,
  exportLogs,
  clearOldLogs
} from "../controllers/log.controller.js"
import { requireAuth, requireLogViewPermission } from "../middleware/auth.js"
import { Log } from "../models/Log.model.js"

const router = express.Router()

// Apply authentication middleware to all routes
router.use(requireAuth)

// Special admin dashboard - only for users with log viewing permission
router.get("/admin-dashboard", requireLogViewPermission, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query

    // Get recent logs
    const logs = await Log.find()
      .populate('userId', 'name email')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const total = await Log.countDocuments()

    // Get quick statistics
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayLogs = await Log.countDocuments({
      createdAt: { $gte: today }
    })

    const loginCount = await Log.countDocuments({
      action: 'LOGIN',
      createdAt: { $gte: today }
    })

    const errorCount = await Log.countDocuments({
      status: 'FAILURE',
      createdAt: { $gte: today }
    })

    // Get top actions
    const topActions = await Log.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    // Get top users
    const topUsers = await Log.aggregate([
      { $match: { userId: { $exists: true, $ne: null } } },
      { $group: { _id: "$userId", userName: { $first: "$userName" }, userEmail: { $first: "$userEmail" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    return res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      },
      statistics: {
        todayLogs,
        loginCount,
        errorCount,
        topActions,
        topUsers
      }
    })
  } catch (error) {
    console.error("Error fetching admin dashboard:", error)
    return res.status(500).json({ message: "Failed to fetch admin dashboard" })
  }
})

// Apply log viewing permission to all log endpoints
router.use(requireLogViewPermission)

// Get all logs with filtering and pagination
router.get("/", getLogsController)

// Get logs by user ID
router.get("/user/:userId", getLogsByUser)

// Get logs by department ID
router.get("/department/:departmentId", getLogsByDepartment)

// Get logs by action type
router.get("/action/:action", getLogsByAction)

// Get logs by resource type
router.get("/resource/:resourceType", getLogsByResourceType)

// Get logs by date range
router.get("/date-range", getLogsByDateRange)

// Get logs statistics
router.get("/statistics", getLogsStatistics)

// Export logs to CSV
router.get("/export", exportLogs)

// Clear old logs (admin only)
router.delete("/clear", clearOldLogs)

export default router 