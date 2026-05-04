import { Router } from "express"
const router = Router()
import { getDepartmentMappings, getDepartmentMappingById, updateDepartmentMapping, deleteDepartmentMapping } from "../controllers/departmentMapping.controller.js"
import { requireAdmin, requireAuth } from "../middleware/auth.js"

// Apply auth middleware to all routes
router.use(requireAuth)

// Get all department mappings
router.get("/", getDepartmentMappings)

// Get mapping by department ID
router.get("/:id", getDepartmentMappingById)

// Create or update department mapping
router.put("/", requireAdmin, updateDepartmentMapping)

// Delete department mapping
router.delete("/:id", requireAdmin, deleteDepartmentMapping)

export default router 