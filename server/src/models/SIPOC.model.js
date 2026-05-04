import { Schema, model } from "mongoose"

const SIPOCSchema = new Schema(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref:'Department',
      required : true
    },
    entries:{
        supplier: String,
        input: String,
        process: {
          input : String,
          file : String
        },
        output: String,
        customer: String,
    },
  },
  {
    timestamps: true,
  },
)

export const SIPOC =  model("SIPOC", SIPOCSchema)
