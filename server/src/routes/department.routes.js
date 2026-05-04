import { Router } from "express"
const router = Router()
import { getDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment } from "../controllers/department.controller.js"
import { requireAdmin, requireAuth } from "../middleware/auth.js"

// Apply auth middleware to all routes
router.use(requireAuth)

// Get all departments
router.get("/", getDepartments)

// Get department by ID
router.get("/:id", getDepartmentById)

// Create a new department
router.post("/",requireAdmin, createDepartment)

// Update a department
router.put("/:id", requireAdmin, updateDepartment)

// Delete a department
router.delete("/:id",requireAdmin,deleteDepartment)

export default router
