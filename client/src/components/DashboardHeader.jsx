import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import { capitalizeFirstLetter, Server, ENABLE_HOD_DASHBOARD } from "../Constants"
import { FaAngleDown, FaAngleUp } from "react-icons/fa"
import logo from "../assets/logo.png"
import Dropdown from "./ui/Dropdown"
import axios from "axios"

function DashboardHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { currentUser, logout, isAdmin, getCurrentDepartment, isHod, getHodDepartments, checkAuth } = useAuth()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      if (isHod()) {
        try {
          await axios.post(
            `${Server}/users/${currentUser._id}/reset-current-department`,
            {},
            { withCredentials: true }
          );
        } catch (err) {
          toast({
            title: "Warning",
            description: "Could not reset department before logout.",
            variant: "destructive",
          });
        }
      }
      await logout()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      })
      navigate("/login")
    } catch (error) {
      console.log(error);
      
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      })
    }
  }

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

  // Department switcher for HODs
  const handleDepartmentSwitch = async (dept) => {
    if (!dept || dept._id === getCurrentDepartment()?._id) return;
    try {
      await axios.patch(
        `${Server}/users/${currentUser._id}/current-department`,
        { departmentId: dept._id },
        { withCredentials: true }
      );
      await checkAuth();
      toast({
        title: "Department Switched",
        description: `Now acting as ${dept.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch department",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-[#29252c] sticky top-0 z-10 shadow-lg">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <span className="text-lg font-bold text-gray-200">
                <span className="hidden lg:block">Internal Customer Satisfaction Quotient </span>
                <span className="lg:hidden">ICSQ</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/dashboard" className="text-gray-200 hover:text-orange-300 font-medium">
              Home
            </Link>
            <Link to="/survey" className="text-gray-200 hover:text-orange-300 font-medium">
              Survey
            </Link>
            <Link to="/sipoc" className="text-gray-200 hover:text-orange-300 font-medium">
              SIPOC
            </Link>
            {ENABLE_HOD_DASHBOARD === 1 && (isAdmin() || isHod()) && (
              <Link to="/hod-dashboard" className="text-gray-200 hover:text-orange-300 font-medium">
                HOD Dashboard
              </Link>
            )}
             <Link to="/action-plans" className="text-gray-200 hover:text-orange-300 font-medium">
              Action Plans
            </Link> 
            {isAdmin() &&(
              <>
              {/* <Link to="/reports" className="text-gray-200 hover:text-orange-300 font-medium">
              Reports
            </Link> */}
             
              <Link to="/admin" className="text-orange-300 hover:text-orange-300 font-medium">
                Admin
              </Link>
              </>
            )}
          </nav>

          <div className="flex items-center">
            {/* HOD Department Switcher */}
            {isHod() && getHodDepartments().length > 1 && (
              <Dropdown
                trigger={
                  <div className="mr-4 px-3 py-1 bg-[#1a1a1f] rounded text-[goldenrod] cursor-pointer border border-[goldenrod]">
                    {capitalizeFirstLetter(getCurrentDepartment()?.name) || "Select Department"}
                  </div>
                }
                items={getHodDepartments().map((dept) => ({
                  label: capitalizeFirstLetter(dept.name),
                  onClick: () => handleDepartmentSwitch(dept),
                }))}
                align="right"
              />
            )}
            <div className="relative group">
              <button className="flex items-center space-x-2 focus:outline-none" onClick={() => setDrawerOpen(prev => !prev)}>
                <div className="h-8 w-8 rounded-full bg-[#f1ece7] flex items-center justify-center text-[#83725E] font-medium overflow-hidden">
                  <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium">{currentUser?.name || "User"}</div>
                  <div title={currentUser?.role === 'hod' ? "Your original department" : undefined} className="text-xs text-gray-300">
                    {(currentUser.role.toUpperCase()) || ""}
                    {currentUser.role !== "admin" ? " - " + (capitalizeFirstLetter(currentUser?.department?.name) || "Department") : ""}
                  </div>
                </div>
                {drawerOpen ? <FaAngleUp /> : <FaAngleDown />}
              </button>

              {/* Dropdown */}
              {drawerOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#29252c] rounded-md shadow-lg overflow-hidden border border-gray-400 z-10">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-200 hover:backdrop-brightness-150"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:backdrop-brightness-150 hover:text-red-600"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden ml-4 p-2 rounded-md text-gray-200 hover:text-[#83725E] hover:bg-gray-100 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden pt-4 pb-2 space-y-2">
            {["/dashboard", "/survey", "/sipoc", 
            // "/action-plans",
             "/reports"].map((path, i) => {
              const name = ["Home", "Survey", "SIPOC"
                  ,"Action Plans"
                ][i]
              return (
                <Link
                  key={path}
                  to={path}
                  className="block px-3 py-2 rounded-md text-gray-300 hover:bg-gray-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {name}
                </Link>
              )
            })}
            {ENABLE_HOD_DASHBOARD === 1 && (isAdmin() || isHod()) && (
              <Link
                to="/hod-dashboard"
                className="block px-3 py-2 rounded-md text-gray-300 hover:bg-gray-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                HOD Dashboard
              </Link>
            )}
            {isAdmin() && (
              <>
              <Link
                to="/reports"
                className="block px-3 py-2 rounded-md text-[goldenrod] hover:bg-[#f8f6f4]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Reports
              </Link>
              <Link
                to="/admin"
                className="block px-3 py-2 rounded-md text-[goldenrod] hover:bg-[#f8f6f4]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}

export default DashboardHeader

