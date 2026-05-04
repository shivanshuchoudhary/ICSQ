import {User} from "../models/User.model.js"
import { generateToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js"
import { ConfidentialClientApplication } from "@azure/msal-node"
import { Department } from "../models/Department.model.js"
import { logAuthEvent } from "../utils/logger.js"

// Microsoft Teams SSO Configuration
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || ""}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  },
}

// Initialize Azure MSAL client for Microsoft Teams SSO
let msalClient = null
try {
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID) {
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET
      }
    })
  }
} catch (error) {
  console.error("Failed to initialize Azure MSAL client:", error.message)
}

// Helper function to get the correct redirect URI based on environment
function getRedirectUri(req) {
  const host = req.get("host");

  // If the request is coming to the production domain, always use the canonical production URL.
  if (host === "icsq.sobhaapps.com") {
    return "https://icsq.sobhaapps.com/api/v1/auth/microsoft/callback";
  }

  // For localhost development, use localhost
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return "http://localhost:8080/api/v1/auth/microsoft/callback";
  }

  // For development (e.g., internal IPs), build the URL dynamically.
  return `${req.protocol}://${host}/api/v1/auth/microsoft/callback`;
}

// Login with email and password
export async function login(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    // Find user by email
    const user = await User.findOne({ email })

    if (!user) {
      // Log failed login attempt
      await logAuthEvent('LOGIN_FAILED', null, req, 'FAILURE', 'User not found')
      return res.status(401).json({ message: "Invalid Email (User does not exist)" })
    }

    // If user has no password (SSO only), reject login
    if (!user.password) {
      await logAuthEvent('LOGIN_FAILED', user, req, 'FAILURE', 'SSO only user')
      return res.status(401).json({ message: "Please use Microsoft Teams to login" })
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password)

    if (!isMatch) {
      await logAuthEvent('LOGIN_FAILED', user, req, 'FAILURE', 'Invalid password')
      return res.status(401).json({ message: "Incorrect Password" })
    }

    // Generate JWT token
    const token = generateToken(user)

    // Set auth cookie
    setAuthCookie(res, token)

    // Log successful login
    await logAuthEvent('LOGIN', user, req, 'SUCCESS')

    // Populate headedDepartments
    const headedDepartments = await Department.find({ _id: { $in: user.headedDepartments || [] } });

    return res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        department: await Department.findById(user.department),
        currentDepartment: await Department.findById(user.currentDepartment),
        role: user.role,
        surveyedDepartmentIds : user.surveyedDepartmentIds,
        headedDepartments: headedDepartments
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    // Log login error
    await logAuthEvent('LOGIN', null, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "An error occurred during login" })
  }
}

// Logout
export async function logout(req, res) {
  try {
    // Clear auth cookie
    clearAuthCookie(res)

    // Log logout
    await logAuthEvent('LOGOUT', req.user, req, 'SUCCESS')

    return res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    // Log logout error
    await logAuthEvent('LOGOUT', req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "An error occurred during logout" })
  }
}

// Get current user
export async function getCurrentUser(req, res) {
  try {
    const headedDepartments = await Department.find({ _id: { $in: req.user.headedDepartments || [] } });
    return res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      department: await Department.findById(req.user.department),
      currentDepartment: await Department.findById(req.user.currentDepartment),
      role: req.user.role,
      surveyedDepartmentIds : req.user.surveyedDepartmentIds,
      headedDepartments: headedDepartments
    })
  } catch (error) {
    console.error("Get current user error:", error)
    return res.status(500).json({ message: "An error occurred while fetching user data" })
  }
}

// Get Microsoft Teams login URL
export async function getMicrosoftLoginUrl(req, res) {
  try {
    if (!msalClient) {
      return res.status(503).json({ message: "Microsoft Teams SSO is not configured" });
    }

    const redirectUri = getRedirectUri(req)

    const authCodeUrlParameters = {
      scopes: ["user.read"],
      redirectUri,
    }

    const loginUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters)

    return res.json({ loginUrl })
  } catch (error) {
    console.error("Microsoft login error:", error)
    console.error("Error stack:", error.stack);
    return res.status(500).json({ message: "Failed to generate Microsoft login URL" })
  }
}

// Handle Microsoft Teams authentication callback
export async function handleMicrosoftCallback(req, res) {
  try {
    if (!msalClient) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=not_configured`);
    }

    const code = req.query.code
    const redirectUri = getRedirectUri(req)

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`)
    }

    // Exchange code for token
    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes: ["user.read"],
      redirectUri,
    })

    // Get user info from Microsoft Graph
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user from Microsoft Graph")
    }

    const msUser = await response.json()

    // Find or create user in our database
    let user = await User.findOne({ email: msUser.mail || msUser.userPrincipalName })

    if (!user) {
      // Create new user
      user = new User({
        name: msUser.displayName,
        email: msUser.mail || msUser.userPrincipalName,
        department: "", // This would need to be set later
        role: "user", // Default role
      })

      await user.save()
      
      // Log user registration
      await logAuthEvent('REGISTER', user, req, 'SUCCESS')
    }

    // Generate JWT token
    const token = generateToken(user)

    // Set auth cookie
    setAuthCookie(res, token)

    // Log successful Microsoft login
    await logAuthEvent('LOGIN', user, req, 'SUCCESS')

    // Redirect to dashboard
    return res.redirect(`${process.env.CLIENT_URL}/dashboard`)
  } catch (error) {
    console.error("Microsoft callback error:", error)
    // Log Microsoft login failure
    await logAuthEvent('LOGIN', null, req, 'FAILURE', error.message)
    return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`)
  }
}
