import React from 'react'
import { useAuth } from "../contexts/AuthContext"
import { motion } from "framer-motion"
import { capitalizeFirstLetter } from "../Constants"
import { useNavigate } from "react-router-dom"

function ProfilePage() {
  const { currentUser, getCurrentDepartment } = useAuth()
  const navigate = useNavigate()

  const getInitials = (name) => {
    if (!name) return "U"
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    
    // Return only the first two initials
    return initials.slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-[#29252c] py-12 px-4 sm:px-6 lg:px-8 text-gray-200">
      <div className="max-w-3xl mx-auto">
        {/* Back to Home Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate('/dashboard')}
          className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-[goldenrod] transition-colors group"
        >
          <svg 
            className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Home</span>
        </motion.button>

        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-[goldenrod]">
            My Profile
          </h1>
          <p className="mt-2 text-gray-400">
            Manage your account information
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#29252c]/70 rounded-2xl shadow-xl border border-gray-700 overflow-hidden"
        >
          {/* Profile Banner */}
          <div className="h-32 bg-gradient-to-r from-[goldenrod]/20 via-amber-500/20 to-[goldenrod]/20" />

          {/* Profile Content */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-12 left-6">
              <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-[goldenrod] to-amber-500 flex items-center justify-center text-2xl font-bold text-black shadow-lg border-4 border-gray-900">
                {getInitials(currentUser.name)}
              </div>
            </div>

            {/* User Info */}
            <div className="pt-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Full Name</label>
                    <div className="mt-1 text-lg font-semibold text-gray-200">
                      {currentUser.name || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Email Address</label>
                    <div className="mt-1 text-lg font-semibold text-gray-200">
                      {currentUser.email || "Not specified"}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Department</label>
                    <div className="mt-1 text-lg font-semibold text-[goldenrod]">
                      {capitalizeFirstLetter(getCurrentDepartment()?.name) || "Not assigned"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Role</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        currentUser.role === "admin" 
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {capitalizeFirstLetter(currentUser.role) || "Not specified"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-8 pt-8 border-t border-gray-700">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-[#29252c]/70">
                    <div className="text-2xl font-bold text-[goldenrod]">12</div>
                    <div className="text-sm text-gray-400">Surveys Completed</div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#29252c]/70">
                    <div className="text-2xl font-bold text-[goldenrod]">5</div>
                    <div className="text-sm text-gray-400">Departments Reviewed</div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#29252c]/70">
                    <div className="text-2xl font-bold text-[goldenrod]">98%</div>
                    <div className="text-sm text-gray-400">Response Rate</div>
                  </div>
                  <div className="p-4 rounded-lg bg-[#29252c]/70">
                    <div className="text-2xl font-bold text-[goldenrod]">4.8</div>
                    <div className="text-sm text-gray-400">Avg. Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <button className="p-4 rounded-xl bg-[#29252c]/70 border border-gray-700 hover:border-[goldenrod]/30 transition-all duration-300 group">
            <h3 className="text-lg font-semibold text-gray-200 group-hover:text-[goldenrod]">My Surveys</h3>
            <p className="mt-1 text-sm text-gray-400">View your survey history and responses</p>
          </button>
          <button className="p-4 rounded-xl bg-[#29252c]/70 border border-gray-700 hover:border-[goldenrod]/30 transition-all duration-300 group">
            <h3 className="text-lg font-semibold text-gray-200 group-hover:text-[goldenrod]">Department Reports</h3>
            <p className="mt-1 text-sm text-gray-400">Access detailed department performance reports</p>
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default ProfilePage
