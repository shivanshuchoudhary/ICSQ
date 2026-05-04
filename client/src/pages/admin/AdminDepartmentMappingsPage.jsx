import { useState, useEffect } from "react"
import axios from "axios"
import { Server, capitalizeFirstLetter } from "../../Constants"
import { useToast } from "../../contexts/ToastContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table"
import Badge from "../../components/ui/Badge"
import DepartmentMappingModal from "../../components/DepartmentMappingModal"
import DashboardHeader from "../../components/DashboardHeader"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import { FaPencilAlt, FaTrash } from "react-icons/fa"
import bgImage from "../../assets/bg-image.jpg"

export default function AdminDepartmentMappingsPage() {
  const [departments, setDepartments] = useState([])
  const [mappings, setMappings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [departmentsRes, mappingsRes] = await Promise.all([
        axios.get(`${Server}/departments`, { withCredentials: true }),
        axios.get(`${Server}/department-mappings`, { withCredentials: true })
      ])

      console.log("Fetched departments:", departmentsRes.data); // Debug log
      console.log("Fetched mappings:", mappingsRes.data); // Debug log

      if (!Array.isArray(departmentsRes.data)) {
        throw new Error("Invalid departments data received");
      }

      setDepartments(departmentsRes.data)
      setMappings(mappingsRes.data)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError(error.response?.data?.message || "Failed to fetch data")
      toast({
        title: "Error",
        description: "Failed to fetch department data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (department) => {
    try {
      console.log("Editing department:", department); // Debug log
      console.log("Current departments:", departments); // Debug log
      console.log("Current mappings:", mappings); // Debug log

      const mapping = mappings.find(m => {
        const mappingDeptId = m.department?._id || m.department;
        return mappingDeptId === department._id;
      });

      console.log("Found mapping:", mapping); // Debug log

      const reviewerDepartments = mapping?.reviewerDepartments?.map(dept => dept?._id || dept) || [];
      console.log("Reviewer departments:", reviewerDepartments); // Debug log

      setSelectedDepartment({
        ...department,
        reviewerDepartments
      });
      setIsModalOpen(true);

      console.log("Modal should be open:", isModalOpen); // Debug log
      console.log("Selected department:", department); // Debug log
      console.log("Available departments for modal:", departments); // Debug log
    } catch (error) {
      console.error("Error in handleEdit:", error);
      toast({
        title: "Error",
        description: "Failed to edit department mapping",
        variant: "destructive",
      });
    }
  }

  const handleDelete = async (departmentId) => {
    if (!window.confirm("Are you sure you want to delete this mapping? This action cannot be undone.")) {
      return
    }

    try {
      await axios.delete(`${Server}/department-mappings/${departmentId}`, { withCredentials: true })
      
      setMappings(prevMappings => 
        prevMappings.filter(m => {
          const mappingDeptId = m.department?._id || m.department;
          return mappingDeptId !== departmentId;
        })
      );
      
      toast({
        title: "Success",
        description: "Department mapping deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting mapping:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete department mapping",
        variant: "destructive",
      })
    }
  }

  const handleSaveMapping = async (mappingData) => {
    try {
      const { departmentId, reviewerDepartments } = mappingData;
      
      if (!departmentId || !reviewerDepartments) {
        throw new Error("Department ID and reviewer departments are required");
      }

      const response = await axios.put(
        `${Server}/department-mappings`,
        {
          departmentId,
          reviewerDepartments
        },
        { withCredentials: true }
      );

      // Update the mappings state with the new mapping
      setMappings(prevMappings => {
        const index = prevMappings.findIndex(m => {
          const mappingDeptId = m.department?._id || m.department;
          return mappingDeptId === departmentId;
        });

        const newMapping = response.data;

        if (index !== -1) {
          // Update existing mapping
          return prevMappings.map((m, i) => i === index ? newMapping : m);
        } else {
          // Add new mapping
          return [...prevMappings, newMapping];
        }
      });

      setIsModalOpen(false); // Close the modal after successful save
      setSelectedDepartment(null); // Reset selected department

      toast({
        title: "Success",
        description: "Department mapping updated successfully",
      });
    } catch (error) {
      console.error("Error updating mapping:", error);
      throw error; // Let the modal component handle the error
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  // Only render content if we have departments data
  if (!departments.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-500">No departments available</div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen backdrop-brightness-50">
        <DashboardHeader />

        <main className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[goldenrod] mb-2">Department Mappings</h1>
            <p className="text-gray-400">Configure which departments can review other departments.</p>
          </div>

          <Card className="backdrop-blur-3xl bg-black/30">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-[goldenrod]">DEPARTMENT</TableHead>
                    <TableHead className="text-[goldenrod]">CAN BE REVIEWED BY</TableHead>
                    <TableHead className="text-[goldenrod] w-[100px]">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => {
                    const mapping = mappings.find(m => {
                      const mappingDeptId = m.department?._id || m.department;
                      return mappingDeptId === department._id;
                    });
                    
                    const reviewerDepts = mapping?.reviewerDepartments || [];
                    
                    return (
                      <TableRow key={department._id} className="border-gray-800">
                        <TableCell className="font-medium text-white">
                          {department.name?.toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {reviewerDepts.length > 0 ? (
                              reviewerDepts.map(reviewerDept => {
                                const deptId = reviewerDept?._id || reviewerDept;
                                const deptName = reviewerDept?.name || departments.find(d => d._id === deptId)?.name || '';
                                
                                return (
                                  <Badge 
                                    key={deptId}
                                    className="bg-gradient-to-r from-[#b8860b]/80 to-[#daa520]/80 text-black font-medium px-3 py-1 rounded-md shadow-sm hover:shadow-md transition-all duration-200 border border-[#ffd700]/30"
                                  >
                                    {deptName.toUpperCase()}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-gray-500 italic px-2 py-1 bg-black/20 rounded-md border border-gray-800">No departments mapped</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(department)}
                              className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                            >
                              <FaPencilAlt className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(department._id)}
                              className="text-red-500 hover:text-red-400 hover:bg-[#2a2a2a]"
                            >
                              <FaTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>

        {/* Only render modal if we have departments data */}
        {departments.length > 0 && (
          <DepartmentMappingModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedDepartment(null);
            }}
            department={selectedDepartment}
            departments={departments}
            onSave={handleSaveMapping}
          />
        )}
      </div>
    </div>
  )
} 