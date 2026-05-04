import { Survey } from "../models/Survey.model.js";
import mongoose from "mongoose";
import axios from "axios";

// Rule-based: Top 10 most common expectations for a department/category
export async function summarizeExpectationsRuleBased(req, res) {
  try {
    const { departmentId, category } = req.query;
    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required" });
    }
    // Fetch all surveys for the department
    const surveys = await Survey.find({ toDepartment: departmentId }).lean();
    let expectations = [];
    if (category) {
      // Only for a specific category
      for (const survey of surveys) {
        const resp = survey.responses?.[category];
        if (resp && resp.expectations && typeof resp.expectations === 'string') {
          expectations.push(resp.expectations.trim());
        }
      }
    } else {
      // For all categories
      for (const survey of surveys) {
        for (const catKey in survey.responses) {
          const resp = survey.responses[catKey];
          if (resp && resp.expectations && typeof resp.expectations === 'string') {
            expectations.push(resp.expectations.trim());
          }
        }
      }
    }
    // Count frequency
    const freq = {};
    for (const exp of expectations) {
      if (!exp) continue;
      freq[exp] = (freq[exp] || 0) + 1;
    }
    // Sort and take top 20
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([text, count]) => ({ text, count }));
    return res.json({ summary: sorted });
  } catch (error) {
    console.error("Rule-based summarization error:", error);
    return res.status(500).json({ message: "Failed to summarize expectations" });
  }
}

// Validate and filter AI response to only include plans with valid user data
async function validateAndFilterAIResponse(parsedResponse) {
  if (!Array.isArray(parsedResponse)) {
    console.warn('Invalid parsed response format:', typeof parsedResponse);
    return [];
  }
  
  const { User } = await import('../models/User.model.js');
  const validPlans = [];
  
  for (const plan of parsedResponse) {
    console.log(`Validating plan: ${plan.category} with ${plan.originalSurveyRespondents?.length || 0} respondents`);
    
    // Check if plan has originalSurveyRespondents
    if (!plan.originalSurveyRespondents || !Array.isArray(plan.originalSurveyRespondents) || plan.originalSurveyRespondents.length === 0) {
      console.log(`Skipping plan ${plan.category}: No originalSurveyRespondents`);
      continue;
    }
    
    // Validate each respondent
    const validRespondents = [];
    for (const respondent of plan.originalSurveyRespondents) {
      // Check if respondent has required fields
      if (!respondent.userId || !respondent.surveyId || !respondent.originalExpectation) {
        console.log(`Skipping invalid respondent:`, respondent);
        continue;
      }
      
      // Check if userId is not "undefined" or empty
      if (respondent.userId === 'undefined' || respondent.userId === 'null' || respondent.userId.trim() === '') {
        console.log(`Skipping respondent with invalid userId:`, respondent);
        continue;
      }
      
      // Validate that user exists in database
      try {
        const user = await User.findById(respondent.userId).select('_id name email');
        if (!user) {
          console.log(`Skipping respondent with non-existent userId: ${respondent.userId}`);
          continue;
        }
        
        // Add validated respondent
        validRespondents.push({
          ...respondent,
          userExists: true,
          userName: user.name,
          userEmail: user.email
        });
        
      } catch (error) {
        console.error(`Error validating user ${respondent.userId}:`, error.message);
        continue;
      }
    }
    
    // Only include plans that have at least one valid respondent
    if (validRespondents.length > 0) {
      plan.originalSurveyRespondents = validRespondents;
      validPlans.push(plan);
      console.log(`✅ Plan ${plan.category} validated with ${validRespondents.length} valid respondents`);
    } else {
      console.log(`❌ Plan ${plan.category} skipped: No valid respondents`);
    }
  }
  
  console.log(`Validation complete: ${validPlans.length}/${parsedResponse.length} plans passed validation`);
  return validPlans;
}

