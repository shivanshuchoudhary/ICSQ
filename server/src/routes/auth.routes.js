import { Router } from "express"
const router = Router()
import { login, logout, getCurrentUser, getMicrosoftLoginUrl, handleMicrosoftCallback } from "../controllers/auth.controller.js"
import { requireAuth } from "../middleware/auth.js"

// Login with email and password
router.post("/login", login)

// Logout
router.post("/logout", logout)

// Get current user
router.get("/me", requireAuth, getCurrentUser)

// Microsoft Teams SSO routes
router.get("/microsoft", getMicrosoftLoginUrl)
router.get("/microsoft/callback", handleMicrosoftCallback)

export default router
