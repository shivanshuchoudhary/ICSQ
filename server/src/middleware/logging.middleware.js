import { logActivity } from "../utils/logger.js"

/**
 * Middleware to log only important API events and errors
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Store original send method
  const originalSend = res.send
  
  // Override send method to capture only important events
  res.send = function(data) {
    const responseTime = Date.now() - startTime
    
    // Only log important events, not every API call
    let shouldLog = false
    let action = 'API_REQUEST'
    const method = req.method
    const path = req.route?.path || req.path
    
    // Log only important operations (CREATE, UPDATE, DELETE)
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      shouldLog = true
      
      // Map common endpoints to readable actions
      if (path.includes('/surveys')) {
        if (method === 'POST') action = 'SURVEY_CREATED'
        else if (method === 'PUT') action = 'SURVEY_UPDATED'
        else if (method === 'DELETE') action = 'SURVEY_DELETED'
      } else if (path.includes('/sipoc')) {
        if (method === 'POST') action = 'SIPOC_CREATED'
        else if (method === 'PUT') action = 'SIPOC_UPDATED'
        else if (method === 'DELETE') action = 'SIPOC_DELETED'
      } else if (path.includes('/users')) {
        if (method === 'POST') action = 'USER_CREATED'
        else if (method === 'PUT') action = 'USER_UPDATED'
        else if (method === 'DELETE') action = 'USER_DELETED'
      } else if (path.includes('/departments')) {
        if (method === 'POST') action = 'DEPARTMENT_CREATED'
        else if (method === 'PUT') action = 'DEPARTMENT_UPDATED'
        else if (method === 'DELETE') action = 'DEPARTMENT_DELETED'
      } else if (path.includes('/action-plans')) {
        if (method === 'POST') action = 'ACTION_PLAN_CREATED'
        else if (method === 'PUT') action = 'ACTION_PLAN_UPDATED'
        else if (method === 'DELETE') action = 'ACTION_PLAN_DELETED'
      }
    }
    
    // Log only if it's an important event or if there's an error
    if (shouldLog || res.statusCode >= 400) {
      logActivity({
        action,
        resourceType: 'SYSTEM',
        user: req.user,
        details: {
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
          responseTime
        },
        request: req,
        status: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE'
      })
    }
    
    // Call original send method
    return originalSend.call(this, data)
  }
  
  next()
}

/**
 * Middleware to log authentication events
 */
export const authLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Store original send method
  const originalSend = res.send
  
  // Override send method to capture authentication responses
  res.send = function(data) {
    const responseTime = Date.now() - startTime
    
    // Check if this is an authentication endpoint
    const isAuthEndpoint = req.path.includes('/auth') || 
                          req.path.includes('/login') || 
                          req.path.includes('/register') ||
                          req.path.includes('/logout')
    
    if (isAuthEndpoint) {
      let action = 'AUTH_REQUEST'
      let status = 'SUCCESS'
      let errorMessage = null
      
      // Determine the specific action using valid enum values
      if (req.path.includes('/login')) {
        action = res.statusCode === 200 ? 'LOGIN' : 'LOGIN_FAILED'
      } else if (req.path.includes('/register')) {
        action = res.statusCode === 201 ? 'REGISTER' : 'REGISTER_FAILED'
      } else if (req.path.includes('/logout')) {
        action = 'LOGOUT'
      } else {
        action = 'AUTH_REQUEST'
      }
      
      if (res.statusCode >= 400) {
        status = 'FAILURE'
        try {
          const responseData = JSON.parse(data)
          errorMessage = responseData.message || 'Authentication failed'
        } catch (e) {
          errorMessage = 'Authentication failed'
        }
      }
      
      // Log authentication event
      logActivity({
        action,
        resourceType: 'USER',
        user: req.user,
        details: {
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode
        },
        request: req,
        status,
        errorMessage,
        responseTime
      })
    }
    
    // Call original send method
    return originalSend.call(this, data)
  }
  
  next()
}

/**
 * Error logging middleware - keep this for error tracking
 */
export const errorLogger = (error, req, res, next) => {
  // Log the error
  logActivity({
    action: 'SYSTEM_ERROR',
    resourceType: 'SYSTEM',
    user: req.user,
    details: {
      error: error.message,
      stack: error.stack,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode || 500
    },
    request: req,
    status: 'FAILURE',
    errorMessage: error.message
  })
  
  next(error)
}

// Removed performanceLogger middleware as it was logging too many events 