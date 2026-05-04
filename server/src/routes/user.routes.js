import { Router } from "express";
const router = Router()
import { requireAdmin, requireAuth, requireHOD } from "../middleware/auth.js"
import { addUser, deleteUser, getUserById, getUsers, updateUser, updateCurrentDepartment, resetCurrentDepartment, getUsersByDepartment } from "../controllers/user.controller.js";

// Apply auth middleware to all routes
router.use(requireAuth)

// Get all users 
router.get("/", getUsers)

// Get users by department
router.get("/department/:departmentId", getUsersByDepartment)

// Get user by ID
router.get("/:id", getUserById)

// Register a new user 
router.post("/",requireAdmin, addUser)

// Update a user
router.put("/:id", updateUser)

// Update currentDepartment (HOD only)
router.patch("/:id/current-department", requireHOD, updateCurrentDepartment)

// Reset currentDepartment to department (logout)
router.post("/:id/reset-current-department", resetCurrentDepartment)

// Delete user
router.delete("/:id", requireAdmin, deleteUser)

// Get users by department (excluding HODs and admins)
router.get("/by-department/:departmentId", getUsersByDepartment);

export default router