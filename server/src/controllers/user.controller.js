import { User } from "../models/User.model.js"
import { Department } from "../models/Department.model.js"
import mongoose from "mongoose"
import { generateToken, setAuthCookie } from "../middleware/auth.js"
import { logUserEvent } from "../utils/logger.js"

// Get all users
export async function getUsers(req, res) {
  try {
    const users = await User.find().select("-password")

    return res.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return res.status(500).json({ message: "Failed to fetch users" })
  }
}

// Get users by department
export async function getUsersByDepartment(req, res) {
  try {
    const { departmentId } = req.params;
    
    if (!departmentId) {
      return res.status(400).json({ message: "Department ID is required" })
    }

    const users = await User.find({ 
      department: departmentId,
      role: { $ne: 'hod' } // Exclude HODs from the list
    }).select("-password").populate("department", "name")

    return res.json(users)
  } catch (error) {
    console.error("Error fetching users by department:", error)
    return res.status(500).json({ message: "Failed to fetch users by department" })
  }
}

// Get user by ID
export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    return res.json(user)
  } catch (error) {
    console.error(`Error fetching user ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to fetch user" })
  }
}

export async function addUser(req, res) {
  try {
    const { name, email, password, department, role = "user", surveyedDepartmentIds = [], headedDepartments = [] } = req.body

    if (!name || !email || !password || !department) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" })
    }

    const departmentData = await Department.findById(department);
    if (!departmentData){
      return res.status(404).json({message : "Invalid Department Id"})
    }

    // Validate surveyed departments
    if (surveyedDepartmentIds.length > 0) {
      const validDepartments = await Department.find({ _id: { $in: surveyedDepartmentIds } });
      if (validDepartments.length !== surveyedDepartmentIds.length) {
        return res.status(400).json({ message: "One or more surveyed department IDs are invalid" });
      }
    }

    // Validate headed departments (if provided)
    if (headedDepartments.length > 0) {
      const validHeadedDepartments = await Department.find({ _id: { $in: headedDepartments } });
      if (validHeadedDepartments.length !== headedDepartments.length) {
        return res.status(400).json({ message: "One or more headed department IDs are invalid" });
      }
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      department : new mongoose.Types.ObjectId(department),
      role,
      surveyedDepartmentIds,
      headedDepartments
    })

    await user.save()
    const resUser = await User.findById(user._id).select("-password").populate("headedDepartments")

    // Log user creation
    await logUserEvent('USER_CREATED', resUser, req.user, req, 'SUCCESS')

    return res.status(201).json({ 
      message: "Registration successful",
      user : resUser
    })
  } catch (error) {
    console.error("Registration error:", error)
    // Log user creation error
    await logUserEvent('USER_CREATED', { email: req.body.email, name: req.body.name }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "An error occurred during registration" })
  }
}

// Update a user
export async function updateUser(req, res) {
  try {
    const { name, email, department: departmentId, role, password, surveyedDepartmentIds, headedDepartments } = req.body
    
    const user = await User.findById(req.params?.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Store original values for logging
    const originalRole = user.role
    const originalDepartment = user.department

    if (name) user.name = name
    if (email) user.email = email
    if (departmentId){ 
      user.department = new mongoose.Types.ObjectId(departmentId)
      user.currentDepartment = new mongoose.Types.ObjectId(departmentId)
    }
    if (role) user.role = role
    if (password) user.password = password
    
    // Update surveyed departments if provided
    if (surveyedDepartmentIds) {
      // Validate surveyed departments
      if (surveyedDepartmentIds.length > 0) {
        const validDepartments = await Department.find({ _id: { $in: surveyedDepartmentIds } });
        if (validDepartments.length !== surveyedDepartmentIds.length) {
          return res.status(400).json({ message: "One or more surveyed department IDs are invalid" });
        }
      }
      user.surveyedDepartmentIds = surveyedDepartmentIds;
    }

    // Update headed departments if provided
    if (headedDepartments) {
      // Validate headed departments
      if (headedDepartments.length > 0) {
        const validHeadedDepartments = await Department.find({ _id: { $in: headedDepartments } });
        if (validHeadedDepartments.length !== headedDepartments.length) {
          return res.status(400).json({ message: "One or more headed department IDs are invalid" });
        }
      }
      user.headedDepartments = headedDepartments;
    }

    await user.save({validateBeforeSave : false})
    const updatedUser = await User.findById(user._id).select("-password").populate("headedDepartments")

    // Log user update
    await logUserEvent('USER_UPDATED', updatedUser, req.user, req, 'SUCCESS')

    // Log role change if role was updated
    if (role && role !== originalRole) {
      await logUserEvent('USER_ROLE_CHANGED', updatedUser, req.user, req, 'SUCCESS')
    }

    return res.json(updatedUser)
  } catch (error) {
    console.error(`Error updating user ${req.params.id}:`, error)
    // Log user update error
    await logUserEvent('USER_UPDATED', { _id: req.params.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to update user" })
  }
}

// Delete a user
export async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    await user.deleteOne()

    // Log user deletion
    await logUserEvent('USER_DELETED', user, req.user, req, 'SUCCESS')

    return res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error(`Error deleting user ${req.params.id}:`, error)
    // Log user deletion error
    await logUserEvent('USER_DELETED', { _id: req.params.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to delete user" })
  }
}

// Update only currentDepartment for HODs
export async function updateCurrentDepartment(req, res) {
  try {
    const userId = req.params.id;
    const { departmentId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "hod") {
      return res.status(403).json({ message: "Only HODs can change current department" });
    }
    // Check if departmentId is in headedDepartments
    if (!user.headedDepartments.map(String).includes(String(departmentId)) && (String(user.department) !== String(departmentId) )) {
      return res.status(400).json({ message: "HOD does not head this department" });
    }
    user.currentDepartment = departmentId;
    await user.save();
    return res.json({ message: "Current department updated", currentDepartment: user.currentDepartment });
  } catch (error) {
    console.error("Error updating current department:", error);
    return res.status(500).json({ message: "Failed to update current department" });
  }
}

// Reset currentDepartment to department (for logout)
export async function resetCurrentDepartment(req, res) {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.currentDepartment = user.department;
    await user.save();
    return res.json({ message: "Current department reset", currentDepartment: user.currentDepartment });
  } catch (error) {
    console.error("Error resetting current department:", error);
    return res.status(500).json({ message: "Failed to reset current department" });
  }
}

