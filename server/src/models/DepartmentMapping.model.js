import mongoose from "mongoose"
const { Schema, model } = mongoose;

const DepartmentMappingSchema = new Schema(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: false // Prevent automatic index creation
    },
    reviewerDepartments: [{
      type: Schema.Types.ObjectId,
      ref: 'Department',
      validate: {
        validator: function(v) {
          return v && v.toString() !== this.department?.toString();
        },
        message: 'A department cannot review itself'
      }
    }]
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to validate no self-review
DepartmentMappingSchema.pre('save', function(next) {
  if (!this.department) {
    return next(new Error('Department is required'));
  }
  
  if (this.reviewerDepartments?.some(dept => dept?.toString() === this.department?.toString())) {
    return next(new Error('A department cannot review itself'));
  }
  
  next();
});

// Pre-validate middleware
DepartmentMappingSchema.pre('validate', function(next) {
  if (!this.department) {
    return next(new Error('Department is required'));
  }
  next();
});

// Create the index explicitly with the correct name
DepartmentMappingSchema.index(
  { department: 1 }, 
  { 
    unique: true,
    name: 'department_unique',
    background: true,
    sparse: true
  }
);

const DepartmentMapping = model("DepartmentMapping", DepartmentMappingSchema);

export { DepartmentMapping }; 