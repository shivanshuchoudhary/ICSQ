import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import DashboardHeader from "../components/DashboardHeader"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card"
import Button from "../components/ui/Button"
import Badge from "../components/ui/Badge"
import { capitalizeFirstLetter, getDepartmentIcon, Server } from "../Constants"
import axios from "axios"

function SurveyListPage() {
  const [departments, setDepartments] = useState([])
  const [mappedDepartments, setMappedDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const navigate = useNavigate()
  const { toast } = useToast()
  const { currentUser, getCurrentDepartment } = useAuth()

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        // Get all departments and department mappings
        const [departmentsRes, mappingsRes] = await Promise.all([
          axios.get(`${Server}/departments`, { withCredentials: true }),
          axios.get(`${Server}/department-mappings`, { withCredentials: true })
        ]);

        const allDepartments = departmentsRes.data;
        const mappings = mappingsRes.data;

        // Find departments that the current user's department can review
        const allowedDepartmentIds = new Set();
        mappings.forEach(mapping => {
          const reviewerDepts = mapping.reviewerDepartments || [];
          const canReview = reviewerDepts.some(dept => {
            const deptId = dept._id || dept;
            return deptId === getCurrentDepartment()?._id;
          });

          if (canReview) {
            const mappedDeptId = mapping.department?._id || mapping.department;
            allowedDepartmentIds.add(mappedDeptId);
          }
        });

        // Filter out user's own department from allowed departments
        if (getCurrentDepartment()?._id) {
          allowedDepartmentIds.delete(getCurrentDepartment()?._id);
        }

        setMappedDepartments(Array.from(allowedDepartmentIds));
        setDepartments(allDepartments);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load departments",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, [toast, getCurrentDepartment]);

  const handleDepartmentClick = (department) => {
    // Only allow selection of mapped departments
    if (!mappedDepartments.includes(department._id)) {
      toast({
        title: "Selection not Allowed",
        description: "Your department is not mapped to review this department",
        variant: "destructive",
      });
      return;
    }

    if (department._id === getCurrentDepartment()?._id) {
      toast({
        title: "Selection not Allowed",
        description: "Cannot survey for your own department",
      });
      return;
    } else if (currentUser?.surveyedDepartmentIds.includes(department._id)) {
      toast({
        title: "Selection not Allowed",
        description: "You already added survey for this department"
      });
      return;
    }
    
    if (selectedDepartments.includes(department._id)) {
      setSelectedDepartments(prev => prev.filter(dept => dept !== department._id));
    }
    else setSelectedDepartments(prev => [...prev, department._id]);
  };

  const handleStartSurvey = () => {
    if (selectedDepartments.length) {
      localStorage.setItem("selectedDepartments", JSON.stringify(selectedDepartments));
      navigate(`/survey/${selectedDepartments[0]}`);
    } else {
      toast({
        title: "Selection Required",
        description: "Please select a department to proceed",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[goldenrod]"></div>
          </div>
        </div>
      </div>
    );
  }

  const sortedDepartments = [...departments].sort((a, b) => {
    // User's department first
    if (a._id === getCurrentDepartment()?._id) return -1;
    if (b._id === getCurrentDepartment()?._id) return 1;
    
    // Surveyed departments second
    const aIsSurveyed = currentUser?.surveyedDepartmentIds?.includes(a._id);
    const bIsSurveyed = currentUser?.surveyedDepartmentIds?.includes(b._id);
    if (aIsSurveyed && !bIsSurveyed) return -1;
    if (!aIsSurveyed && bIsSurveyed) return 1;

    // Mapped departments third
    const aIsMapped = mappedDepartments.includes(a._id);
    const bIsMapped = mappedDepartments.includes(b._id);
    if (aIsMapped && !bIsMapped) return -1;
    if (!aIsMapped && bIsMapped) return 1;

    // Keep original order for remaining departments
    return 0;
  });

  return (
    <div className="min-h-screen">
      <DashboardHeader />

      <main className="container mx-auto py-8 px-4 overflow-hidden">
        <Card className="mb-6 bg-[#29252c]/60">
          <CardHeader>
            <CardTitle>Ready for ICSQ Survey</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-gray-300">
              Select departments to evaluate. Your feedback helps improve internal customer satisfaction.
              {mappedDepartments.length === 0 && (
                <span className="block mt-2 text-yellow-500">
                  Note: Your department is not currently mapped to review any other departments. Please contact your administrator.
                </span>
              )}
            </p>

            {/* Legend */}
            <div className="flex flex-wrap justify-center items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-900" />
                <span className="text-sm text-gray-300">Already Surveyed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-yellow-400 bg-yellow-800" />
                <span className="text-sm text-gray-300">Your Department</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-900" />
                <span className="text-sm text-gray-300">Selected Department(s)</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sortedDepartments.map((department) => {
                  const isMapped = mappedDepartments.includes(department._id);
                  const isSurveyed = currentUser?.surveyedDepartmentIds.includes(department._id);
                  const isOwnDepartment = getCurrentDepartment()?._id === department._id;
                  const isSelected = selectedDepartments.includes(department._id);

                  return (
                    <div
                      key={department._id}
                      className={`
                        relative rounded-lg flex flex-col justify-center items-center backdrop-blur-3xl 
                        bg-gradient-to-br from-gray-800 to-gray-950 shadow-sm p-4 text-center
                        transition-all duration-300
                        ${!isMapped && !isOwnDepartment ? 'opacity-40 cursor-not-allowed border border-gray-700' : 'cursor-pointer'}
                        ${isSelected ? "border-[1.5px] border-blue-500 shadow-md" : "shadow-md hover:bg-white/20"}
                        ${isSurveyed && "border-[1.5px] border-green-600 shadow-md hover:shadow-md hover:border-green-500"}
                        ${isOwnDepartment && "border-[1.5px] border-[goldenrod] shadow-md hover:shadow-md hover:border-yellow-400"}
                      `}
                      onClick={() => handleDepartmentClick(department)}
                    > 
                      <div className="absolute top-2 right-1.5 text-xs space-y-1">
                      {isOwnDepartment && (
                          <Badge className="text-green-600 rounded-sm" variant="warning">Your Dept</Badge>
                        )}
                        {isSurveyed && (
                          <Badge className="text-green-600 rounded-sm" variant="success">Surveyed</Badge>
                        )}
                        {!isMapped && !isOwnDepartment && (
                          <div className="group relative">
                            <Badge className="text-blue-600 rounded-sm" variant="info">i</Badge>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/80 text-white text-xs p-1 rounded whitespace-nowrap">
                            As per the SIPOC, your department is not eligible to provide a survey to the selected department.
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="h-16 flex items-center justify-center">
                        <span className={`font-medium text-sm ${!isMapped && !isOwnDepartment ? 'text-gray-400' : 'text-gray-200'}`}>
                          {getDepartmentIcon(department.name?.toUpperCase())} {department.name?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center mt-8">
                <Button 
                  onClick={handleStartSurvey} 
                  disabled={!selectedDepartments.length}
                  className="px-8 py-3 text-lg"
                >
                  Start Survey
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default SurveyListPage;
