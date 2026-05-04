import mongoose from "mongoose";

const ArchivedActionPlanSchema = new mongoose.Schema({
  // Copy all original ActionPlan fields
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  impactedDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expectations: {
    type: String,
    required: true
  },
  actionplan: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: ''
  },
  actions_taken: {
    type: Map,
    of: String,
    default: new Map()
  },
  status: {
    type: Map,
    of: String,
    default: new Map()
  },
  finalStatus: {
    type: String,
    enum: ["pending", "in-progress", "completed"],
    default: "pending"
  },
  targetDate: {
    type: Date,
    required: true
  },
  originalSurveyRespondents: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Survey'
    },
    originalExpectation: String,
    category: String
  }],
  
  // Archive-specific fields
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  archiveReason: {
    type: String,
    default: 'Action plan deleted'
  },
  originalCreatedAt: {
    type: Date,
    required: true
  },
  originalUpdatedAt: {
    type: Date,
    required: true
  },
  archivedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
ArchivedActionPlanSchema.index({ originalId: 1 });
ArchivedActionPlanSchema.index({ archivedBy: 1 });
ArchivedActionPlanSchema.index({ archivedAt: -1 });

const ArchivedActionPlan = mongoose.model('ArchivedActionPlan', ArchivedActionPlanSchema);

export default ArchivedActionPlan;
