import { Routes, Route, Navigate} from "react-router-dom"
import { useAuth } from "./contexts/AuthContext"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import SurveyPage from "./pages/SurveyPage"
import SurveyListPage from "./pages/SurveyListPage"
import SIPOCPage from "./pages/SIPOCPage"
import ActionPlansPage from "./pages/ActionPlansPage"
import ReportsPage from "./pages/ReportsPage"
import AdminDashboardPage from "./pages/admin/AdminDashboardPage"
import AdminDepartmentsPage from "./pages/admin/AdminDepartmentsPage"
import AdminDepartmentMappingsPage from "./pages/admin/AdminDepartmentMappingsPage"
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage"
import AdminUsersPage from "./pages/admin/AdminUsersPage"
import SurveyAnalyticsPage from "./pages/admin/SurveyAnalyticsPage"
import HODDashboardPage from "./pages/HODDashboardPage"
import ProfilePage from "./pages/ProfilePage"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminRoute from "./components/AdminRoute"
import Toast from "./components/ui/Toast"
import ErrorBoundary from "./components/ErrorBoundary"
import loaderImage from "./assets/icsq-loader.jpg"
import bgImage from "./assets/bg-image.jpg"
import {useState, useEffect} from 'react'
import Terms from "./pages/Terms"
import DepartmentSurveyDetailsPage from "./pages/admin/DepartmentSurveyDetailsPage"

function App() {
  const { loading } = useAuth()
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowLoader(false), 1000)
      return () => clearTimeout(timer)
    } else {
      setShowLoader(true)
    }
  }, [loading])

  if (loading || showLoader) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{
        backgroundImage: `url(${loaderImage})`,
      }}
    >
      {/* Blurred overlay */}
      <div className="absolute inset-0 backdrop-brightness-75 z-0"></div>

      {/* Spinner and text */}
      <div className="relative z-10 text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 font-semibold text-lg">Loading...</p>
      </div>
    </div>
  )
}

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected routes for all users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/survey"
          element={
            <ProtectedRoute>
              <SurveyListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/survey/:departmentId"
          element={
            <ProtectedRoute>
              <SurveyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sipoc"
          element={
            <ProtectedRoute>
              <SIPOCPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/action-plans"
          element={
            <ProtectedRoute>
              <ActionPlansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hod-dashboard"
          element={
            <ProtectedRoute>
              <HODDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/terms"
          element={
              <Terms />
          }
        />

        {/* Admin-only routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <AdminRoute>
              <AdminDepartmentsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/department-mappings"
          element={
            <AdminRoute>
              <AdminDepartmentMappingsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminRoute>
              <AdminCategoriesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/survey-analytics"
          element={
            <AdminRoute>
              <SurveyAnalyticsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/survey-analytics/:departmentId"
          element={
            <AdminRoute>
              <DepartmentSurveyDetailsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <AdminRoute>
              <ReportsPage />
            </AdminRoute>
          }
        />
      </Routes>
      <Toast />
    </ErrorBoundary>
  )
}

export default App