// AI-based: Use Gemini API to generate smart action plans and insights
export async function summarizeExpectationsAI(req, res) {
  try {
    const { departmentId, category, priority } = req.query;
    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required" });
    }
    
    // Fetch all surveys for the department
    const surveys = await Survey.find({ toDepartment: departmentId }).lean();
    console.log(`Found ${surveys.length} surveys for department ${departmentId}`);
    
    if (surveys.length > 0) {
      console.log('Sample survey from query:', {
        _id: surveys[0]._id,
        userId: surveys[0].userId,
        fromDepartment: surveys[0].fromDepartment,
        toDepartment: surveys[0].toDepartment,
        responsesKeys: Object.keys(surveys[0].responses || {}),
        sampleResponse: surveys[0].responses ? Object.entries(surveys[0].responses)[0] : null
      });
    }
    
    let expectations = [];
    let ratings = [];
    
    if (category) {
      for (const survey of surveys) {
        const resp = survey.responses?.[category];
        if (resp && resp.expectations && typeof resp.expectations === 'string') {
          expectations.push(resp.expectations.trim());
          if (resp.rating) ratings.push(resp.rating);
        }
      }
    } else {
      for (const survey of surveys) {
        for (const catKey in survey.responses) {
          const resp = survey.responses[catKey];
          if (resp && resp.expectations && typeof resp.expectations === 'string') {
            expectations.push(resp.expectations.trim());
            if (resp.rating) ratings.push(resp.rating);
          }
        }
      }
    }
    
    if (expectations.length === 0) {
      return res.json({ summary: "" });
    }

    // Calculate average rating if available
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    
    // Get eligible categories for this department
    const { Category } = await import("../models/Category.model.js");
    const eligibleCategories = await Category.find({
      $or: [
        { department: null }, // Global categories
        { department: departmentId } // Department-specific categories
      ]
    }).lean();
    
    // Create category-specific expectations for better analysis with user/survey data
    const categoryExpectations = {};
    const categoryRatings = {};
    const categoryUserData = {}; // Store user and survey data for each expectation
    
    // Group expectations by category with user/survey tracking
    if (category) {
      // Single category mode
      categoryExpectations[category] = expectations;
      categoryRatings[category] = ratings;
      categoryUserData[category] = [];
      
    // Collect user/survey data for this category
    console.log(`Collecting user data for category: ${category}`);
    for (const survey of surveys) {
      const resp = survey.responses?.[category];
      console.log(`Survey ${survey._id}: userId=${survey.userId}, hasResponse=${!!resp}, hasExpectations=${!!(resp?.expectations)}, expectationsType=${typeof resp?.expectations}`);
      
      if (resp && resp.expectations && typeof resp.expectations === 'string' && survey.userId) {
        const userData = {
          userId: String(survey.userId),
          surveyId: String(survey._id),
          originalExpectation: resp.expectations.trim(),
          category: category
        };
        categoryUserData[category].push(userData);
        console.log(`Added user data:`, userData);
      }
    }
    } else {
      // Multi-category mode - group by category with user/survey tracking
      for (const survey of surveys) {
        for (const catKey in survey.responses) {
          const resp = survey.responses[catKey];
          if (resp && resp.expectations && typeof resp.expectations === 'string') {
            if (!categoryExpectations[catKey]) {
              categoryExpectations[catKey] = [];
              categoryRatings[catKey] = [];
              categoryUserData[catKey] = [];
            }
            categoryExpectations[catKey].push(resp.expectations.trim());
            if (resp.rating) categoryRatings[catKey].push(resp.rating);
            
            // Store user/survey data (only if userId exists)
            if (survey.userId) {
              const userData = {
                userId: String(survey.userId),
                surveyId: String(survey._id),
                originalExpectation: resp.expectations.trim(),
                category: catKey
              };
              categoryUserData[catKey].push(userData);
              console.log(`Multi-category: Added user data for ${catKey}:`, userData);
            } else {
              console.log(`Multi-category: Skipping survey ${survey._id} for category ${catKey} - no userId`);
            }
          }
        }
      }
    }

    // Enhanced prompt for structured AI response with category-specific data
    const prompt = `You are an expert organizational development consultant analyzing ICSQ (Internal Customer Service Quality) survey responses. Your task is to create meaningful, specific action plans based on actual survey feedback.

SURVEY DATA ANALYSIS:
${Object.entries(categoryExpectations).map(([catKey, catExpectations]) => {
  const catRatings = categoryRatings[catKey] || [];
  const avgCatRating = catRatings.length > 0 ? (catRatings.reduce((a, b) => a + b, 0) / catRatings.length).toFixed(1) : 'N/A';
  // Include more responses for better analysis (up to 12 instead of 8)
  const limitedResponses = catExpectations.slice(0, 12).map(exp => 
    exp.length > 200 ? exp.substring(0, 200) + '...' : exp
  );
  
  // Include user/survey mapping data for this category
  const userData = categoryUserData[catKey] || [];
  const userMappingText = userData.length > 0 ? 
    `\nUser/Survey Mapping:\n${userData.map((user, idx) => 
      `${idx + 1}. User: ${user.userId}, Survey: ${user.surveyId}, Expectation: "${user.originalExpectation.substring(0, 150)}${user.originalExpectation.length > 150 ? '...' : ''}"`
    ).join('\n')}` : 
    '\nNo user/survey data available';
  
  return `\n=== ${catKey.toUpperCase()} ===\nAvg Rating: ${avgCatRating}/5 (${catRatings.length} total responses)\nDetailed Responses:\n${limitedResponses.map((exp, idx) => `${idx + 1}. "${exp}"`).join('\n')}${userMappingText}`;
}).join('\n\n')}

OVERALL DEPARTMENT PERFORMANCE: ${avgRating ? avgRating.toFixed(1) + '/5 average rating' : 'No ratings available'}

ELIGIBLE CATEGORIES (use these exact names and IDs):
${eligibleCategories.map(cat => `${cat.name} (ID: ${cat._id})`).join('\n')}

PRIORITY FOCUS: ${priority || 'all'}

CRITICAL REQUIREMENT: Generate exactly 1 detailed action plan for each of the ${eligibleCategories.length} eligible categories.

ANALYSIS INSTRUCTIONS:
1. **DEEP ANALYSIS**: For each category, carefully read through ALL the survey responses provided
2. **IDENTIFY PATTERNS**: Look for common themes, specific issues, and recurring concerns mentioned by respondents
3. **PRIORITIZE BY IMPACT**: Focus on issues that appear most frequently or are mentioned with the most urgency
4. **CREATE SPECIFIC SUMMARIES**: Write 20-30 word summaries that capture the ESSENCE of what respondents are asking for, not generic statements

SUMMARY CREATION RULES - CRITICAL:
- ABSOLUTELY FORBIDDEN: "General improvement needed", "Need to improve", "Improvement required", "General improvement in {category}", "Need to improve in {category}", "Better {category} needed"
- ABSOLUTELY FORBIDDEN: Including user IDs, survey IDs, or any technical identifiers in the summary text
- MANDATORY: Every summary MUST be 20-30 words and based on SPECIFIC survey responses provided above
- REQUIRED: Extract the EXACT issues, concerns, or requests mentioned by respondents
- REQUIRED: Use specific numbers, timeframes, or concrete details from the survey responses
- REQUIRED: Include what respondents specifically asked for, not generic improvement statements
- REQUIRED: Make summaries actionable and specific enough that someone reading it knows exactly what to do
- REQUIRED: Write summaries in professional, clean language without any technical identifiers

EXAMPLES OF FORBIDDEN GENERIC SUMMARIES (DO NOT USE):
❌ "General improvement needed in communication"
❌ "Need to improve response time"  
❌ "Better customer service required"
❌ "General improvement in {category}"
❌ "Need to improve in {category}"
❌ "Improvement needed in {category}"

EXAMPLES OF FORBIDDEN SUMMARIES WITH USER IDs (DO NOT USE):
❌ "Implement timestamps in customer-facing processes and prioritize MD-approved DOA implementation tasks to address delays reported by users 68555a80c39039763729c025 and 685a443e54cab538ef0381e2"
❌ "Address communication issues mentioned by user 12345 and survey 67890"
❌ "Fix response time problems reported by users abc123 and def456"

EXAMPLES OF REQUIRED SPECIFIC SUMMARIES (MUST USE THIS STYLE):
✅ "Implement daily standup meetings and weekly project updates to address communication gaps mentioned by 8 respondents who reported confusion about project status"
✅ "Reduce response time to customer queries from current 2-3 days to same-day response as specifically requested by 5 teams who cited delays affecting their work"
✅ "Create standardized documentation templates and provide training sessions as requested by 6 respondents who mentioned inconsistent information delivery"
✅ "Establish clear escalation procedures and response timeframes as mentioned by 4 teams who reported delays in getting urgent issues resolved"
✅ "Implement timestamps in customer-facing processes and prioritize MD-approved DOA implementation tasks to address delays reported by multiple users"

CRITICAL INSTRUCTIONS FOR SOURCE_RESPONSES:
- SOURCE_RESPONSES must contain ONLY the actual survey quotes listed above under each category
- COPY the exact survey responses verbatim from the category-specific data provided
- Use JSON array format: ["exact quote 1", "exact quote 2", "exact quote 3"]
- Include 3-5 most representative quotes that support your summary
- If a category has no survey data, use an empty array: []

CRITICAL INSTRUCTIONS FOR ORIGINAL_SURVEY_RESPONDENTS:
- ORIGINAL_SURVEY_RESPONDENTS must contain the EXACT user and survey data for each expectation
- Each entry must have: userId (string), surveyId (string), originalExpectation (exact quote), category (category name)
- Use the "User/Survey Mapping" data provided above under each category to get the exact userId and surveyId
- Match each expectation response with its corresponding user data from the mapping
- Use JSON array format: [{"userId": "exact_user_id_from_mapping", "surveyId": "exact_survey_id_from_mapping", "originalExpectation": "exact quote from responses", "category": "category_name"}]
- If a category has no survey data, use an empty array: []

DETAILED INSTRUCTIONS:
- ${priority === 'high' ? 'Focus on URGENT issues that need immediate attention (low ratings, critical problems mentioned by multiple respondents)' : 
    priority === 'medium' ? 'Focus on MODERATE issues that need attention but are not critical (mentioned by several respondents)' :
    priority === 'low' ? 'Focus on areas of GOOD performance that could be improved further (high ratings but with suggestions)' :
    'Focus on areas that need improvement (low ratings) and common themes across all responses'}
- For each category, analyze the provided responses and create a specific, actionable summary
- Assign each expectation to its corresponding category from the eligible categories list
- Determine priority level (High/Medium/Low) based on rating analysis and frequency of mentions
- Generate 3-5 specific, actionable recommendations in RECOMMENDED_ACTIONS for each category
- If a category has no specific survey data, create a general expectation based on the category's purpose and common organizational needs

FORMAT: Return exactly ${eligibleCategories.length} expectations, one for each category:

SUMMARY: [20-30 word specific, actionable expectation based on actual survey responses - NO generic statements]
CATEGORY: [Category 1 Name] (ID: [Category 1 ID])
PRIORITY: [High/Medium/Low]
ORIGINAL_DATA: [Brief reference to survey data - e.g., "Based on 15 responses with avg rating 2.8/5"]
SOURCE_RESPONSES: ["exact survey quote 1", "exact survey quote 2", "exact survey quote 3"]
RECOMMENDED_ACTIONS: ["Specific action 1", "Specific action 2", "Specific action 3", "Specific action 4"]
ORIGINAL_SURVEY_RESPONDENTS: [{"userId": "user_id_1", "surveyId": "survey_id_1", "originalExpectation": "exact quote 1", "category": "category_name"}, {"userId": "user_id_2", "surveyId": "survey_id_2", "originalExpectation": "exact quote 2", "category": "category_name"}]

---

SUMMARY: [20-30 word specific, actionable expectation based on actual survey responses - NO generic statements]
CATEGORY: [Category 2 Name] (ID: [Category 2 ID])
PRIORITY: [High/Medium/Low]
ORIGINAL_DATA: [Brief reference to survey data]
SOURCE_RESPONSES: ["exact survey quote 1", "exact survey quote 2", "exact survey quote 3"]
RECOMMENDED_ACTIONS: ["Specific action 1", "Specific action 2", "Specific action 3", "Specific action 4"]
ORIGINAL_SURVEY_RESPONDENTS: [{"userId": "user_id_3", "surveyId": "survey_id_3", "originalExpectation": "exact quote 3", "category": "category_name_2"}]

---

[Continue for all ${eligibleCategories.length} categories...]

FINAL VALIDATION CHECK:
Before submitting your response, verify that:
1. NO summary contains "General improvement", "Need to improve", "Improvement needed", or similar generic phrases
2. NO summary contains user IDs, survey IDs, or any technical identifiers (like 68555a80c39039763729c025)
3. EVERY summary is 20-30 words long and mentions specific details from survey responses
4. EVERY summary includes concrete numbers, timeframes, or specific requests from respondents
5. EVERY summary is actionable and tells someone exactly what needs to be done
6. EVERY summary uses professional language without technical identifiers

REMEMBER: Your summaries must be specific, actionable, and based on the actual survey responses provided. Avoid generic statements at all costs. If you cannot create a specific summary based on the survey data, do not generate a generic one.`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    let response;
    let summary;
    let maxRetries = 2;
    let currentRetry = 0;
    
    // Try with different token limits if first attempt fails
    const tokenLimits = [2500, 3500, 4000];
    
    while (currentRetry < maxRetries && !summary) {
      try {
        response = await axios.post(geminiUrl, {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 1,
            topP: 1,
            maxOutputTokens: tokenLimits[currentRetry] || 2500
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': geminiApiKey
          }
        });
        
        summary = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (summary) break;
        
      } catch (error) {
        console.error(`AI attempt ${currentRetry + 1} failed:`, error.message);
      }
      
      currentRetry++;
    }
    
    // If no summary generated after retries, return original expectations
    if (!summary) {
      console.warn('AI failed to generate summary after retries. Using fallback.');
      return res.json({ summary: expectations.join("\n") });
    }
    
    // Debug: Log survey data and categoryUserData
    console.log(`Found ${surveys.length} surveys for summarization`);
    if (surveys.length > 0) {
      console.log('Sample survey structure:', {
        id: surveys[0]._id,
        userId: surveys[0].userId,
        fromDepartment: surveys[0].fromDepartment,
        toDepartment: surveys[0].toDepartment,
        responsesKeys: Object.keys(surveys[0].responses || {}),
        sampleResponse: surveys[0].responses ? Object.entries(surveys[0].responses)[0] : null
      });
    }
    
    // console.log('categoryUserData before parsing:', Object.keys(categoryUserData));
    Object.entries(categoryUserData).forEach(([category, data]) => {
      // console.log(`Category ${category}: ${data.length} respondents`);
      if (data.length > 0) {
        console.log(`Sample data for ${category}:`, data[0]);
      }
    });
    
    // Parse the structured AI response with user/survey data
    const parsedResponse = parseStructuredAIResponse(summary, eligibleCategories, categoryExpectations, categoryUserData);
    
    // Validate and filter response to only include plans with valid user data
    const validatedResponse = await validateAndFilterAIResponse(parsedResponse);
    
    return res.json({ 
      summary: validatedResponse,
      eligibleCategories: eligibleCategories.map(cat => ({ id: cat._id, name: cat.name }))
    });
  } catch (error) {
    console.error("AI summarization error:", error?.response?.data || error);
    return res.status(500).json({ message: "Failed to summarize expectations with AI" });
  }
}
// Generate detailed action plans from AI insights
export async function generateActionPlansFromAI(req, res) {
  try {
    const { departmentId, category, selectedInsights } = req.body;
    if (!departmentId || !selectedInsights || selectedInsights.length === 0) {
      return res.status(400).json({ message: "departmentId and selectedInsights are required" });
    }

    const prompt = `Based on these insights, summarize into clear expectations:

${selectedInsights.join("\n")}

${selectedInsights.length > 10 ? `ACTION PLAN 1:
[Expectation]

ACTION PLAN 2:
[Expectation]

ACTION PLAN 3:
[Expectation]

ACTION PLAN 4:
[Expectation]

ACTION PLAN 5:
[Expectation]

ACTION PLAN 6:
[Expectation]

ACTION PLAN 7:
[Expectation]

ACTION PLAN 8:
[Expectation]

ACTION PLAN 9:
[Expectation]

ACTION PLAN 10:
[Expectation]

ACTION PLAN 11:
[Expectation]` : `ACTION PLAN 1:
[Expectation]

ACTION PLAN 2:
[Expectation]

ACTION PLAN 3:
[Expectation]

ACTION PLAN 4:
[Expectation]

ACTION PLAN 5:
[Expectation]`}`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    const response = await axios.post(geminiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1200
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': geminiApiKey
      }
    });
    
    let actionPlans = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (actionPlans) {
      // Extract everything starting from "ACTION PLAN 1"
      const planStartIndex = actionPlans.indexOf("ACTION PLAN 1");
      if (planStartIndex !== -1) {
        actionPlans = actionPlans.substring(planStartIndex);
        
        // Find end index based on length
        let endIndex;
        const plan11Index = actionPlans.indexOf("ACTION PLAN 11");
        const plan6Index = actionPlans.indexOf("ACTION PLAN 5"); 
        
        if (actionPlans.length > 2000) { // Large input - get 10 plans
          endIndex = plan11Index;
        } else { // Small input - get 5 plans
          endIndex = plan6Index;
        }
        
        if (endIndex !== -1) {
          actionPlans = actionPlans.substring(0, endIndex);
        }
      }
    }
    
    
    if (!actionPlans) {
      return res.status(500).json({ message: "Failed to generate action plans" });
    }
    
    return res.json({ actionPlans });
  } catch (error) {
    console.error("Action plan generation error:", error?.response?.data || error);
    return res.status(500).json({ message: "Failed to generate action plans" });
  }
}

