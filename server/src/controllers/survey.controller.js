import mongoose from "mongoose"
import {Survey} from "../models/Survey.model.js"
import { User } from "../models/User.model.js"
import { Department } from "../models/Department.model.js"
import { logSurveyEvent } from "../utils/logger.js"

// Get all surveys with optional filters
export async function getSurveys(req, res) {
  try {
    const { fromDepartmentId, toDepartmentId } = req.query

    const filters = {}
    if (fromDepartmentId) filters.fromDepartment = new mongoose.Types.ObjectId(fromDepartmentId)
    if (toDepartmentId) filters.toDepartment = new mongoose.Types.ObjectId(toDepartmentId)

    const surveys = await Survey.find(filters)
    
    // Log the view action
    await logSurveyEvent('SURVEY_VIEWED', { fromDepartment: fromDepartmentId, toDepartment: toDepartmentId }, req.user, req)
    
    return res.json(surveys)
  } catch (error) {
    console.error("Error fetching surveys:", error)
    // Log the error
    await logSurveyEvent('SURVEY_VIEWED', { fromDepartment: req.query.fromDepartmentId, toDepartment: req.query.toDepartmentId }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to fetch surveys" })
  }
}

// Get survey by ID
export async function getSurveyById(req, res) {
  try {
    const survey = await Survey.findById(req.params.id)

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" })
    }

    // Log the view action
    await logSurveyEvent('SURVEY_VIEWED', survey, req.user, req)

    return res.json(survey)
  } catch (error) {
    console.error(`Error fetching survey ${req.params.id}:`, error)
    // Log the error
    await logSurveyEvent('SURVEY_VIEWED', { _id: req.params.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to fetch survey" })
  }
}

// Create a new survey
export async function createSurvey(req, res) {
  try {
    const { userId, fromDepartmentId, toDepartmentId, responses, date } = req.body

    if (!userId || !fromDepartmentId || !toDepartmentId || !responses) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const user = await User.findById(userId);

    if (!user){
      return res.status(404).json({message : "Invalid UserId"})
    }
  
    const surveyedDepartmentIds = user.surveyedDepartmentIds;

    const survey = new Survey({
      userId,
      fromDepartment :fromDepartmentId,
      toDepartment :toDepartmentId,
      responses,
      date: date ? new Date(date) : new Date(),
    })

    await survey.save()

    const updatedSurveyedDepartmentIds = [...surveyedDepartmentIds, toDepartmentId];
    await User.updateOne(
      { _id: userId },
      { $set: { surveyedDepartmentIds: updatedSurveyedDepartmentIds } }
    );

    // Log the creation
    await logSurveyEvent('SURVEY_CREATED', survey, req.user, req, 'SUCCESS')

    return res.status(201).json(survey)
  } catch (error) {
    console.error("Error creating survey:", error)
    // Log the error
    await logSurveyEvent('SURVEY_CREATED', { userId: req.body.userId, fromDepartment: req.body.fromDepartmentId, toDepartment: req.body.toDepartmentId }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to create survey" })
  }
}

// Update a survey
export async function updateSurvey(req, res) {
  try {
    const { fromDepartmentId, toDepartmentId, responses, date } = req.body

    const survey = await Survey.findById(req.params.id)

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" })
    }

    if (fromDepartmentId) survey.fromDepartment = new mongoose.Types.ObjectId(fromDepartmentId)
    if (toDepartmentId) survey.toDepartment = new mongoose.Types.ObjectId(toDepartmentId)
    if (responses) survey.responses = responses
    if (date) survey.date = new Date(date)

    await survey.save()

    // Log the update
    await logSurveyEvent('SURVEY_UPDATED', survey, req.user, req, 'SUCCESS')

    return res.json(survey)
  } catch (error) {
    console.error(`Error updating survey ${req.params.id}:`, error)
    // Log the error
    await logSurveyEvent('SURVEY_UPDATED', { _id: req.params.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to update survey" })
  }
}

// Delete a survey
export async function deleteSurvey(req, res) {
  try {
    const survey = await Survey.findById(req.params.id)

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" })
    }

    await User.findByIdAndUpdate(
      {
         _id : survey.userId
      },
      {
        $pull: { surveyedDepartmentIds: survey.toDepartment }
      }    
    )  

    await survey.deleteOne()

    // Log the deletion
    await logSurveyEvent('SURVEY_DELETED', survey, req.user, req, 'SUCCESS')

    return res.json({ message: "Survey deleted successfully" })
  } catch (error) {
    console.error(`Error deleting survey ${req.params.id}:`, error)
    // Log the error
    await logSurveyEvent('SURVEY_DELETED', { _id: req.params.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to delete survey" })
  }
}

// Get detailed survey analytics
export async function getSurveyAnalytics(req, res) {
  try {
    const surveys = await Survey.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "fromDepartment",
          foreignField: "_id",
          as: "fromDepartmentInfo"
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "toDepartment",
          foreignField: "_id",
          as: "toDepartmentInfo"
        }
      },
      {
        $addFields: {
          userName: { $arrayElemAt: ["$user.name", 0] },
          fromDepartmentName: { $arrayElemAt: ["$fromDepartmentInfo.name", 0] },
          toDepartmentName: { $arrayElemAt: ["$toDepartmentInfo.name", 0] }
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          userName: 1,
          fromDepartmentId: "$fromDepartment",
          toDepartmentId: "$toDepartment",
          fromDepartmentName: 1,
          toDepartmentName: 1,
          responses: 1,
          date: 1
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    // Log the analytics view
    await logSurveyEvent('SURVEY_ANALYTICS_VIEWED', { count: surveys.length }, req.user, req, 'SUCCESS')

    return res.json(surveys);
  } catch (error) {
    console.error("Error fetching survey analytics:", error);
    // Log the error
    await logSurveyEvent('SURVEY_ANALYTICS_VIEWED', {}, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to fetch survey analytics" });
  }
}
