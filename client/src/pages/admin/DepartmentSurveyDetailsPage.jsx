import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import DashboardHeader from "../../components/DashboardHeader";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { capitalizeFirstLetter, getDepartmentIcon, Server } from "../../Constants";
import axios from "axios";
import GaugeChart from 'react-gauge-chart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function DepartmentSurveyDetailsPage() {
  const { departmentId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [department, setDepartment] = useState(null);
  const [surveyData, setSurveyData] = useState([]);
  const [filterView, setFilterView] = useState("all"); // all, low, medium, high
  const [sortBy, setSortBy] = useState("date"); // date, rating
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("cards"); // cards, table, analytics
  const [selectedTab, setSelectedTab] = useState("overview"); // overview, responses, analytics
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper function to get initials (first two)
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const deptResponse = await axios.get(`${Server}/departments/${departmentId}`, { withCredentials: true });
        setDepartment(deptResponse.data);

        const surveysResponse = await axios.get(`${Server}/surveys/analytics`, { withCredentials: true });
        const departmentSurveys = surveysResponse.data.filter(
          survey => String(survey.toDepartmentId) === String(departmentId)
        );
        setSurveyData(departmentSurveys);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load department survey data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [departmentId]);

  const getAverageRating = (surveys) => {
    if (!surveys.length) return 0;
    const totalRatings = surveys.reduce((acc, survey) => {
      const categoryRatings = Object.values(survey.responses).map(r => r.rating);
      return acc + (categoryRatings.reduce((sum, r) => sum + r, 0) / categoryRatings.length);
    }, 0);
    return (totalRatings / surveys.length).toFixed(1);
  };

  const filterSurveys = () => {
    let filtered = [...surveyData];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(survey => 
        survey.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.fromDepartmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(survey.responses).some(r => 
          r.expectations?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply rating filter
    if (filterView !== "all") {
      filtered = filtered.filter(survey => {
        const avgRating = Object.values(survey.responses).reduce((sum, r) => sum + r.rating, 0) / 
                         Object.values(survey.responses).length;
        if (filterView === "low") return avgRating < 60;
        if (filterView === "medium") return avgRating >= 60 && avgRating < 80;
        return avgRating >= 80;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date) - new Date(a.date);
      }
      const aRating = Object.values(a.responses).reduce((sum, r) => sum + r.rating, 0) / 
                     Object.values(a.responses).length;
      const bRating = Object.values(b.responses).reduce((sum, r) => sum + r.rating, 0) / 
                     Object.values(b.responses).length;
      return bRating - aRating;
    });

    return filtered;
  };

  const paginatedSurveys = () => {
    const filtered = filterSurveys();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(filterSurveys().length / itemsPerPage);

  const renderPagination = () => (
    <div className="flex justify-center items-center gap-2 mt-6">
      <Button
        variant="outline"
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
        className="text-[goldenrod]"
      >
        First
      </Button>
      <Button
        variant="outline"
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
        className="text-[goldenrod]"
      >
        Previous
      </Button>
      <span className="text-gray-200 px-4">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
        className="text-[goldenrod]"
      >
        Next
      </Button>
      <Button
        variant="outline"
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
        className="text-[goldenrod]"
      >
        Last
      </Button>
    </div>
  );

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#1a1a1f] border-b border-gray-700">
            <th className="p-4 text-[goldenrod]">Date</th>
            <th className="p-4 text-[goldenrod]">User</th>
            <th className="p-4 text-[goldenrod]">From Department</th>
            <th className="p-4 text-[goldenrod]">Avg. Rating</th>
            <th className="p-4 text-[goldenrod]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedSurveys().map((survey) => (
            <tr key={survey._id} className="border-b border-gray-700 hover:bg-black/20">
              <td className="p-4 text-gray-200">
                {new Date(survey.date).toLocaleDateString()}
              </td>
              <td className="p-4 text-gray-200">{survey.userName}</td>
              <td className="p-4 text-gray-200">
                {capitalizeFirstLetter(survey.fromDepartmentName)}
              </td>
              <td className="p-4 text-gray-200">
                {getAverageRating([survey])}%
              </td>
              <td className="p-4">
                <Button
                  variant="outline"
                  className="text-[goldenrod] text-sm"
                  onClick={() => {
                    // Open details modal
                  }}
                >
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAnalyticsView = () => (
    <div className="space-y-8">
      <Card className="bg-[#1a1a1f]">
        <CardHeader>
          <CardTitle className="text-[goldenrod]">Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-around gap-4">
            {['Low', 'Medium', 'High'].map(range => {
              const count = surveyData.filter(survey => {
                const avgRating = Object.values(survey.responses).reduce((sum, r) => sum + r.rating, 0) / 
                                 Object.values(survey.responses).length;
                if (range === 'Low') return avgRating < 60;
                if (range === 'Medium') return avgRating >= 60 && avgRating < 80;
                return avgRating >= 80;
              }).length;
              const percentage = (count / surveyData.length) * 100;
              
              return (
                <div key={range} className="flex flex-col items-center">
                  <div 
                    className="w-20 bg-[goldenrod]/80 rounded-t"
                    style={{ height: `${Math.max(percentage, 5)}%` }}
                  ></div>
                  <p className="mt-2 text-gray-200">{range}</p>
                  <p className="text-sm text-gray-400">{count} surveys</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#1a1a1f]">
        <CardHeader>
          <CardTitle className="text-[goldenrod]">Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {/* Add a line chart showing trends over time */}
          </div>
        </CardContent>
      </Card>
    </div>
  );

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

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <DashboardHeader />

      <main className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="bg-[#1a1a1f] rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => navigate("/admin/survey-analytics")}
              variant="outline"
              className="text-[goldenrod] hover:bg-[goldenrod]/10"
            >
              ← Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[goldenrod] flex items-center gap-2 mb-2">
                {department && getDepartmentIcon(department.name)} 
                {department && capitalizeFirstLetter(department.name)}
              </h1>
              <p className="text-gray-400">Survey Analysis and Insights</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Total Responses</p>
              <p className="text-3xl font-bold text-[goldenrod]">{surveyData.length}</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Average Rating</p>
              <p className="text-3xl font-bold text-[goldenrod]">{getAverageRating(surveyData)}%</p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Latest Response</p>
              <p className="text-3xl font-bold text-[goldenrod]">
                {surveyData.length ? new Date(surveyData[0].date).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-[goldenrod]">98%</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1a1a1f] rounded-xl shadow-lg mb-8">
          <div className="flex gap-1 p-1">
            {['Overview', 'Responses', 'Analytics'].map((tab) => (
              <button
                key={tab}
                className={`flex-1 px-6 py-3 text-base font-medium rounded-lg transition-all ${
                  selectedTab === tab.toLowerCase()
                    ? 'bg-[goldenrod]/10 text-[goldenrod]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-black/20'
                }`}
                onClick={() => setSelectedTab(tab.toLowerCase())}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {selectedTab === 'responses' && (
          <div className="bg-[#1a1a1f] rounded-xl shadow-lg p-6">
            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-800">
              <div className="flex-1 min-w-[300px]">
                <p className="text-sm text-gray-400 mb-2">Search</p>
                <input
                  type="text"
                  placeholder="Search by name, department, or comments..."
                  className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-[goldenrod]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Rating Filter</p>
                <select
                  className="px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-[goldenrod]"
                  value={filterView}
                  onChange={(e) => setFilterView(e.target.value)}
                >
                  <option value="all">All Ratings</option>
                  <option value="low">Low Rating (&lt;60%)</option>
                  <option value="medium">Medium Rating (60-80%)</option>
                  <option value="high">High Rating (&gt;80%)</option>
                </select>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Sort By</p>
                <select
                  className="px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-[goldenrod]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date">Date</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">View</p>
                <div className="flex gap-1 bg-black/30 p-1 rounded-lg">
                  <button
                    className={`px-4 py-2 rounded-md transition-all ${
                      viewMode === 'cards'
                        ? 'bg-[goldenrod] text-black font-medium'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    onClick={() => setViewMode('cards')}
                  >
                    Cards
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md transition-all ${
                      viewMode === 'table'
                        ? 'bg-[goldenrod] text-black font-medium'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    onClick={() => setViewMode('table')}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            {viewMode === 'table' ? (
              <div className="rounded-lg overflow-hidden border border-gray-800">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-black/40">
                      <th className="p-4 text-sm font-medium text-gray-400">Date</th>
                      <th className="p-4 text-sm font-medium text-gray-400">User</th>
                      <th className="p-4 text-sm font-medium text-gray-400">From Department</th>
                      <th className="p-4 text-sm font-medium text-gray-400">Avg. Rating</th>
                      <th className="p-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSurveys().map((survey) => (
                      <tr key={survey._id} className="border-t border-gray-800 hover:bg-black/20">
                        <td className="p-4 text-gray-200">
                          {new Date(survey.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-gray-200">{survey.userName}</td>
                        <td className="p-4 text-gray-200">
                          {capitalizeFirstLetter(survey.fromDepartmentName)}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[goldenrod]/10 text-[goldenrod]">
                            {getAverageRating([survey])}%
                          </span>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[goldenrod] text-sm hover:bg-[goldenrod]/10"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {paginatedSurveys().map((survey) => (
                  <div key={survey._id} className="bg-black/30 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[goldenrod]/10 text-[goldenrod] font-medium">
                            {getInitials(survey.userName)}
                          </span>
                          <div>
                            <h3 className="text-lg font-medium text-gray-200">
                              {survey.userName}
                            </h3>
                            <p className="text-sm text-gray-400">
                              from {capitalizeFirstLetter(survey.fromDepartmentName)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">
                          Submitted on {new Date(survey.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[goldenrod]/10">
                          <span className="text-2xl font-bold text-[goldenrod]">
                            {getAverageRating([survey])}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">Average Rating</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(survey.responses).map(([category, response]) => (
                        <div key={category} className="bg-black/20 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[goldenrod] font-medium">
                              {capitalizeFirstLetter(category)}
                            </h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[goldenrod]/10 text-[goldenrod]">
                              {response.rating}%
                            </span>
                          </div>
                          {response.expectations && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-400 mb-1">Comments:</p>
                              <p className="text-sm text-gray-300 bg-black/30 p-3 rounded-lg">
                                {response.expectations}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6 flex justify-between items-center">
              <p className="text-sm text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filterSurveys().length)} of {filterSurveys().length} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="text-[goldenrod] hover:bg-[goldenrod]/10"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-[goldenrod] hover:bg-[goldenrod]/10"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-4">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 text-center bg-black/30 border border-gray-700 rounded-md text-gray-200"
                  />
                  <span className="text-gray-400">of {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="text-[goldenrod] hover:bg-[goldenrod]/10"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="text-[goldenrod] hover:bg-[goldenrod]/10"
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'analytics' && (
          <div className="bg-[#1a1a1f] rounded-xl shadow-lg p-6">
            {/* Modern Analytics UI */}
            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
              {/* Gauge Chart */}
              <div className="w-full md:w-1/2 flex flex-col items-center">
                <h2 className="text-lg font-semibold mb-4 text-center text-gray-200">Customer Satisfaction Score</h2>
                <GaugeChart
                  id="gauge-chart"
                  nrOfLevels={20}
                  percent={getAverageRating(surveyData) / 100}
                  colors={['#d9534f', '#f0ad4e', '#5cb85c']}
                  arcWidth={0.3}
                  textColor="#fff"
                  needleColor="#fff"
                  animate={false}
                  style={{ width: '100%', maxWidth: 320 }}
                  formatTextValue={() => ''}
                />
                <div className="text-4xl font-extrabold mt-2 text-gray-100">{getAverageRating(surveyData)}%</div>
              </div>

              {/* Bar Chart: Category Performance */}
              <div className="w-full md:w-1/2 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={(() => {
                      // Prepare data: average score for each category
                      const categoryTotals = {};
                      surveyData.forEach(survey => {
                        Object.entries(survey.responses).forEach(([category, response]) => {
                          if (!categoryTotals[category]) categoryTotals[category] = { total: 0, count: 0 };
                          categoryTotals[category].total += response.rating;
                          categoryTotals[category].count += 1;
                        });
                      });
                      return Object.entries(categoryTotals).map(([category, { total, count }]) => ({
                        category: capitalizeFirstLetter(category),
                        percent: count ? (total / count) : 0
                      }));
                    })()}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#fff', fontWeight: 600 }} />
                    <YAxis dataKey="category" type="category" tick={{ fill: '#fff', fontWeight: 600 }} width={180} />
                    <Tooltip formatter={value => `${value.toFixed(1)}%`} labelFormatter={label => label} />
                    <Bar dataKey="percent" fill="#5cb85c" barSize={24} radius={[0, 12, 12, 0]} isAnimationActive={true}>
                      {/* Show value on bar */}
                      <text
                        x={0}
                        y={0}
                        dx={0}
                        dy={0}
                        textAnchor="end"
                        fontSize="14"
                        fontWeight="bold"
                        fill="#fff"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'overview' && (
          <div className="bg-[#1a1a1f] rounded-xl shadow-lg p-6">
            {/* Add overview content here */}
          </div>
        )}
      </main>
    </div>
  );
}

export default DepartmentSurveyDetailsPage; 