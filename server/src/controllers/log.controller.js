import { getLogs, logActivity } from "../utils/logger.js"
import { Log } from "../models/Log.model.js"

/**
 * Special admin dashboard - only accessible to users with log viewing permission
 */
export async function getAdminDashboard(req, res) {
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
}

/**
 * Get all logs with filtering and pagination
 */
export async function getLogsController(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resourceType,
      resourceId,
      departmentId,
      status,
      startDate,
      endDate,
      userEmail,
      userName
    } = req.query

    const filters = {
      userId,
      action,
      resourceType,
      resourceId,
      departmentId,
      status,
      startDate,
      endDate
    }

    // Add text search filters
    if (userEmail) {
      filters.userEmail = { $regex: userEmail, $options: 'i' }
    }
    if (userName) {
      filters.userName = { $regex: userName, $options: 'i' }
    }

    const result = await getLogs(filters, parseInt(page), parseInt(limit))

    return res.json(result)
  } catch (error) {
    console.error("Error fetching logs:", error)
    return res.status(500).json({ message: "Failed to fetch logs" })
  }
}

/**
 * Get logs by user ID
 */
export async function getLogsByUser(req, res) {
  try {
    const { userId } = req.params
    const { page = 1, limit = 50 } = req.query

    const result = await getLogs({ userId }, parseInt(page), parseInt(limit))

    return res.json(result)
  } catch (error) {
    console.error("Error fetching user logs:", error)
    return res.status(500).json({ message: "Failed to fetch user logs" })
  }
}

/**
 * Get logs by department ID
 */
export async function getLogsByDepartment(req, res) {
  try {
    const { departmentId } = req.params
    const { page = 1, limit = 50 } = req.query

    const result = await getLogs({ departmentId }, parseInt(page), parseInt(limit))

    return res.json(result)
  } catch (error) {
    console.error("Error fetching department logs:", error)
    return res.status(500).json({ message: "Failed to fetch department logs" })
  }
}

/**
 * Get logs by action type
 */
export async function getLogsByAction(req, res) {
  try {
    const { action } = req.params
    const { page = 1, limit = 50 } = req.query

    const result = await getLogs({ action }, parseInt(page), parseInt(limit))

    return res.json(result)
  } catch (error) {
    console.error("Error fetching action logs:", error)
    return res.status(500).json({ message: "Failed to fetch action logs" })
  }
}

/**
 * Get logs by resource type
 */
export async function getLogsByResourceType(req, res) {
  try {
    const { resourceType } = req.params
    const { page = 1, limit = 50 } = req.query

    const result = await getLogs({ resourceType }, parseInt(page), parseInt(limit))

    return res.json(result)
  } catch (error) {
    console.error("Error fetching resource logs:", error)
    return res.status(500).json({ message: "Failed to fetch resource logs" })
  }
}

/**
 * Get logs by date range
 */
export async function getLogsByDateRange(req, res) {
  try {
    const { startDate, endDate } = req.query
    const { page = 1, limit = 50 } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" })
    }

    const result = await getLogs({ startDate, endDate }, parseInt(page), parseInt(limit))

    return res.json(result)
  } catch (error) {
    console.error("Error fetching date range logs:", error)
    return res.status(500).json({ message: "Failed to fetch date range logs" })
  }
}

/**
 * Get logs statistics
 */
export async function getLogsStatistics(req, res) {
  try {
    const { startDate, endDate } = req.query

    const dateFilter = {}
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // Get total logs
    const totalLogs = await Log.countDocuments(dateFilter)

    // Get logs by action
    const actionStats = await Log.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // Get logs by resource type
    const resourceStats = await Log.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$resourceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // Get logs by status
    const statusStats = await Log.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // Get top users by activity
    const topUsers = await Log.aggregate([
      { $match: { ...dateFilter, userId: { $exists: true, $ne: null } } },
      { $group: { _id: "$userId", userName: { $first: "$userName" }, userEmail: { $first: "$userEmail" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    // Get top departments by activity
    const topDepartments = await Log.aggregate([
      { $match: { ...dateFilter, departmentId: { $exists: true, $ne: null } } },
      { $group: { _id: "$departmentId", departmentName: { $first: "$departmentName" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    // Get average response time
    const avgResponseTime = await Log.aggregate([
      { $match: { ...dateFilter, responseTime: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgResponseTime: { $avg: "$responseTime" } } }
    ])

    return res.json({
      totalLogs,
      actionStats,
      resourceStats,
      statusStats,
      topUsers,
      topDepartments,
      avgResponseTime: avgResponseTime[0]?.avgResponseTime || 0
    })
  } catch (error) {
    console.error("Error fetching log statistics:", error)
    return res.status(500).json({ message: "Failed to fetch log statistics" })
  }
}

/**
 * Export logs to CSV
 */
export async function exportLogs(req, res) {
  try {
    const { startDate, endDate, action, resourceType, status } = req.query

    const filters = {}
    if (startDate && endDate) {
      filters.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }
    if (action) filters.action = action
    if (resourceType) filters.resourceType = resourceType
    if (status) filters.status = status

    const logs = await Log.find(filters)
      .populate('userId', 'name email')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .lean()

    // Convert to CSV format
    const csvHeaders = [
      'Timestamp',
      'Action',
      'Resource Type',
      'Resource ID',
      'User Name',
      'User Email',
      'Department Name',
      'Status',
      'IP Address',
      'Request Method',
      'Request URL',
      'Response Time (ms)',
      'Details'
    ]

    const csvRows = logs.map(log => [
      log.createdAt.toISOString(),
      log.action,
      log.resourceType || '',
      log.resourceId || '',
      log.userName || (log.userId?.name || ''),
      log.userEmail || (log.userId?.email || ''),
      log.departmentName || (log.departmentId?.name || ''),
      log.status,
      log.ipAddress || '',
      log.requestMethod || '',
      log.requestUrl || '',
      log.responseTime || '',
      JSON.stringify(log.details || {})
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=logs_${new Date().toISOString().split('T')[0]}.csv`)
    res.send(csvContent)

  } catch (error) {
    console.error("Error exporting logs:", error)
    return res.status(500).json({ message: "Failed to export logs" })
  }
}

/**
 * Clear old logs (admin only)
 */
export async function clearOldLogs(req, res) {
  try {
    const { days = 90 } = req.body

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days))

    const result = await Log.deleteMany({
      createdAt: { $lt: cutoffDate }
    })

    // Log this action
    await logActivity({
      action: 'LOGS_CLEARED',
      resourceType: 'SYSTEM',
      user: req.user,
      details: {
        daysOld: days,
        deletedCount: result.deletedCount,
        cutoffDate: cutoffDate.toISOString()
      },
      request: req
    })

    return res.json({
      message: `Cleared ${result.deletedCount} logs older than ${days} days`,
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error("Error clearing old logs:", error)
    return res.status(500).json({ message: "Failed to clear old logs" })
  }
} 