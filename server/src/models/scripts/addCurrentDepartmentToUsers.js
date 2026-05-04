import mongoose from "mongoose";
import { User } from "../models/User.model.js";
import dotenv from "dotenv";

dotenv.config();

export async function addCurrentDepartment() {
  const users = await User.find({});
  let updatedCount = 0;
  for (const user of users) {
    if (!user.currentDepartment) {
      user.currentDepartment = user.department;
      await user.save();
      updatedCount++;
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} users.`);
  mongoose.disconnect();
}

// addCurrentDepartment(); 