import { useState, useEffect } from "react"
import { useToast } from "../contexts/ToastContext"
import Button from "./ui/Button"

function DepartmentGrid({ onDepartmentSelect }) {
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        // In a real app, this would fetch from your API
        // const response = await axios.get("/api/departments", { withCredentials: true });
        // setDepartments(response.data);

        // Mock data for demonstration
        const mockDepartments = [
          { id: 1, name: "Development", description: "Real Estate Development" },
          { id: 2, name: "Stay By Latinum", description: "Hospitality Services" },
          { id: 3, name: "Audit & Assurance", description: "Internal Audit" },
          { id: 4, name: "HR & Admin", description: "Human Resources" },
          { id: 5, name: "Group IT", description: "Information Technology" },
          { id: 6, name: "Procurement", description: "Procurement Services" },
          { id: 7, name: "SCM", description: "Supply Chain Management" },
          { id: 8, name: "Marketing", description: "Marketing Services" },
          { id: 9, name: "Finance & Accounts", description: "Financial Services" },
          { id: 10, name: "PNC Architects", description: "Architecture Services" },
          { id: 11, name: "SOBHA PMC", description: "Project Management" },
          { id: 12, name: "LFM", description: "Facilities Management" },
        ]

        setDepartments(mockDepartments)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load departments",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDepartments()
  }, [toast])

  const handleDepartmentClick = (department) => {
    setSelectedDepartment(department)
  }

  const handleStartSurvey = () => {
    if (selectedDepartment) {
      onDepartmentSelect(selectedDepartment)
    } else {
      toast({
        title: "Selection Required",
        description: "Please select a department to proceed",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {departments.map((department) => (
          <div
            key={department.id}
            className={`bg-white border rounded-lg shadow-sm cursor-pointer transition-all ${
              selectedDepartment?.id === department.id ? "border-2 border-blue-500 shadow-md" : "hover:shadow-md"
            }`}
            onClick={() => handleDepartmentClick(department)}
          >
            <div className="p-4 text-center">
              <div className="h-16 flex items-center justify-center">
                <span className="font-medium">{department.name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-8">
        <Button onClick={handleStartSurvey} disabled={!selectedDepartment} className="px-8 py-3 text-lg">
          Start Survey
        </Button>
      </div>
    </div>
  )
}

export default DepartmentGrid
