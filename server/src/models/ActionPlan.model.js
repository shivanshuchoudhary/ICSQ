import {Schema, model} from 'mongoose'

const ActionPlanSchema = new Schema(
  {
    departments: [{
      type: Schema.Types.ObjectId,
      ref : 'Department',
      required: true,
    }],
    impactedDepartments: [{
      type: Schema.Types.ObjectId,
      ref : 'Department',
      required: false,
    }],
    categories: [{
      type: Schema.Types.ObjectId,
      ref : 'Category',
      required: true,
    }],
    expectations: {
      type: String,
      required: true,
    },
    actionplan: {
      type: String,
      required: true,
    },
    instructions: {
      type: String,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref : 'User',
      required: true,
    },
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref : 'User',
      required: true,
    }],
    targetDate: {
      type: Date,
      required: true,
    },
    status: {
      type: Map,
      of: {
        type: String,
        enum: ["pending", "in-progress", "completed"],
        default: "pending",
      }
    },
    actions_taken: {
      type: Map,
      of: String
    },
    finalStatus: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    originalSurveyRespondents: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      surveyId: {
        type: Schema.Types.ObjectId,
        ref: 'Survey'
      },
      originalExpectation: {
        type: String,
        required: true
      },
      category: {
        type: String,
        required: true
      }
    }],
    individualActionPlans: {
      type: Map,
      of: {
        userName: {
          type: String,
          required: true
        },
        actionPlan: {
          type: String,
          required: true
        }
      }
    },
  },
  {
    timestamps: true,
  },
)

export const ActionPlan = model("ActionPlan", ActionPlanSchema)
