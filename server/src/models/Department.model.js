import { Schema, model } from "mongoose"

const DepartmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase : true
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

export const Department = model("Department", DepartmentSchema)
