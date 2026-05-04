import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import DashboardHeader from "../../components/DashboardHeader";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { capitalizeFirstLetter, getDepartmentIcon, Server } from "../../Constants";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

// Helper to normalize category names
function normalizeCategory(name) {
  return name
    .replace(/– comments$/i, "") // remove trailing '– comments'
    .replace(/- comments$/i, "") // remove trailing '- comments'
    .replace(/\s+/g, ' ') // collapse multiple spaces to one
    .trim();
}

function SurveyAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [surveyData, setSurveyData] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch departments
        const deptsResponse = await axios.get(`${Server}/departments`, { withCredentials: true });
        setDepartments(deptsResponse.data);

        // Fetch all surveys with user and department details
        const surveysResponse = await axios.get(`${Server}/surveys/analytics`, { withCredentials: true });
        console.log("Survey Analytics Response:", surveysResponse.data);
        setSurveyData(surveysResponse.data);
      } catch (error) {
        console.error("Error fetching survey data:", error);
        toast({
          title: "Error",
          description: "Failed to load survey analytics data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Group surveys by department
  const surveysByDepartment = surveyData.reduce((acc, survey) => {
    const deptId = String(survey.toDepartmentId); // Convert ObjectId to string
    if (!acc[deptId]) {
      acc[deptId] = [];
    }
    acc[deptId].push(survey);
    return acc;
  }, {});

  console.log("Surveys by Department:", surveysByDepartment);
  console.log("Selected Department:", selectedDepartment);

  // 1. Aggregate average rating per normalized category
  const categoryAverages = {};
  surveyData.forEach(survey => {
    Object.entries(survey.responses).forEach(([category, response]) => {
      const normCategory = normalizeCategory(category);
      // Optionally skip comments-only categories
      if (normCategory.toLowerCase().includes('comment')) return;
      if (!categoryAverages[normCategory]) categoryAverages[normCategory] = { total: 0, count: 0 };
      categoryAverages[normCategory].total += response.rating;
      categoryAverages[normCategory].count += 1;
    });
  });
  const chartData = Object.entries(categoryAverages).map(([category, data]) => ({
    category: capitalizeFirstLetter(category),
    average: data.count ? (data.total / data.count).toFixed(1) : 0,
  }));

  console.log("Chart Data:", chartData);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(131,114,94)]"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleDepartmentClick = (departmentId) => {
    const department = departments.find(d => d._id === departmentId);
    console.log(`${department.name} department clicked (ID: ${departmentId})`);
    console.log("Department details:", department);
    navigate(`/admin/survey-analytics/${departmentId}`);
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader />

      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[goldenrod]">Survey Analytics</h1>
          <p className="text-gray-200">View detailed survey information and feedback</p>
        </div>

        {/* Department Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {departments.map((dept) => {
            const deptSurveys = surveysByDepartment[String(dept._id)] || [];
            console.log(`Department ${dept.name} (${dept._id}) has ${deptSurveys.length} surveys`);
            
            return (
              <div 
                key={dept._id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedDepartment === dept._id ? 'bg-[#93725E]/30' : 'bg-black/40 hover:bg-[#93725E]/20'
                }`}
                onClick={() => handleDepartmentClick(dept._id)}
              >
                <Card className="bg-[#1a1a1f]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[goldenrod] flex items-center gap-2">
                          {getDepartmentIcon(dept.name)} {capitalizeFirstLetter(dept.name)}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Total Surveys: {deptSurveys.length}
                        </p>
                      </div>
                    </div>

                    {selectedDepartment === dept._id && deptSurveys.length > 0 && (
                      <div className="mt-4 space-y-4 max-h-[500px] overflow-y-auto">
                        {deptSurveys.map((survey, index) => (
                          <div key={survey._id || index} className="bg-black/40 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-sm font-medium text-gray-200">
                                    From: {capitalizeFirstLetter(survey.fromDepartmentName)}
                                  </p>
                                  <span className="text-xs text-gray-400">
                                    {new Date(survey.date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  By: {survey.userName}
                                </p>
                              </div>
                            </div>
                            {Object.entries(survey.responses || {}).map(([category, response]) => (
                              <div key={category} className="mt-3 border-t border-gray-700/50 pt-3">
                                <div className="flex justify-between items-center">
                                  <p className="text-sm text-[goldenrod] font-medium">{capitalizeFirstLetter(category)}</p>
                                  <p className="text-sm text-gray-200">Rating: {response.rating}%</p>
                                </div>
                                {response.expectations && (
                                  <p className="text-xs text-gray-300 mt-2 bg-white/5 p-2 rounded">
                                    {response.expectations}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Category Performance Bar Chart */}
        <div className="mt-8">
          <Card className="bg-black/30">
            <CardHeader>
              <CardTitle className="text-[goldenrod]">Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 40, left: 40, bottom: 20 }}
                    barCategoryGap="25%"
                  >
                    <defs>
                      <linearGradient id="goldBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FFD700" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#FFB300" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: '#FFD700', fontWeight: 600, fontSize: 14 }}
                      axisLine={{ stroke: '#FFD700' }}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ fill: '#FFD700', fontWeight: 600, fontSize: 14 }}
                      width={200}
                      axisLine={{ stroke: '#FFD700' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#18181b',
                        border: '1px solid #FFD700',
                        borderRadius: 8,
                        color: '#FFD700',
                      }}
                      labelStyle={{ color: '#FFD700', fontWeight: 600 }}
                      itemStyle={{ color: '#FFD700' }}
                      cursor={{ fill: '#FFD700', fillOpacity: 0.1 }}
                    />
                    <Bar
                      dataKey="average"
                      fill="url(#goldBar)"
                      radius={[0, 12, 12, 0]}
                      barSize={28}
                      isAnimationActive={true}
                      stroke="#FFD700"
                      strokeWidth={1}
                    >
                      <LabelList
                        dataKey="average"
                        position="right"
                        fill="#FFD700"
                        fontWeight={700}
                        fontSize={16}
                        formatter={(value) => `${value}%`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default SurveyAnalyticsPage; 