import { Log } from "../models/Log.model.js"
import { Department } from "../models/Department.model.js"

/**
 * Log an activity in the system - simplified version
 * @param {Object} logData - The log data object
 * @param {string} logData.action - The action performed
 * @param {string} logData.resourceType - Type of resource (USER, SURVEY, SIPOC, etc.)
 * @param {string} logData.resourceId - ID of the resource
 * @param {Object} logData.user - User object (optional)
 * @param {Object} logData.department - Department object (optional)
 * @param {Object} logData.details - Additional details about the action
 * @param {Object} logData.request - Express request object (optional)
 * @param {string} logData.status - Status of the action (SUCCESS, FAILURE, PENDING)
 * @param {string} logData.errorMessage - Error message if status is FAILURE
 * @param {number} logData.responseTime - Response time in milliseconds
 */
export async function logActivity(logData) {
  try {
    const {
      action,
      resourceType,
      resourceId,
      user = null,
      department = null,
      details = {},
      request = null,
      status = 'SUCCESS',
      errorMessage = null,
      responseTime = null
    } = logData

    // Get minimal IP address and user agent from request
    let ipAddress = null
    let userAgent = null

    if (request) {
      ipAddress = request.ip || request.connection?.remoteAddress || request.headers['x-forwarded-for']
      userAgent = request.headers['user-agent']
    }

    // Prepare simplified log entry - only essential fields
    const logEntry = {
      action,
      resourceType,
      resourceId,
      status,
      errorMessage,
      responseTime,
      ipAddress,
      userAgent
    }

    // Add user information if available (only essential fields)
    if (user) {
      logEntry.userId = user._id
      logEntry.userEmail = user.email
      logEntry.userName = user.name
    }

    // Add department information if available
    if (department) {
      logEntry.departmentId = department._id
      logEntry.departmentName = department.name
    }

    // Add only essential details (remove verbose request data)
    if (Object.keys(details).length > 0) {
      logEntry.details = details
    }

    // Create and save the log entry
    const log = new Log(logEntry)
    await log.save()

    // Simplified console logging
    if (status === 'FAILURE') {
      console.error(`[ERROR] ${action} - ${resourceType}${resourceId ? ` (${resourceId})` : ''} - ${errorMessage || 'Unknown error'}`)
    } else {
      console.log(`[LOG] ${action} - ${resourceType}${resourceId ? ` (${resourceId})` : ''} - ${status}`)
    }
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw error to avoid breaking the main functionality
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(action, user, request, status = 'SUCCESS', errorMessage = null) {
  await logActivity({
    action,
    resourceType: 'USER',
    resourceId: user?._id,
    user,
    details: {
      event: action,
      timestamp: new Date().toISOString()
    },
    request,
    status,
    errorMessage
  })
}

/**
 * Log survey events
 */
export async function logSurveyEvent(action, survey, user, request, status = 'SUCCESS', errorMessage = null) {
  let department = null
  if (survey?.fromDepartment) {
    department = await Department.findById(survey.fromDepartment)
  }

  await logActivity({
    action,
    resourceType: 'SURVEY',
    resourceId: survey?._id,
    user,
    department,
    details: {
      surveyId: survey?._id,
      fromDepartment: survey?.fromDepartment,
      toDepartment: survey?.toDepartment,
      responsesCount: survey?.responses ? Object.keys(survey.responses).length : 0
    },
    request,
    status,
    errorMessage
  })
}

/**
 * Log SIPOC events
 */
export async function logSIPOCEvent(action, sipoc, user, request, status = 'SUCCESS', errorMessage = null) {
  let department = null
  if (sipoc?.department) {
    department = await Department.findById(sipoc.department)
  }

  await logActivity({
    action,
    resourceType: 'SIPOC',
    resourceId: sipoc?._id,
    user,
    department,
    details: {
      sipocId: sipoc?._id,
      department: sipoc?.department,
      hasProcessFile: !!sipoc?.entries?.process?.file
    },
    request,
    status,
    errorMessage
  })
}

/**
 * Log user management events
 */
export async function logUserEvent(action, targetUser, user, request, status = 'SUCCESS', errorMessage = null) {
  let department = null
  if (targetUser?.department) {
    department = await Department.findById(targetUser.department)
  }

  await logActivity({
    action,
    resourceType: 'USER',
    resourceId: targetUser?._id,
    user,
    department,
    details: {
      targetUserId: targetUser?._id,
      targetUserEmail: targetUser?.email,
      targetUserName: targetUser?.name,
      targetUserRole: targetUser?.role
    },
    request,
    status,
    errorMessage
  })
}

/**
 * Log department events
 */
export async function logDepartmentEvent(action, department, user, request, status = 'SUCCESS', errorMessage = null) {
  await logActivity({
    action,
    resourceType: 'DEPARTMENT',
    resourceId: department?._id,
    user,
    department,
    details: {
      departmentId: department?._id,
      departmentName: department?.name
    },
    request,
    status,
    errorMessage
  })
}

/**
 * Log system errors
 */
export async function logSystemError(error, request, user = null) {
  await logActivity({
    action: 'SYSTEM_ERROR',
    resourceType: 'SYSTEM',
    user,
    details: {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    },
    request,
    status: 'FAILURE',
    errorMessage: error.message
  })
}

/**
 * Get logs with filtering options
 */
export async function getLogs(filters = {}, page = 1, limit = 50) {
  try {
    const skip = (page - 1) * limit
    const query = {}

    // Apply filters
    if (filters.userId) query.userId = filters.userId
    if (filters.action) query.action = filters.action
    if (filters.resourceType) query.resourceType = filters.resourceType
    if (filters.resourceId) query.resourceId = filters.resourceId
    if (filters.departmentId) query.departmentId = filters.departmentId
    if (filters.status) query.status = filters.status
    if (filters.startDate) query.createdAt = { $gte: new Date(filters.startDate) }
    if (filters.endDate) {
      if (query.createdAt) {
        query.createdAt.$lte = new Date(filters.endDate)
      } else {
        query.createdAt = { $lte: new Date(filters.endDate) }
      }
    }

    const logs = await Log.find(query)
      .populate('userId', 'name email')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Log.countDocuments(query)

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {
    console.error('Error fetching logs:', error)
    throw error
  }
} 