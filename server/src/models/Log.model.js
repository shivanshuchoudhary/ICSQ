import { Schema, model } from "mongoose"

const LogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Can be null for system events
    },
    userEmail: {
      type: String,
      required: false,
    },
    userName: {
      type: String,
      required: false,
    },
    action: {
      type: String,
      required: true,
      enum: [
        // Authentication actions
        'LOGIN',
        'LOGIN_FAILED',
        'LOGOUT',
        'REGISTER',
        'REGISTER_FAILED',
        'PASSWORD_RESET',
        'PASSWORD_CHANGE',
        
        // Survey actions
        'SURVEY_CREATED',
        'SURVEY_UPDATED',
        'SURVEY_DELETED',
        'SURVEY_SUBMITTED',
        'SURVEY_VIEWED',
        'SURVEY_ANALYTICS_VIEWED',
        
        // SIPOC actions
        'SIPOC_CREATED',
        'SIPOC_UPDATED',
        'SIPOC_DELETED',
        'SIPOC_VIEWED',
        
        // User management
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DELETED',
        'USER_VIEWED',
        'USER_ROLE_CHANGED',
        
        // Department actions
        'DEPARTMENT_CREATED',
        'DEPARTMENT_UPDATED',
        'DEPARTMENT_DELETED',
        'DEPARTMENT_VIEWED',
        'DEPARTMENT_MAPPING_CREATED',
        'DEPARTMENT_MAPPING_UPDATED',
        'DEPARTMENT_MAPPING_DELETED',
        
        // Category actions
        'CATEGORY_CREATED',
        'CATEGORY_UPDATED',
        'CATEGORY_DELETED',
        
        // Action Plan actions
        'ACTION_PLAN_CREATED',
        'ACTION_PLAN_UPDATED',
        'ACTION_PLAN_DELETED',
        'ACTION_PLAN_COMPLETED',
        
        // Analytics actions
        'ANALYTICS_VIEWED',
        'DEPARTMENT_SCORES_VIEWED',
        'EXPECTATION_DATA_VIEWED',
        
        // System actions
        'SYSTEM_ERROR',
        'SLOW_REQUEST',
        'API_REQUEST',
        'DATA_EXPORT',
        'DATA_IMPORT',
        'BACKUP_CREATED',
        'ANALYTICS_GENERATED',
        'LOGS_CLEARED',
        'AUTH_REQUEST'
      ]
    },
    resourceType: {
      type: String,
      required: false,
      enum: [
        'USER',
        'SURVEY',
        'SIPOC',
        'DEPARTMENT',
        'DEPARTMENT_MAPPING',
        'CATEGORY',
        'ACTION_PLAN',
        'SYSTEM'
      ]
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
    },
    departmentName: {
      type: String,
      required: false,
    },
    details: {
      type: Schema.Types.Mixed,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'PENDING'],
      default: 'SUCCESS'
    },
    errorMessage: {
      type: String,
      required: false,
    },
    requestMethod: {
      type: String,
      required: false,
    },
    requestUrl: {
      type: String,
      required: false,
    },
    responseTime: {
      type: Number, // in milliseconds
      required: false,
    }
  },
  {
    timestamps: true,
  }
)

// Index for better query performance
LogSchema.index({ userId: 1, createdAt: -1 })
LogSchema.index({ action: 1, createdAt: -1 })
LogSchema.index({ resourceType: 1, resourceId: 1 })
LogSchema.index({ departmentId: 1, createdAt: -1 })
LogSchema.index({ createdAt: -1 })

export const Log = model("Log", LogSchema) 