// AI-powered trend analysis and predictions
export async function analyzeTrendsAndPredictions(req, res) {
  try {
    const { departmentId } = req.query;
    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required" });
    }

    // Fetch historical data
    const surveys = await Survey.find({ toDepartment: departmentId }).lean();
    
    // Analyze trends over time
    const monthlyData = {};
    surveys.forEach(survey => {
      const month = new Date(survey.createdAt).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { ratings: [], expectations: [] };
      }
      
      Object.values(survey.responses || {}).forEach(resp => {
        if (resp.rating) monthlyData[month].ratings.push(resp.rating);
        if (resp.expectations) monthlyData[month].expectations.push(resp.expectations);
      });
    });

    const prompt = `Analyze this department's performance trends and provide predictions:

MONTHLY DATA:
${Object.entries(monthlyData).map(([month, data]) => 
  `${month}: Avg Rating: ${data.ratings.length > 0 ? (data.ratings.reduce((a,b) => a+b, 0) / data.ratings.length).toFixed(1) : 'N/A'}, Expectations: ${data.expectations.length}`
).join('\n')}

Please provide:

TREND ANALYSIS:
• [Identify key trends in performance and expectations]

PREDICTIONS:
• [Predict future performance based on current trends]

RECOMMENDATIONS:
• [Suggest proactive measures to improve future performance]

RISK FACTORS:
• [Identify potential issues that could affect performance]

Focus on actionable insights and specific recommendations.`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    const response = await axios.post(geminiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 1,
        topP: 1,
        maxOutputTokens: 600
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': geminiApiKey
      }
    });
    
    let analysis = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return res.json({ analysis: analysis || "No trend analysis available" });
  } catch (error) {
    console.error("Trend analysis error:", error?.response?.data || error);
    return res.status(500).json({ message: "Failed to analyze trends" });
  }
}

