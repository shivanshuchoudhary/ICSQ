import { Survey } from '../models/Survey.model.js';
import { Department } from '../models/Department.model.js';
import { User } from '../models/User.model.js';
import { Category } from '../models/Category.model.js';
import { BUSINESS_TARGET, SCORE_THRESHOLDS, DEPARTMENT_CODE_MAP } from '../config/constants.js';

export const getHODDashboardData = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const currentUserId = req.user.id;

    console.log(`[HOD Dashboard] Request for department: ${departmentId} by user: ${currentUserId}`);

    // Get current user to check if they're HOD of the requested department
    const currentUser = await User.findById(currentUserId).populate('headedDepartments department');
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Check if user is HOD/admin and has access to this department
    const isAdmin = currentUser.role === 'admin';
    const isHod = currentUser.role === 'hod';
    
    let hasAccess = isAdmin;
    
    if (isHod && !hasAccess) {
      // Check if the department is in their headedDepartments or is their own department
      const headedDeptIds = (currentUser.headedDepartments || []).map(dept => dept._id.toString());
      const ownDeptId = currentUser.department?._id?.toString();
      hasAccess = headedDeptIds.includes(departmentId) || ownDeptId === departmentId;
    }

    if (!hasAccess) {
      console.log(`[HOD Dashboard] Access denied for user ${currentUserId} to department ${departmentId}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own department data.'
      });
    }

    // Get all departments for comparison
    const allDepartments = await Department.find({}).sort({ name: 1 });
    console.log(`[HOD Dashboard] Found ${allDepartments.length} departments`);

    // Get all categories for proper category mapping
    const allCategories = await Category.find({});
    const categoryMap = {};
    allCategories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat.name;
    });

    // Get surveys for the specific department (as reviewed department - toDepartment)
    const departmentSurveys = await Survey.find({ 
      toDepartment: departmentId 
    }).populate('userId fromDepartment toDepartment');
    console.log(`[HOD Dashboard] Found ${departmentSurveys.length} surveys for department`);

    // Get all surveys for business averages
    const allSurveys = await Survey.find({}).populate('userId fromDepartment toDepartment');
    console.log(`[HOD Dashboard] Found ${allSurveys.length} total surveys`);

    // Calculate overall ICSQ score for the department (as percentage)
    const overallScore = calculateOverallScoreAsPercentage(departmentSurveys);
    console.log(`[HOD Dashboard] Department overall score: ${overallScore}%`);
    
    // Calculate business average (percentage across all departments)
    const businessAvg = calculateBusinessAverage(allSurveys);
    console.log(`[HOD Dashboard] Business average: ${businessAvg}%`);

    // Calculate ICSQ scores (Business Target, Business Avg, Department Avg)
    const icsqScores = {
      businessTarget: BUSINESS_TARGET,
      businessAvg: businessAvg,
      departmentAvg: overallScore
    };

    // Calculate category-wise scores for the department (as object with category names as keys)
    const categoryScores = calculateCategoryScores(departmentSurveys, categoryMap);
    console.log(`[HOD Dashboard] Category scores:`, categoryScores);

    // Calculate survey engagement for the department
    const surveyEngagement = await calculateSurveyEngagement(departmentId);
    console.log(`[HOD Dashboard] Survey engagement:`, surveyEngagement);

    // Calculate department scores for comparison table
    // Pass departmentId to show scores FROM each department TO this department
    let departmentScores = [];
    try {
      departmentScores = await calculateDepartmentScores(allDepartments, allSurveys, categoryMap, departmentId);
      console.log(`[HOD Dashboard] Calculated scores for ${departmentScores.length} departments`);
    } catch (deptError) {
      console.error('[HOD Dashboard] Error calculating department scores:', deptError);
      // Continue with empty array - dashboard will still work without comparison table
    }

    // Determine status based on score
    const status = getStatusFromScore(overallScore);

    const dashboardData = {
      overallScore: {
        value: overallScore,
        status: status
      },
      icsqScores,
      categoryScores,
      surveyEngagement,
      departmentScores
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('[HOD Dashboard] Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

/**
 * Calculate overall ICSQ score as percentage
 * Ratings are in the range [0, 20, 40, 60, 80, 100]
 * We calculate the average rating and that already represents a percentage
 */
const calculateOverallScoreAsPercentage = (surveys) => {
  if (!surveys || surveys.length === 0) return 0;

  let totalScore = 0;
  let totalResponses = 0;

  surveys.forEach(survey => {
    if (survey.responses) {
      // Handle Map type from MongoDB
      const responses = survey.responses instanceof Map 
        ? Array.from(survey.responses.values()) 
        : Object.values(survey.responses);
      
      responses.forEach(response => {
        if (response && response.rating !== undefined && response.rating !== null) {
          totalScore += response.rating;
          totalResponses++;
        }
      });
    }
  });

  if (totalResponses === 0) return 0;
  
  // Average rating is already a percentage (0-100 scale)
  const averageScore = totalScore / totalResponses;
  return Math.round(averageScore * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate business average across all surveys
 * This is the average rating across all departments
 */
const calculateBusinessAverage = (allSurveys) => {
  if (!allSurveys || allSurveys.length === 0) return 0;

  let totalScore = 0;
  let totalResponses = 0;

  allSurveys.forEach(survey => {
    if (survey.responses) {
      // Handle Map type from MongoDB
      const responses = survey.responses instanceof Map 
        ? Array.from(survey.responses.values()) 
        : Object.values(survey.responses);
      
      responses.forEach(response => {
        if (response && response.rating !== undefined && response.rating !== null) {
          totalScore += response.rating;
          totalResponses++;
        }
      });
    }
  });

  if (totalResponses === 0) return 0;
  
  // Average rating is already a percentage (0-100 scale)
  const averageScore = totalScore / totalResponses;
  return Math.round(averageScore * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate category-wise scores for the department
 * Returns an object with category names as keys and average scores as values
 * The frontend expects this format for the WebChart component
 */
const calculateCategoryScores = (departmentSurveys, categoryMap) => {
  const categoryScoresMap = {};

  // Process each survey's responses
  departmentSurveys.forEach(survey => {
    if (survey.responses) {
      // Handle Map type from MongoDB
      const responsesArray = survey.responses instanceof Map 
        ? Array.from(survey.responses.entries()) 
        : Object.entries(survey.responses);
      
      responsesArray.forEach(([categoryId, response]) => {
        if (response && response.rating !== undefined && response.rating !== null) {
          // Get category name from categoryMap
          const categoryName = categoryMap[categoryId] || categoryId;
          
          if (!categoryScoresMap[categoryName]) {
            categoryScoresMap[categoryName] = [];
          }
          categoryScoresMap[categoryName].push(response.rating);
        }
      });
    }
  });

  // Calculate average for each category
  const categoryScores = {};
  Object.keys(categoryScoresMap).forEach(category => {
    const scores = categoryScoresMap[category];
    if (scores.length > 0) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      categoryScores[category] = Math.round(average * 100) / 100; // Round to 2 decimal places
    }
  });

  return categoryScores;
};

/**
 * Calculate survey engagement for the department
 * Survey Given: Percentage of users in the department who have given surveys to other departments
 * Survey Received: Percentage of people from ALL departments who have given feedback TO this department
 */
const calculateSurveyEngagement = async (departmentId) => {
  try {
    // Get total users in the department
    const totalUsers = await User.countDocuments({ department: departmentId });
    
    if (totalUsers === 0) {
      return { surveyGiven: 0, surveyReceived: 0 };
    }

    // Get unique users from this department who have given surveys
    const usersWhoGaveSurveys = await Survey.distinct('userId', { 
      fromDepartment: departmentId 
    });

    // Calculate percentage of users from this department who gave surveys
    const surveyGiven = Math.round((usersWhoGaveSurveys.length / totalUsers) * 100);
    
    // FIXED: Calculate percentage based on ELIGIBLE users (from departments that can review this dept)
    // Get department mapping to find which departments can review this one
    const {DepartmentMapping} = await import('../models/DepartmentMapping.model.js');
    const mapping = await DepartmentMapping.findOne({ department: departmentId })
      .populate('reviewerDepartments');
    
    let totalEligibleUsers = 0;
    
    if (mapping && mapping.reviewerDepartments && mapping.reviewerDepartments.length > 0) {
      // Count users only from departments that CAN review this department
      const reviewerDeptIds = mapping.reviewerDepartments.map(d => d._id);
      totalEligibleUsers = await User.countDocuments({ 
        department: { $in: reviewerDeptIds } 
      });
    } else {
      // Fallback: If no mapping found, use all users in company (old behavior)
      totalEligibleUsers = await User.countDocuments({});
      console.warn(`[HOD Dashboard] No department mapping found for department ${departmentId}. Using all users as fallback.`);
    }
    
    // Get unique users who have given surveys TO this department (from any department)
    const usersWhoGaveSurveysToThisDept = await Survey.distinct('userId', { 
      toDepartment: departmentId 
    });

    // Calculate percentage: (unique users who gave feedback TO this dept / total ELIGIBLE users) * 100
    const surveyReceived = totalEligibleUsers > 0 
      ? Math.round((usersWhoGaveSurveysToThisDept.length / totalEligibleUsers) * 100)
      : 0;

    return {
      surveyGiven,
      surveyReceived
    };
  } catch (error) {
    console.error('[HOD Dashboard] Error calculating survey engagement:', error);
    return { surveyGiven: 0, surveyReceived: 0 };
  }
};

/**
 * Calculate department scores for the comparison table
 * Shows scores and response rates FROM each department TO the target department
 * @param {Array} allDepartments - All departments in the system
 * @param {Array} allSurveys - All surveys in the system
 * @param {Object} categoryMap - Map of category IDs to names
 * @param {String} targetDepartmentId - The department ID to filter data TO
 */
const calculateDepartmentScores = async (allDepartments, allSurveys, categoryMap, targetDepartmentId) => {
  const departmentScores = [];

  // Get department mapping to check which departments CAN review the target
  const {DepartmentMapping} = await import('../models/DepartmentMapping.model.js');
  const targetMapping = await DepartmentMapping.findOne({ department: targetDepartmentId })
    .populate('reviewerDepartments');
  
  // Get list of department IDs that CAN review the target
  const allowedReviewerIds = targetMapping?.reviewerDepartments?.map(d => d._id.toString()) || [];

  for (const dept of allDepartments) {
    // UPDATED LOGIC: Get surveys FROM this department TO the target department
    // This shows "What score did this department give TO the logged-in HOD's department?"
    const deptSurveys = allSurveys.filter(survey => {
      try {
        if (!survey || !survey.toDepartment || !survey.fromDepartment || !dept || !dept._id) return false;
        
        // Handle both ObjectId and populated department objects
        const toDeptId = survey.toDepartment._id 
          ? survey.toDepartment._id.toString() 
          : survey.toDepartment.toString();
        
        const fromDeptId = survey.fromDepartment._id 
          ? survey.fromDepartment._id.toString() 
          : survey.fromDepartment.toString();
        
        // Filter: surveys FROM this department (dept) TO the target department
        return fromDeptId === dept._id.toString() && toDeptId === targetDepartmentId.toString();
      } catch (err) {
        console.warn(`[HOD Dashboard] Error filtering survey for department:`, err.message);
        return false;
      }
    });

    // Calculate ICSQ score: What score did this department give TO the target department?
    const icsqScore = calculateOverallScoreAsPercentage(deptSurveys);

    // UPDATED LOGIC: Calculate response rate FROM this department TO the target department
    // "What % of users FROM this department gave surveys TO the target department?"
    const totalUsersInDept = await User.countDocuments({ department: dept._id });
    
    // Count unique users FROM this department who gave surveys TO the target department
    const usersFromDeptWhoRespondedToTarget = new Set();
    allSurveys.forEach(survey => {
      try {
        if (survey && survey.fromDepartment && survey.toDepartment) {
          // Handle both ObjectId and populated department objects
          const fromDeptId = survey.fromDepartment._id 
            ? survey.fromDepartment._id.toString() 
            : survey.fromDepartment.toString();
          
          const toDeptId = survey.toDepartment._id 
            ? survey.toDepartment._id.toString() 
            : survey.toDepartment.toString();
          
          // If survey is FROM this department TO the target department, add the user
          if (fromDeptId === dept._id.toString() && 
              toDeptId === targetDepartmentId.toString() && 
              survey.userId) {
            const userId = survey.userId._id ? survey.userId._id.toString() : survey.userId.toString();
            usersFromDeptWhoRespondedToTarget.add(userId);
          }
        }
      } catch (err) {
        // Skip surveys with invalid data
        console.warn(`[HOD Dashboard] Invalid survey data:`, err.message);
      }
    });
    
    // Check if this department CAN review the target department
    const canReview = allowedReviewerIds.length === 0 || allowedReviewerIds.includes(dept._id.toString());
    
    // Calculate response rate only if this department CAN review the target
    let responseRate;
    if (!canReview) {
      responseRate = null; // Will be displayed as "N/A" in frontend
    } else {
      responseRate = totalUsersInDept > 0 
        ? Math.round((usersFromDeptWhoRespondedToTarget.size / totalUsersInDept) * 100) 
        : 0;
    }

    // Calculate category-wise scores FROM this department TO the target department
    const categoriesForDept = calculateCategoryScores(deptSurveys, categoryMap);

    departmentScores.push({
      department: dept.name,
      code: getDepartmentCode(dept.name),
      icsqScore: icsqScore > 0 ? icsqScore : null,
      responseRate, // Will be null (N/A) if cannot review, or percentage if can review
      isLowScore: icsqScore > 0 && icsqScore < 60, // Mark scores below 60% as low (Detractor)
      categoryScores: categoriesForDept,
      canReview // Add flag to help frontend render appropriately
    });
  }

  return departmentScores;
};

/**
 * Get department code from department name
 * Uses the centralized mapping from constants
 */
const getDepartmentCode = (departmentName) => {
  if (!departmentName) return 'N/A';
  
  const code = DEPARTMENT_CODE_MAP[departmentName.toLowerCase()];
  if (code) return code;
  
  // Fallback: use first 4 characters uppercase
  return departmentName.substring(0, 4).toUpperCase();
};

/**
 * Determine status label based on ICSQ score
 * Uses the thresholds defined in constants
 */
const getStatusFromScore = (score) => {
  if (score >= SCORE_THRESHOLDS.PROMOTER) return 'Promoter';
  if (score >= SCORE_THRESHOLDS.PASSIVE) return 'Passive';
  return 'Detractor';
};

