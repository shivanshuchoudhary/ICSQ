import { Schema, model } from "mongoose"

const CategorySchema = new Schema(
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
    department : {
      type : Schema.Types.ObjectId,
      ref : "Department"
    }
  },
  {
    timestamps: true,
  },
)

export const Category = model("Category", CategorySchema)