// Helper function to parse structured AI response
function parseStructuredAIResponse(aiResponse, eligibleCategories, categoryExpectations = {}, categoryUserData = {}) {
  try {
    // console.log('Parsing AI response with categoryUserData:', Object.keys(categoryUserData));
    // console.log('Sample categoryUserData:', Object.entries(categoryUserData).slice(0, 2));
    
    const lines = aiResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const expectations = [];
    let currentExpectation = {};
    
    for (const line of lines) {
      if (line.startsWith('SUMMARY:')) {
        // Save previous expectation if exists
        if (currentExpectation.summary) {
          expectations.push(currentExpectation);
        }
        // Start new expectation
        currentExpectation = {
          summary: line.replace('SUMMARY:', '').trim(),
          category: '',
          categoryId: '',
          priority: '',
          originalData: '',
          sourceResponses: [],
          recommendedActions: [],
          originalSurveyRespondents: []
        };
      } else if (line.startsWith('CATEGORY:')) {
        const categoryText = line.replace('CATEGORY:', '').trim();
        // Extract category name and ID
        const match = categoryText.match(/^(.+?)\s*\(ID:\s*([a-f0-9]{24})\)$/);
        if (match) {
          currentExpectation.category = match[1].trim();
          currentExpectation.categoryId = match[2].trim();
        } else {
          currentExpectation.category = categoryText;
          // Try to find category ID by name
          const foundCategory = eligibleCategories.find(cat => cat.name === categoryText);
          if (foundCategory) {
            currentExpectation.categoryId = foundCategory._id;
          }
        }
        
        // Add originalSurveyRespondents data for this category (fallback if AI didn't provide it)
        if (!currentExpectation.originalSurveyRespondents || currentExpectation.originalSurveyRespondents.length === 0) {
          const categoryKey = currentExpectation.category.toLowerCase();
          if (categoryUserData[categoryKey]) {
            currentExpectation.originalSurveyRespondents = categoryUserData[categoryKey];
            console.log(`Using fallback originalSurveyRespondents for category ${categoryKey}:`, categoryUserData[categoryKey].length, 'respondents');
          } else if (categoryUserData[currentExpectation.category]) {
            currentExpectation.originalSurveyRespondents = categoryUserData[currentExpectation.category];
            console.log(`Using fallback originalSurveyRespondents for category ${currentExpectation.category}:`, categoryUserData[currentExpectation.category].length, 'respondents');
          } else {
            console.warn(`No originalSurveyRespondents data found for category: ${currentExpectation.category}`);
          }
        }
      } else if (line.startsWith('PRIORITY:')) {
        currentExpectation.priority = line.replace('PRIORITY:', '').trim();
      } else if (line.startsWith('ORIGINAL_DATA:')) {
        currentExpectation.originalData = line.replace('ORIGINAL_DATA:', '').trim();
      } else if (line.startsWith('SOURCE_RESPONSES:')) {
        const responseText = line.replace('SOURCE_RESPONSES:', '').trim();
        // Parse the array format ["quote1", "quote2"]
        try {
          const parsed = JSON.parse(responseText);
          if (Array.isArray(parsed)) {
            currentExpectation.sourceResponses = parsed;
          }
        } catch (e) {
          // Fallback: if not valid JSON, treat as single response
          currentExpectation.sourceResponses = [responseText];
        }
      } else if (line.startsWith('RECOMMENDED_ACTIONS:')) {
        const actionsText = line.replace('RECOMMENDED_ACTIONS:', '').trim();
        // Parse the array format ["action1", "action2", "action3"]
        try {
          const parsed = JSON.parse(actionsText);
          if (Array.isArray(parsed)) {
            currentExpectation.recommendedActions = parsed;
          }
        } catch (e) {
          // Fallback: if not valid JSON, treat as single action
          currentExpectation.recommendedActions = [actionsText];
        }
      } else if (line.startsWith('ORIGINAL_SURVEY_RESPONDENTS:')) {
        const respondentsText = line.replace('ORIGINAL_SURVEY_RESPONDENTS:', '').trim();
        // Parse the array format [{"userId": "...", "surveyId": "...", "originalExpectation": "...", "category": "..."}]
        try {
          const parsed = JSON.parse(respondentsText);
          if (Array.isArray(parsed)) {
            currentExpectation.originalSurveyRespondents = parsed;
          }
        } catch (e) {
          // Fallback: if not valid JSON, try to use the categoryUserData
          console.warn('Failed to parse ORIGINAL_SURVEY_RESPONDENTS from AI response:', e.message);
          // Use the existing categoryUserData as fallback
          const categoryKey = currentExpectation.category.toLowerCase();
          if (categoryUserData[categoryKey]) {
            currentExpectation.originalSurveyRespondents = categoryUserData[categoryKey];
          } else if (categoryUserData[currentExpectation.category]) {
            currentExpectation.originalSurveyRespondents = categoryUserData[currentExpectation.category];
          }
        }
      } else if (line === '---') {
        // Separator - save current expectation
        if (currentExpectation.summary) {
          expectations.push(currentExpectation);
          currentExpectation = {};
        }
      }
    }
    
    // Add the last expectation if exists
    if (currentExpectation.summary) {
      expectations.push(currentExpectation);
    }
    
    // Validate that we have exactly one response per category
    const expectedCount = eligibleCategories.length;
    const actualCount = expectations.length;
    
    if (actualCount < expectedCount) {
      // Only log once per minute to reduce log spam
      const now = Date.now();
      const lastLogTime = global.lastAIWarningTime || 0;
      if (now - lastLogTime > 60000) { // 60 seconds
        console.warn(`AI incomplete response: ${actualCount}/${expectedCount} categories. Adding fallback for missing categories.`);
        global.lastAIWarningTime = now;
      }
      
      // Find categories that don't have responses
      const categoriesWithResponses = new Set(expectations.map(exp => exp.categoryId));
      const missingCategories = eligibleCategories.filter(cat => !categoriesWithResponses.has(cat._id.toString()));
      
      // Add fallback responses for missing categories using actual survey data
      missingCategories.forEach(cat => {
        // Try to find survey responses for this category
        const categoryResponses = categoryExpectations[cat.name.toLowerCase()] || 
                                 categoryExpectations[cat.name] || [];
        
        const fallbackRespondents = categoryUserData[cat.name.toLowerCase()] || categoryUserData[cat.name] || [];
        console.log(`Creating fallback expectation for category ${cat.name} with ${fallbackRespondents.length} originalSurveyRespondents`);
        
        expectations.push({
          summary: `General improvement needed in ${cat.name.toLowerCase()} area`,
          category: cat.name,
          categoryId: cat._id,
          priority: 'Medium',
          originalData: categoryResponses.length > 0 ? 
            `Based on ${categoryResponses.length} survey responses` : 
            'Generated fallback expectation for category with no specific survey data',
          sourceResponses: categoryResponses.length > 0 ? categoryResponses : [],
          recommendedActions: [`Conduct regular team meetings to address ${cat.name.toLowerCase()} concerns`, `Implement feedback mechanisms for continuous improvement`, `Provide training and development opportunities`, `Create clear communication channels`],
          originalSurveyRespondents: fallbackRespondents
        });
      });
    }
    
    // Ensure we don't have duplicates and have exactly the right number
    const uniqueExpectations = [];
    const seenCategories = new Set();
    
    expectations.forEach(exp => {
      if (exp.categoryId && !seenCategories.has(exp.categoryId)) {
        seenCategories.add(exp.categoryId);
        uniqueExpectations.push(exp);
      }
    });
    
    // If we still don't have enough, add more fallbacks
    while (uniqueExpectations.length < expectedCount) {
      const missingCat = eligibleCategories.find(cat => !seenCategories.has(cat._id.toString()));
      if (missingCat) {
        // Try to find survey responses for this category
        const categoryResponses = categoryExpectations[missingCat.name.toLowerCase()] || 
                                 categoryExpectations[missingCat.name] || [];
        
        const finalFallbackRespondents = categoryUserData[missingCat.name.toLowerCase()] || categoryUserData[missingCat.name] || [];
        console.log(`Creating final fallback expectation for category ${missingCat.name} with ${finalFallbackRespondents.length} originalSurveyRespondents`);
        
        uniqueExpectations.push({
          summary: `Focus on improving ${missingCat.name.toLowerCase()} processes and outcomes`,
          category: missingCat.name,
          categoryId: missingCat._id,
          priority: 'Medium',
          originalData: categoryResponses.length > 0 ? 
            `Based on ${categoryResponses.length} survey responses` : 
            'Generated fallback expectation to ensure category coverage',
          sourceResponses: categoryResponses.length > 0 ? categoryResponses : [],
          recommendedActions: [`Conduct regular team meetings to address ${missingCat.name.toLowerCase()} concerns`, `Implement feedback mechanisms for continuous improvement`, `Provide training and development opportunities`, `Create clear communication channels`],
          originalSurveyRespondents: finalFallbackRespondents
        });
        seenCategories.add(missingCat._id.toString());
      } else {
        break;
      }
    }
    
    return uniqueExpectations;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    // Fallback: return one expectation per category using actual survey data
    console.log('Using final fallback parsing - creating expectations for all categories');
    
    return eligibleCategories.map(cat => {
      const categoryResponses = categoryExpectations[cat.name.toLowerCase()] || 
                               categoryExpectations[cat.name] || [];
      const finalFallbackRespondents = categoryUserData[cat.name.toLowerCase()] || categoryUserData[cat.name] || [];
      
      console.log(`Final fallback for category ${cat.name}: ${finalFallbackRespondents.length} originalSurveyRespondents`);
      
      return {
        summary: `General improvement needed in ${cat.name.toLowerCase()} area`,
        category: cat.name,
        categoryId: cat._id,
        priority: 'Medium',
        originalData: categoryResponses.length > 0 ? 
          `Based on ${categoryResponses.length} survey responses (fallback parsing)` : 
          'Based on survey responses (fallback parsing)',
        sourceResponses: categoryResponses.length > 0 ? categoryResponses : [],
        recommendedActions: [`Conduct regular team meetings to address ${cat.name.toLowerCase()} concerns`, `Implement feedback mechanisms for continuous improvement`, `Provide training and development opportunities`, `Create clear communication channels`],
        originalSurveyRespondents: finalFallbackRespondents
      };
    });
  }
}
