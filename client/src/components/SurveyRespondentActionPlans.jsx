import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table"
import Badge from "./ui/Badge"
import { capitalizeFirstLetter, Server } from "../Constants"
import axios from "axios"
import { useToast } from "../contexts/ToastContext"

function SurveyRespondentActionPlans() {
  const [actionPlans, setActionPlans] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchActionPlans()
  }, [])

  const fetchActionPlans = async () => {
    try {
      // Fetch both regular action plans and individual action plans
      const [regularResponse, individualResponse] = await Promise.all([
        axios.get(`${Server}/action-plans/survey-respondent`, {
          withCredentials: true
        }),
        axios.get(`${Server}/action-plans/individual`, {
          withCredentials: true
        })
      ])
      
      // Combine both types of action plans
      const allPlans = [...regularResponse.data, ...individualResponse.data]
      setActionPlans(allPlans)
    } catch (error) {
      console.error("Error fetching action plans:", error)
      toast({
        title: "Error",
        description: "Failed to load action plans",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "in-progress":
        return "bg-yellow-500"
      case "pending":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completed"
      case "in-progress":
        return "In Progress"
      case "pending":
        return "Pending"
      default:
        return "Unknown"
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const isOverdue = (targetDate, status) => {
    if (status === "completed") return false
    return new Date(targetDate) < new Date()
  }

  if (isLoading) {
    return (
      <Card className="bg-[#29252c]/70">
        <CardHeader>
          <CardTitle className="text-teal-400">Action Plans from Your Survey Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (actionPlans.length === 0) {
    return (
      <Card className="bg-[#29252c]/70">
        <CardHeader>
          <CardTitle className="text-teal-400">Action Plans from Your Survey Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-300 text-lg mb-2">No Action Plans Yet</p>
            <p className="text-gray-400">
              Action plans assigned to you will appear here once they are created by department heads.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#29252c]/70">
      <CardHeader>
        <CardTitle className="text-teal-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Your Action Plans
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Action plans assigned to you, including common plans and individual plans
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-gray-700/30">
                <TableHead className="text-gray-300 font-semibold">Service Provider Department</TableHead>
                {/* <TableHead className="text-gray-300 font-semibold">Categories</TableHead> */}
               /* <TableHead className="text-gray-300 font-semibold">Your Expectation</TableHead> */
                <TableHead className="text-gray-300 font-semibold">Action Plan</TableHead>
                {/* <TableHead className="text-gray-300 font-semibold">Assigned To</TableHead> */}
                {/* <TableHead className="text-gray-300 font-semibold">Target Date</TableHead> */}
                <TableHead className="text-gray-300 font-semibold">Status</TableHead>
                {/* <TableHead className="text-gray-300 font-semibold">Created By</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionPlans.map((plan) => (
                <TableRow key={plan._id} className="border-gray-700/30 hover:bg-white/5">
                  <TableCell className="text-white">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(plan.departments) ? 
                        <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                          {capitalizeFirstLetter(plan.departments[0]?.name || plan.departments[0])}
                        </span>
                        :
                        <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded">
                          {capitalizeFirstLetter(plan.department?.name)}
                        </span>
                      }
                    </div>
                  </TableCell>
                  {/* <TableCell className="text-white">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(plan.categories) ? 
                        plan.categories.map((cat, idx) => (
                          <span key={idx} className="text-xs bg-green-600/20 text-green-300 px-2 py-1 rounded">
                            {capitalizeFirstLetter(cat?.name || cat)}
                          </span>
                        )) :
                        <span className="text-xs bg-green-600/20 text-green-300 px-2 py-1 rounded">
                          {capitalizeFirstLetter(plan.category?.name)}
                        </span>
                      }
                    </div>
                  </TableCell>  */}
                  <TableCell className="text-white">
                    <div className="max-w-xs">
                      <p className="text-sm text-teal-300 italic truncate" title={plan.respondentData?.originalExpectation}>
                        {plan.respondentData?.originalExpectation}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    <div className="max-w-xs">
                      <p className="text-sm truncate" title={plan.individualActionPlan?.actionPlan || plan.actionplan || plan.expectations}>
                        {plan.individualActionPlan?.actionPlan || plan.actionplan || plan.expectations}
                      </p>
                      {plan.individualActionPlan && (
                        <div className="text-xs text-blue-300 mt-1">
                          <span className="bg-blue-500/20 px-2 py-1 rounded">Individual Plan</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {/* <TableCell className="text-white">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(plan.assignedTo) ? 
                        plan.assignedTo.map((user, idx) => (
                          <span key={idx} className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded">
                            {user?.name || user}
                          </span>
                        )) :
                        <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded">
                          {plan.assignedTo?.name}
                        </span>
                      }
                    </div>
                  </TableCell> */}
                  {/* <TableCell className="text-white">
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm ${isOverdue(plan.targetDate, plan.finalStatus || plan.status) ? 'text-red-400' : 'text-white'}`}>
                        {formatDate(plan.targetDate)}
                      </span>
                      {isOverdue(plan.targetDate, plan.finalStatus || plan.status) && (
                        <Badge className="bg-red-500 text-white text-xs w-fit">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </TableCell> */}
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(plan.individualActionPlan?.status || plan.finalStatus || plan.status)} text-white`}>
                        {getStatusText(plan.individualActionPlan?.status || plan.finalStatus || plan.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  {/* <TableCell className="text-white">
                    <span className="text-sm">{plan.assignedBy?.name}</span>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    
      </CardContent>
    </Card>
  )
}

export default SurveyRespondentActionPlans
