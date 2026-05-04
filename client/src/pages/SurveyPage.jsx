import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import DashboardHeader from "../components/DashboardHeader"
import { Card, CardContent, CardHeader } from "../components/ui/Card"
import Button from "../components/ui/Button"
import Textarea from "../components/ui/Textarea"
import { capitalizeFirstLetter,getDepartmentIcon,getDepartmentName, Server } from "../Constants"
import axios from "axios"

function SurveyPage() {
  const { departmentId } = useParams()
  const [department, setDepartment] = useState(null)
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  const navigate = useNavigate()
  const { toast } = useToast()
  const { currentUser, checkAuth, getCurrentDepartment } = useAuth()

  useEffect(() => {
    const alreadySurveyed = currentUser?.surveyedDepartmentIds.includes(departmentId) || false;
    setIsLoading(true)
    const fetchData = async () => {
      try {
        const deptResponse = await axios.get(`${Server}/departments/${departmentId}`, { withCredentials: true });
        setDepartment(deptResponse.data);

        const catgResponse = await axios.get(`${Server}/categories`, { withCredentials: true });       
        setCategories(catgResponse.data);

        const departmentsResponse = await axios.get(`${Server}/departments`, { withCredentials: true });
        setDepartments(departmentsResponse.data)
        
        const userDepartment = {
          id: deptResponse.data._id,
          name: capitalizeFirstLetter(deptResponse.data.name),
          description: deptResponse.data.description,
        }
        setDepartment(userDepartment)

        // Load saved progress if exists
        const savedProgress = localStorage.getItem(`survey_progress_${departmentId}`)
        if (savedProgress) {
          setFormData(JSON.parse(savedProgress))
        } else {
          initializeFormData()
        }

      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load survey data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [departmentId, categories?.length])

  const initializeFormData = () =>{
    const initialFormData = {}
    categories.forEach((category) => {
      if ((!category.department) || (String(category.department) === String(departmentId)) ){
        initialFormData[category.name] = {
          rating: 0,
          expectations: "",
        }
      }
    })
    setFormData(initialFormData)
  }

  const handleRatingChange = (categoryName, value) => {
    const newFormData = {
      ...formData,
      [categoryName]: {
        ...formData[categoryName],
        rating: value,
      },
    }
    setFormData(newFormData)
    localStorage.setItem(`survey_progress_${departmentId}`, JSON.stringify(newFormData))
  }

  const handleExpectationChange = (categoryName, value) => {
    const newFormData = {
      ...formData,
      [categoryName]: {
        ...formData[categoryName],
        expectations: value,
      },
    }
    setFormData(newFormData)
    localStorage.setItem(`survey_progress_${departmentId}`, JSON.stringify(newFormData))
  }

  const handleSaveProgress = async () => {
    setIsSaving(true)
    try {
      localStorage.setItem(`survey_progress_${departmentId}`, JSON.stringify(formData))
      toast({
        title: "Progress Saved",
        description: "Your survey progress has been saved",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      // Validate form data
      const invalidCategories = categories.filter((category) => {
        const match = ((!category.department) || (String(category.department) === String(departmentId)) )
        const data = formData[category.name];
        const hasRating = data?.rating;
        const lowRating = hasRating && data.rating <= 60;
        const hasExpectations = data?.expectations
        const tooShort = lowRating && (!hasExpectations || data.expectations.length < 30);
        return match && (!hasRating || (lowRating && (!hasExpectations || data.expectations.length < 30)));
      });
      
      if (invalidCategories.length > 0) {
        toast({
          title: "Incomplete Survey",
          description: "Please provide ratings for all categories. For low ratings (≤ 60), expectations (min 30 characters) are required.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const confirm = window.confirm("Are you sure you want to submit ?");
      if (!confirm) return
      
      await axios.post(
        `${Server}/surveys`,
        {
          userId : currentUser._id,
          fromDepartmentId: getCurrentDepartment()?._id,
          toDepartmentId: departmentId,
          responses: formData,
          date: new Date(),
        },
        { withCredentials: true },
      );

      toast({
        title: "Survey Submitted",
        description: `Your feedback for ${department.name} has been recorded`,
      })
      
      // Clear saved progress for this department
      localStorage.removeItem(`survey_progress_${departmentId}`)
      
      checkAuth();

      // Get selected departments from localStorage
      const selectedDepartments = JSON.parse(localStorage.getItem("selectedDepartments") || "[]");
      const currentIndex = selectedDepartments.indexOf(departmentId);
      
      // If there's a next department, navigate to it
      if (currentIndex < selectedDepartments.length - 1) {
        navigate(`/survey/${selectedDepartments[currentIndex + 1]}`);
      } else {
        // If this was the last department, go to dashboard
        navigate("/dashboard");
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit survey",
        variant: "destructive",
      })
      
      console.log(error);
    } finally {
      setIsLoading(false)
      
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-gray-200">
      <DashboardHeader user={currentUser} />

      <main className="container mx-auto py-2 px-4">
        <Card className="mb-2 bg-[#29252c]/70">
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {JSON.parse(localStorage.getItem("selectedDepartments"))?.map((dept, index) => (
                  <div
                  key={dept}
                  className={` border rounded-lg shadow-sm cursor-pointer transition-all p-4 text-center ${
                    dept === departmentId
                    ? "border-2 border-[goldenrod] shadow-md"
                    : "hover:shadow-md hover:bg-white/10"
                  }`}
                  onClick={() => navigate(`/survey/${dept}`, {replace :true})}
                  >
                    <div className="h-16 flex items-center justify-center">
                      <span className="font-medium text-sm">{getDepartmentIcon(getDepartmentName(dept, departments)?.toUpperCase())}{getDepartmentName(dept, departments)?.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {
        (currentUser?.surveyedDepartmentIds.includes(departmentId)) ?
            <div className="min-h-[50vh] flex items-center justify-center">
              <div className="text-center">
                <p className="mt-4">You have already Submitted survey for this Department !</p>
              </div>
            </div>
          
        :
      <main className="container mx-auto py-4 px-4 text-gray-200">
      <Card className="rounded-b-none text-center text-[goldenrod] text-md bg-[#29252c]/70">
        <CardHeader className="bg-[#29252c]/70 border-b py-6 border-b-gray-400 text-xl font-semibold text-[goldenrod]">{getDepartmentIcon(getDepartmentName(departmentId, departments))} ICSQ SURVEY FOR {getDepartmentName(departmentId, departments)?.toUpperCase()}</CardHeader>
     
        <div className="overflow-x-auto bg-[#29252c]/70">
          <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-[#29252c]/80 text-left hidden md:table-header-group">
              <tr className="md:table-row flex flex-col md:flex-row">
                <th className="px-4 py-3 text-sm font-semibold text-gray-200">Category</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-200 text-center">Rating</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-200">Expectations</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-700">
              {categories.map((category) => 
              {if ( ((!category.department) || (String(category.department) === String(departmentId)) ) )
              return (
                <tr key={category.name} className="border-t border-gray-500 text-left md:table-row flex flex-col md:flex-row">
                  {/* Category Name */}
                  <td className="px-2 sm:px-4 py-4 align-top font-medium text-slate-200 w-full md:w-1/5">
                    <div className="mb-3 text-base sm:text-lg font-semibold text-[goldenrod] border-b border-gray-700/50 pb-2">
                      {capitalizeFirstLetter(category.name)}
                    </div>
                    <div className="text-xs sm:text-sm bg-[#29252c]/60 p-2 sm:p-3 rounded-lg border border-gray-700/50 hover:bg-[#29252c]/80 transition-all duration-200 cursor-help break-words">
                      <span className="text-gray-300 whitespace-pre-wrap">
                        {capitalizeFirstLetter(category.description).split('?').map((part, index, array) => 
                          index < array.length - 1 ? 
                            <span key={index}>
                              {part}?<br />
                            </span> 
                          : part
                        )}
                      </span>
                    </div>
                  </td>
                 
                  {/* Ratings with Emojis */}
                  <td className="px-2 sm:px-4 py-4 align-middle w-full md:w-2/5">
                    <div className="grid grid-cols-5 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-4">
                      {[20, 40, 60, 80, 100].map((value, index) => {
                        const emojiList = ["😞", "😕", "😐", "🙂", "🤩"];
                        const titles = ["Poor", "Below Avg", "Average", "Good", "Impressive"];
                        const isSelected = formData[category.name]?.rating === value;

                        return (
                          <div key={value} className="flex flex-col items-center">
                            <button
                              type="button"
                              onClick={() => handleRatingChange(category.name, value)}
                              title={titles[index]}
                              className={`w-10 h-10 sm:w-14 sm:h-12 rounded-lg flex items-center justify-center text-lg sm:text-[2.25rem] transition-all duration-200 ${
                                isSelected
                                  ? "bg-[#93725E] text-white scale-110"
                                  : "bg-[#29252c]/60 hover:bg-[#93725E]/20"
                              }`}
                            >
                              {emojiList[index]}
                            </button>
                            <span className="mt-1 text-[10px] sm:text-xs text-gray-400">{value}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Expectations Input */}
                  <td className="px-2 sm:px-4 py-4 w-full md:w-2/5">
                    <div className="relative">
                      <Textarea
                        placeholder="Enter your expectations here..."
                        value={formData[category.name]?.expectations || ""}
                        onChange={(e) => handleExpectationChange(category.name, e.target.value)}
                        maxLength={300}
                        className={`w-full min-h-[100px] text-sm sm:text-base bg-[#29252c]/60 border border-gray-700/50 rounded-lg focus:ring-[0.5px] focus:ring-[#93725E] text-gray-200 ${
                          formData[category.name]?.rating <= 60 ? "border-orange-400" : ""
                        }`}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                        {(formData[category.name]?.expectations || "").length}/300
                      </div>
                    </div>
                    {formData[category.name]?.rating <= 60 && (
                      <p className={`mt-2 text-xs sm:text-sm ${((formData[category.name]?.expectations || "").length < 30) ? "text-orange-400" : "text-green-400"}`}>
                        *Required for ratings 60% or below. Minimum 30 characters.
                      </p>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </Card>


        <div className="flex justify-end gap-4 mt-8">
          <Button variant="outline" onClick={() => navigate("/dashboard")}
            className="text-[goldenrod] hover:bg-[#93725E]/20">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}
            className="bg-[#93725E] text-white hover:bg-[goldenrod]">
            {isLoading ? "Submitting..." : "Submit Survey"}
          </Button>
        </div>
      </main>}
      
    </div>
  )
}

export default SurveyPage
