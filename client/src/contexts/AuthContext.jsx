import { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"
import { Server } from "../Constants"

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${Server}/auth/me`, { withCredentials: true })
      setCurrentUser(response.data)
    } catch (error) {
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Login function
  const login = async (email, password) => {
    const response = await axios.post(`${Server}/auth/login`, { email, password }, { withCredentials: true })
    setCurrentUser(response.data.user)
    return response.data
  }

  // Logout function
  const logout = async () => {
    await axios.post(`${Server}/auth/logout`, {}, { withCredentials: true })
    setCurrentUser(null)
  }

  // Get Microsoft login URL
  const getMicrosoftLoginUrl = async () => {
    const response = await axios.get(`${Server}/auth/microsoft`);
    return response.data.loginUrl;
  }

  // Check if user is admin
  const isAdmin = () => {
    return currentUser?.role === "admin"
  }

  // Check if user is HOD
  const isHod = () => {
    return currentUser?.role === "hod"
  }

  // Get all departments a HOD can head (including their own)
  const getHodDepartments = () => {
    if (!isHod()) return [];
    // headedDepartments is an array of department objects, department is the main one
    const depts = [currentUser?.department, ...(currentUser?.headedDepartments || [])];
    // Remove duplicates by _id
    const seen = new Set();
    return depts.filter(d => d && !seen.has(d._id) && seen.add(d._id));
  }

  // Get the current department (for all logic)
  const getCurrentDepartment = () => {
    return currentUser?.currentDepartment || currentUser?.department;
  }

  // Check if user has access to a specific department
  const hasAccessToDepartment = (departmentId) => {
    if (isAdmin()) return true
    if (isHod()) {
      return getHodDepartments().some(d => d._id === departmentId)
    }
    return getCurrentDepartment()?._id === departmentId
  }

  const value = {
    currentUser,
    loading,
    login,
    logout,
    checkAuth,
    getMicrosoftLoginUrl,
    isAdmin,
    isHod,
    getHodDepartments,
    getCurrentDepartment,
    hasAccessToDepartment,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
