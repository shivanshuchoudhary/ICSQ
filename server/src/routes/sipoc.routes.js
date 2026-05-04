import { Router } from "express"
const router = Router()
import { getSIPOCByDepartment, createSIPOC, deleteSIPOC, updateSIPOC, getSIPOCById } from "../controllers/sipoc.controller.js"
import { requireAdmin, requireAuth, requireHOD } from "../middleware/auth.js"
import { upload } from "../middleware/multer.js"

// Apply auth middleware to all routes
router.use(requireAuth)

// Get SIPOC by department
router.get("/", getSIPOCByDepartment)

// Get SIPOC by Id
router.get("/:id", getSIPOCById)

//Create SIPOC
router.post("/", requireHOD,
    upload.fields([
        {
            name : "processPicture",
            maxCount : 1
        }
    ]),
    createSIPOC)

// update SIPOC
router.put("/:id", requireHOD,
    upload.fields([
        {
            name : "processPicture",
            maxCount : 1
        }
    ]),
    updateSIPOC)

// Delete SIPOC
router.delete("/", requireHOD, deleteSIPOC)

export default router
