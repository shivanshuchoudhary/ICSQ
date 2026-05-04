import jwt from "jsonwebtoken"
import {User} from "../models/User.model.js"

// Middleware to check if user is authenticated
export async function requireAuth(req, res, next) {
  try {
    // Get token from cookie
    const token = req.cookies.icsq_token
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Get user from database
    const user = await User.findById(decoded.id).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Add user to request object
    req.user = user
    next()
  } catch (error) {
    console.error("Authentication error:", error)
    return res.status(401).json({ message: "Authentication failed" })
  }
}

// Middleware to check if user is admin
export async function requireAdmin(req, res, next) {
  try {
    if (req.user && req.user.role === "admin") {
      next()
    } else {
      return res.status(403).json({ message: "Access denied (Only Admins are permitted)" })
    }
  } catch (error) {
    console.error("Authorization error:", error)
    return res.status(403).json({ message: "Authorization failed" })
  }
}

// Middleware to check if user is HOD
export async function requireHOD(req, res, next) {
  try {
    if (req.user && (req.user.role === "hod" || req.user.role === "admin")) {
      return next()
    }
    return res.status(403).json({ message: "Access denied (Only HODs and admins are permitted)" })
  } catch (error) {
    console.error("HOD authorization error:", error)
    return res.status(403).json({ message: "Authorization failed" })
  }
}

// Middleware to check if user has permission to view logs
export async function requireLogViewPermission(req, res, next) {
  try {
    // Allow access to admin users
    if (req.user && req.user.role === "admin") {
      return next()
    }
    
    // Allow access to specific users with log viewing permission
    const allowedLogViewers = [
      'shivanshu.choudhary@sobharealty.com',
      'ananth.nallasamy@sobharealty.com'
    ]
    
    if (req.user && allowedLogViewers.includes(req.user.email)) {
      return next()
    }
    
    return res.status(403).json({ message: "Access denied. Log viewing permission required." })
  } catch (error) {
    console.error("Log view permission error:", error)
    return res.status(403).json({ message: "Authorization failed" })
  }
}

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  )
}

// Set auth cookie
export function setAuthCookie(res, token) {
  res.cookie("icsq_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  })
}

// Clear auth cookie
export function clearAuthCookie(res) {
  res.clearCookie("icsq_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  })
}
