import { Schema, model } from "mongoose"
import { genSalt, hash, compare } from "bcrypt"

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
    },
    department: {
      type : Schema.Types.ObjectId,
      ref : 'Department',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["user","hod","admin"],
      default: "user"
    },
    surveyedDepartmentIds : [{
      type : String,
    }],
    headedDepartments: [{
      type: Schema.Types.ObjectId,
      ref: 'Department',
    }],
    currentDepartment: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
  },
  {
    timestamps: true,
  },
)

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.currentDepartment) {
    this.currentDepartment = this.department;
  }
  if (!this.isModified("password") || !this.password) {
    return next()
  }

  try {
    const salt = await genSalt(10)
    this.password = await hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false
  return await compare(candidatePassword, this.password)
}

export const User = model("User", UserSchema)
