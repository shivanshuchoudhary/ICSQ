import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import DashboardHeader from "../components/DashboardHeader"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card"
import Button from "../components/ui/Button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs"
import axios from "axios"
import { capitalizeFirstLetter, Server } from "../Constants"

function ReportsPage() {
  const [departmentScores, setDepartmentScores] = useState([])
  const [categoryScores, setCategoryScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { currentUser } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const deptScoreResponse = await axios.get(`${Server}/analytics/department-scores`,{withCredentials : true});
        // console.log(deptScoreResponse.data);
        setDepartmentScores(deptScoreResponse.data)

        const catgScoreResponse = await axios.get(`${Server}/analytics/category-scores`,{withCredentials : true});
        // console.log(catgScoreResponse.data);
        setCategoryScores(catgScoreResponse.data)
        
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load report data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDownloadReport = (format) => {
    toast({
      title: "Report Downloaded",
      description: `Report has been downloaded in ${format.toUpperCase()} format`,
    })
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
    <div className="min-h-screen">
      <DashboardHeader user={currentUser} />

      <main className="container mx-auto py-6 px-4">
        <Card className="mb-6">
          <CardHeader>
            {/* <CardTitle className="flex items-center justify-between">
              <span>ICSQ Reports</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDownloadReport("pdf")}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  PDF
                </Button>
                <Button variant="outline" onClick={() => handleDownloadReport("excel")}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Excel
                </Button>
              </div>
            </CardTitle> */}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="department">
              <TabsList className="mb-6 text-white">
                <TabsTrigger value="department">Department Scores</TabsTrigger>
                <TabsTrigger value="category">Category Scores</TabsTrigger>
                <TabsTrigger value="trend">Trend Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="department">
                <div className="min-h-[100px] mt-4">
                  <div className="w-full h-full p-4 border border-gray-200 rounded-lg">
                    <div className="text-center text-gray-100">
                      <p>Department Scores Chart</p>
                      <div className="mt-4">
                        {departmentScores.map((dept) => (
                          <div key={dept.name} className="mb-2">
                            <div className="flex items-center">
                              <span className="w-48 max-w-[40%] text-left">{capitalizeFirstLetter(dept.name)}</span>
                              <div className="flex-1 mx-2">
                                <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full"
                                    style={{ width: `${dept.score}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="w-20 text-right font-medium">{dept.score.toFixed(2)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="category">
                <div className="min-h-[100px] mt-4">
                  <div className="w-full h-full p-4 border border-gray-200 rounded-lg">
                    <div className="text-center text-gray-200">
                      <p>Category Scores Chart</p>
                      <div className="mt-4">
                        {categoryScores.map((cat) => (
                          <div key={cat.category} className="mb-2">
                            <div className="flex items-center">
                              <span className="w-80 max-w-[40%] text-left">{capitalizeFirstLetter(cat.category)}</span>
                              <div className="flex-1 mx-2">
                                <div className="bg-gray-200 h-4 rounded-full overflow-hidden">
                                  <div
                                    className="bg-teal-600 h-full rounded-full"
                                    style={{ width: `${cat.score}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="w-10 text-right font-medium">{cat.score}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="trend">
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-16 w-16 mx-auto text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <p className="mt-4">Trend analysis will be available after multiple survey cycles</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle>Report Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Overall ICSQ Score</h3>
                <p>
                  The overall ICSQ score across all departments is 73%, which indicates a good level of internal
                  customer satisfaction but with room for improvement.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Top Performing Departments</h3>
                <p>
                  Procurement (80%) and LFM (75%) are the top performing departments in terms of internal customer
                  satisfaction.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Areas for Improvement</h3>
                <p>
                  Development (68%) and Stay By Latinum (69%) have the lowest ICSQ scores and should focus on
                  implementing action plans to address internal customer expectations.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium">Category Analysis</h3>
                <p>
                  Collaboration (79%) and Quality of Work (75%) received the highest scores across categories, while
                  Communication (68%) and Meeting Deadlines (70%) are areas that need attention across departments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </main>
    </div>
  )
}

export default ReportsPage
