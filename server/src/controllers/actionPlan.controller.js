import mongoose from "mongoose"
import {ActionPlan} from "../models/ActionPlan.model.js"
import {User} from "../models/User.model.js"
import {Department} from "../models/Department.model.js"
import {Category} from "../models/Category.model.js"
import {sendActionPlanAssignmentEmail} from "../utils/emailService.js"

// Helper function to send emails in background without blocking the response
const sendEmailInBackground = async (emailFunction, ...args) => {
  // Use setImmediate to run in the next tick of the event loop
  setImmediate(async () => {
    try {
      await emailFunction(...args)
    } catch (error) {
      console.error('Background email sending failed:', error)
    }
  })
}

// Get all action plans (admin only, with filters)
export async function getActionPlansForAdmin(req, res) {
  try {
    const { departmentId, status, categoryId, assignedTo, finalStatus } = req.query
    const filters = {}
    
    // Handle department filter - check if action plan contains the department
    if (departmentId) {
      filters.departments = new mongoose.Types.ObjectId(departmentId)
    }
    
    // Handle category filter - check if action plan contains the category
    if (categoryId) {
      filters.categories = new mongoose.Types.ObjectId(categoryId)
    }
    
    // Handle final status filter
    if (finalStatus) {
      filters.finalStatus = finalStatus
    }
    
    // Handle assigned user filter - check if user is in assignedTo array
    if (assignedTo) {
      filters.assignedTo = new mongoose.Types.ObjectId(assignedTo)
    }
    
    // Handle individual user status filter
    if (status && assignedTo) {
      // This is complex with the new schema - would need to check the status map
      // For now, we'll handle this in a different way if needed
    }
    
    const plans = await ActionPlan.find(filters)
      .populate('departments')
      .populate('impactedDepartments')
      .populate('categories')
      .populate('assignedBy', 'name email role currentDepartment')
      .populate('assignedTo', 'name email role currentDepartment')
    
    // Convert Map to Object for JSON serialization
    const serializedPlans = plans.map(plan => {
      const planObj = plan.toObject()
      if (planObj.individualActionPlans) {
        planObj.individualActionPlans = Object.fromEntries(planObj.individualActionPlans)
      }
      if (planObj.status) {
        planObj.status = Object.fromEntries(planObj.status)
      }
      if (planObj.actions_taken) {
        planObj.actions_taken = Object.fromEntries(planObj.actions_taken)
      }
      return planObj
    })
    
    return res.json(serializedPlans)
  } catch (error) {
    console.error("Error fetching action plans (admin):", error)
    return res.status(500).json({ message: "Failed to fetch action plans" })
  }
}

// Get all action plans for HOD's current department
export async function getActionPlansForHOD(req, res) {
  try {
    const departmentId = req.user.currentDepartment
    if (!departmentId) return res.status(400).json({ message: "No current department found for HOD" })
    
    // Find action plans that include the HOD's department
    const plans = await ActionPlan.find()
      .populate('departments')
      .populate('impactedDepartments')
      .populate('categories') 
      .populate('assignedBy', 'name email role currentDepartment')
      .populate('assignedTo', 'name email role currentDepartment')
      .then(plans => plans.filter(plan => 
        plan.departments.length > 0 && 
        plan.departments[0]._id.toString() === departmentId.toString()
      ))
    
    // Convert Map to Object for JSON serialization
    const serializedPlans = plans.map(plan => {
      const planObj = plan.toObject()
      if (planObj.individualActionPlans) {
        planObj.individualActionPlans = Object.fromEntries(planObj.individualActionPlans)
      }
      if (planObj.status) {
        planObj.status = Object.fromEntries(planObj.status)
      }
      if (planObj.actions_taken) {
        planObj.actions_taken = Object.fromEntries(planObj.actions_taken)
      }
      return planObj
    })
    
    return res.json(serializedPlans)
  } catch (error) {
    console.error("Error fetching action plans (HOD):", error)
    return res.status(500).json({ message: "Failed to fetch action plans" })
  }
}

// Get all action plans assigned to the current user
export async function getActionPlansForUser(req, res) {
  try {
    const userId = req.user._id
    const plans = await ActionPlan.find({ assignedTo: userId })
      .populate('departments')
      .populate('impactedDepartments')
      .populate('categories')
      .populate('assignedBy', 'name email role currentDepartment')
      .populate('assignedTo', 'name email role currentDepartment')
    
    // Convert Map to Object for JSON serialization
    const serializedPlans = plans.map(plan => {
      const planObj = plan.toObject()
      if (planObj.individualActionPlans) {
        planObj.individualActionPlans = Object.fromEntries(planObj.individualActionPlans)
      }
      if (planObj.status) {
        planObj.status = Object.fromEntries(planObj.status)
      }
      if (planObj.actions_taken) {
        planObj.actions_taken = Object.fromEntries(planObj.actions_taken)
      }
      return planObj
    })
    
    // serializedPlans.forEach((plan, index) => {
    //   console.log(`Plan ${index + 1}:`, {
    //     id: plan._id,
    //     status: plan.status,
    //     actions_taken: plan.actions_taken,
    //     assignedTo: plan.assignedTo,
    //     individualActionPlans: plan.individualActionPlans
    //   });
    // });
    
    return res.json(serializedPlans)
  } catch (error) {
    console.error("Error fetching action plans (user):", error)
    return res.status(500).json({ message: "Failed to fetch action plans" })
  }
}

// Get action plans where the current user is an original survey respondent
export async function getActionPlansForSurveyRespondent(req, res) {
  try {
    const userId = req.user._id
    const plans = await ActionPlan.find({ 
      'originalSurveyRespondents.userId': userId 
    })
      .populate('departments')
      .populate('impactedDepartments')
      .populate('categories')
      .populate('assignedBy', 'name email role currentDepartment')
      .populate('assignedTo', 'name email role currentDepartment')
      .sort({ createdAt: -1 })
    
    const formattedPlans = plans.map(plan => {
      const planObj = plan.toObject()
      const respondentData = plan.originalSurveyRespondents.find(
        respondent => String(respondent.userId) === String(userId)
      )
      
      // Convert Map to Object for JSON serialization
      if (planObj.individualActionPlans) {
        planObj.individualActionPlans = Object.fromEntries(planObj.individualActionPlans)
      }
      if (planObj.status) {
        planObj.status = Object.fromEntries(planObj.status)
      }
      if (planObj.actions_taken) {
        planObj.actions_taken = Object.fromEntries(planObj.actions_taken)
      }
      
      return {
        ...planObj,
        respondentData: respondentData, 
      }
    })
    
    return res.json(formattedPlans)
  } catch (error) {
    console.error("Error fetching action plans for survey respondent:", error)
    return res.status(500).json({ message: "Failed to fetch action plans" })
  }
}

// Create a new action plan (HOD or admin) - now supports multiple users and individual action plans
export async function createActionPlan(req, res) {
  try {
    const { 
      departmentIds, 
      impactedDepartmentIds,
      categoryIds, 
      expectations, 
      actionplan, 
      instructions, 
      assignedToUsers, 
      targetDate, 
      originalSurveyRespondents,
      individualActionPlans
    } = req.body
    
    // Validate required fields
    if (!departmentIds || !categoryIds || !expectations || !actionplan || !assignedToUsers || !targetDate) {
      return res.status(400).json({ message: "Missing required fields" })
    }
    
    // Ensure arrays
    const departments = Array.isArray(departmentIds) ? departmentIds : [departmentIds]
    const impactedDepartments = Array.isArray(impactedDepartmentIds) ? impactedDepartmentIds : (impactedDepartmentIds ? [impactedDepartmentIds] : [])
    const categories = Array.isArray(categoryIds) ? categoryIds : [categoryIds]
    const assignedTo = Array.isArray(assignedToUsers) ? assignedToUsers : [assignedToUsers]
    
    if (assignedTo.length === 0) {
      return res.status(400).json({ message: "At least one user must be assigned" })
    }
    
    // Initialize status and actions_taken maps
    const statusMap = new Map()
    const actionsTakenMap = new Map()
    
    // Set default status for all assigned users
    assignedTo.forEach(userId => {
      statusMap.set(userId.toString(), "pending")
      actionsTakenMap.set(userId.toString(), "")
    })
    
    // Process individual action plans if provided - store both userName and actionPlan
    const individualPlansMap = new Map()
    if (individualActionPlans && typeof individualActionPlans === 'object') {
      for (const [userId, actionPlan] of Object.entries(individualActionPlans)) {
        if (userId && actionPlan) {
          // Find the user to get their name
          const user = await User.findById(userId).select('name')
          const userName = user ? user.name : 'Unknown User'
          individualPlansMap.set(userId, {
            userName: userName,
            actionPlan: actionPlan
          })
        }
      }
    }

    const plan = new ActionPlan({
      departments: departments.map(id => new mongoose.Types.ObjectId(id)),
      impactedDepartments: impactedDepartments.map(id => new mongoose.Types.ObjectId(id)),
      categories: categories.map(id => new mongoose.Types.ObjectId(id)),
      expectations,
      actionplan,
      instructions,
      assignedBy: req.user._id,
      assignedTo: assignedTo.map(id => new mongoose.Types.ObjectId(id)),
      targetDate: new Date(targetDate),
      status: statusMap,
      actions_taken: actionsTakenMap,
      finalStatus: "pending",
      originalSurveyRespondents: originalSurveyRespondents || [],
      individualActionPlans: individualPlansMap
    })
    
    await plan.save()
    
    // Send email notifications to all assigned users in background
    const assignedByUser = await User.findById(req.user._id).select('name email')
    
    // Get department names for email
    const departmentNames = []
    const impactedDepartmentNames = []
    
    for (const deptId of departments) {
      const dept = await Department.findById(deptId).select('name')
      if (dept) departmentNames.push(dept.name)
    }
    
    for (const deptId of impactedDepartments) {
      const dept = await Department.findById(deptId).select('name')
      if (dept) impactedDepartmentNames.push(dept.name)
    }
    
    sendEmailInBackground(async () => {
      try {
        for (const userId of assignedTo) {
          try {
            const assignedUser = await User.findById(userId).select('name email')
            if (assignedUser && assignedByUser) {
              await sendActionPlanAssignmentEmail(assignedUser, plan, assignedByUser, departmentNames, impactedDepartmentNames)
              console.log(`Action plan assignment email sent to: ${assignedUser.email}`)
            }
          } catch (emailError) {
            console.error(`Error sending email to user ${userId}:`, emailError)
          }
        }
      } catch (error) {
        console.error("Error sending assignment emails:", error)
      }
    })
    
    // Send confirmation email to HOD who created the action plan
    sendEmailInBackground(async () => {
      try {
        // Get assigned users details
        const assignedUsers = await User.find({ _id: { $in: assignedTo } }).select('name email')
        
        // Get department and category names
        const departmentNames = []
        const categoryNames = []
        
        for (const deptId of departments) {
          const dept = await Department.findById(deptId).select('name')
          if (dept) departmentNames.push(dept.name)
        }
        
        for (const catId of categories) {
          const cat = await Category.findById(catId).select('name')
          if (cat) categoryNames.push(cat.name)
        }
        
        if (assignedByUser) {
          await sendActionPlanCreationConfirmationEmail(
            assignedByUser, 
            plan, 
            assignedUsers, 
            departmentNames, 
            categoryNames,
            impactedDepartmentNames
          )
         console.log(`Action plan creation confirmation email sent to HOD: ${assignedByUser.email}`)
        }
      } catch (error) {
        console.error("Error sending HOD confirmation email:", error)
      }
    })
    
    // Send notifications to original survey respondents in background
    
     //commenting out creation notification to the user for whose survey this plan is created
    // if (originalSurveyRespondents && originalSurveyRespondents.length > 0) {
    //   sendEmailInBackground(async () => {
    //     try {
    //       // Get department and category names for notifications
    //       const departmentNames = []
    //       const categoryNames = []
          
    //       for (const deptId of departments) {
    //         const dept = await Department.findById(deptId).select('name')
    //         if (dept) departmentNames.push(dept.name)
    //       }
          
    //       for (const catId of categories) {
    //         const cat = await Category.findById(catId).select('name')
    //         if (cat) categoryNames.push(cat.name)
    //       }
          
    //       if (departmentNames.length > 0 && categoryNames.length > 0) {
    //         for (const respondentData of originalSurveyRespondents) {
    //           try {
    //             const respondentUser = await User.findById(respondentData.userId).select('name email')
    //             if (respondentUser) {
    //               await sendActionPlanCreatedNotification(
    //                 respondentUser, 
    //                 plan, 
    //                 departmentNames.join(", "), 
    //                 categoryNames.join(", "),
    //                 impactedDepartmentNames
    //               )
    //               console.log(`Notification sent to survey respondent: ${respondentUser.email}`)
    //             }
    //           } catch (notificationError) {
    //             console.error(`Error sending notification to ${respondentData.userId}:`, notificationError)
    //           }
    //         }
    //       }
    //     } catch (notificationError) {
    //       console.error("Error sending notifications to survey respondents:", notificationError)
    //     }
    //   })
    // }
    
    return res.status(201).json(plan)
  } catch (error) {
    console.error("Error creating action plan:", error)
    return res.status(500).json({ message: "Failed to create action plan" })
  }
}


// Update an action plan (admin, HOD or assigned user)
export async function updateActionPlan(req, res) {
  try {
    const { 
      departments, 
      impactedDepartments,
      categories, 
      expectations, 
      actionplan, 
      instructions, 
      assignedToUsers, 
      targetDate, 
      status, 
      actions_taken, 
      finalStatus 
    } = req.body
    
    const plan = await ActionPlan.findById(req.params.id)
    if (!plan) {
      return res.status(404).json({ message: "Action plan not found" })
    }
    
    // Store the original values to check for changes
    const originalAssignedTo = plan.assignedTo;
    const originalStatus = plan.status;
    const originalFinalStatus = plan.finalStatus;
    
    // Authorization: allow HODs, admins, or assigned user (with restrictions)
    const isAdmin = req.user.role === 'admin';
    const isHOD = req.user.role === 'hod';
    const isAssignedUser = plan.assignedTo.some(userId => String(userId) === String(req.user._id));
    
    if (!isAdmin && !isHOD && !isAssignedUser) {
      return res.status(403).json({ message: "Not authorized to update this action plan" })
    }
    
    // Check if target date has passed (only HOD can update after target date)
    const now = new Date();
    const isAfterTargetDate = now > plan.targetDate;
    
    // Only allow assigned user to update their own 'actions_taken' and 'status'
    if (isAssignedUser && !isAdmin && !isHOD) {
      if (isAfterTargetDate) {
        return res.status(403).json({ message: "Target date has passed. Contact hod to extend the target date." })
      }
      
      if (actions_taken !== undefined) {
        plan.actions_taken.set(req.user._id.toString(), actions_taken);
      }
      if (status !== undefined) {
        plan.status.set(req.user._id.toString(), status);
      }
      // Block all other fields for assigned users
    } else {
      // HOD and Admin can update all fields
      if (departments) plan.departments = departments.map(id => new mongoose.Types.ObjectId(id))
      if (impactedDepartments) plan.impactedDepartments = impactedDepartments.map(id => new mongoose.Types.ObjectId(id))
      if (categories) plan.categories = categories.map(id => new mongoose.Types.ObjectId(id))
      if (expectations) plan.expectations = expectations
      if (actionplan !== undefined) plan.actionplan = actionplan
      if (instructions) plan.instructions = instructions
      if (targetDate) plan.targetDate = new Date(targetDate)
      if (finalStatus !== undefined) plan.finalStatus = finalStatus
      
      // Update status and actions_taken for specific users if provided
      if (status && typeof status === 'object') {
        Object.keys(status).forEach(userId => {
          plan.status.set(userId, status[userId])
        })
      }
      
      if (actions_taken && typeof actions_taken === 'object') {
        Object.keys(actions_taken).forEach(userId => {
          plan.actions_taken.set(userId, actions_taken[userId])
        })
      }
      
      // Handle assignment changes
      if (assignedToUsers) {
        const newAssignedTo = Array.isArray(assignedToUsers) ? assignedToUsers : [assignedToUsers]
        
        // Find newly assigned users
        const originalAssignedIds = plan.assignedTo.map(id => id.toString())
        const newAssignedIds = newAssignedTo.map(id => id.toString())
        const newlyAssigned = newAssignedIds.filter(id => !originalAssignedIds.includes(id))
        
        // Update assigned users
        plan.assignedTo = newAssignedTo.map(id => new mongoose.Types.ObjectId(id))
        
        // Initialize status and actions_taken for newly assigned users
        newlyAssigned.forEach(userId => {
          plan.status.set(userId, "pending")
          plan.actions_taken.set(userId, "")
        })
        
        // Send email notifications to newly assigned users
        if (newlyAssigned.length > 0) {
          const assignedByUser = await User.findById(req.user._id).select('name email')
          sendEmailInBackground(async () => {
            try {
              for (const userId of newlyAssigned) {
                try {
                  const assignedUser = await User.findById(userId).select('name email')
                  if (assignedUser && assignedByUser) {
                    await sendActionPlanAssignmentEmail(assignedUser, plan, assignedByUser)
                    console.log(`Action plan assignment email sent to new user: ${assignedUser.email}`)
                  }
                } catch (emailError) {
                  console.error(`Error sending email to newly assigned user ${userId}:`, emailError)
                }
              }
            } catch (error) {
              console.error("Error sending assignment emails to new users:", error)
            }
          })
        }
      }
    }
    
    await plan.save()
    
    // Convert Map to Object for JSON serialization
    const planObj = plan.toObject()
    if (planObj.individualActionPlans) {
      planObj.individualActionPlans = Object.fromEntries(planObj.individualActionPlans)
    }
    if (planObj.status) {
      planObj.status = Object.fromEntries(planObj.status)
    }
    if (planObj.actions_taken) {
      planObj.actions_taken = Object.fromEntries(planObj.actions_taken)
    }
    
    // Regular status updates by assigned users don't trigger notifications
    // Only finalStatus changes by HOD trigger notifications (handled below)
    
    // Send final status change notifications to original survey respondents (in background)\
    //commenting out the feature to send status update notification to the user whose survey was used to create the acdtion plan
    // if (finalStatus !== undefined && finalStatus !== originalFinalStatus && plan.originalSurveyRespondents.length > 0) {
    //   sendEmailInBackground(async () => {
    //     try {
    //       // Get department and category names for notifications
    //       const departmentNames = []
    //       const categoryNames = []
          
    //       for (const deptId of plan.departments) {
    //         const dept = await Department.findById(deptId).select('name')
    //         if (dept) departmentNames.push(dept.name)
    //       }
          
    //       for (const catId of plan.categories) {
    //         const cat = await Category.findById(catId).select('name')
    //         if (cat) categoryNames.push(cat.name)
    //       }
          
    //       // Get impacted department names for notifications
    //       const impactedDepartmentNames = []
    //       for (const deptId of plan.impactedDepartments) {
    //         const dept = await Department.findById(deptId).select('name')
    //         if (dept) impactedDepartmentNames.push(dept.name)
    //       }


    //       if (departmentNames.length > 0 && categoryNames.length > 0) {
    //         for (const respondentData of plan.originalSurveyRespondents) {
    //           try {
    //             const respondentUser = await User.findById(respondentData.userId).select('name email')
    //             if (respondentUser) {
    //               await sendFinalStatusChangeNotification(
    //                 respondentUser,
    //                 plan,
    //                 departmentNames.join(", "),
    //                 categoryNames.join(", "),
    //                 originalFinalStatus,
    //                 finalStatus,
    //                 impactedDepartmentNames
    //               )
    //               console.log(`Final status change notification sent to survey respondent: ${respondentUser.email}`)
    //             }
    //           } catch (notificationError) {
    //             console.error(`Error sending final status change notification to ${respondentData.userId}:`, notificationError)
    //           }
    //         }
    //       }
    //     } catch (notificationError) {
    //       console.error("Error sending final status change notifications to survey respondents:", notificationError)
    //     }
    //   })
    // }
    
    return res.json(planObj)
  } catch (error) {
    console.error(`Error updating action plan ${req.params.id}:`, error)
    console.error('User:', req.user)
    console.error('Body:', req.body)
    return res.status(500).json({ message: "Failed to update action plan", error: error?.message, stack: error?.stack })
  }
}

// User updates status and actions_taken of their assigned action plan
export async function updateActionPlanStatus(req, res) {
  try {
    const { status, actions_taken } = req.body
    const plan = await ActionPlan.findById(req.params.id)
    if (!plan) {
      return res.status(404).json({ message: "Action plan not found" })
    }
    
    // Check if user is assigned to this action plan
    const isAssignedUser = plan.assignedTo.some(userId => String(userId) === String(req.user._id))
    if (!isAssignedUser) {
      return res.status(403).json({ message: "Not authorized to update this action plan" })
    }
    
    // Check if target date has passed - only HOD can update after target date
    const now = new Date();
    const isAfterTargetDate = now > plan.targetDate;
    const isHOD = req.user.role === 'hod' || req.user.role === 'admin';
    
    if (isAfterTargetDate && !isHOD) {
      return res.status(403).json({ 
        message: "Target date has passed. Contact HOD to extend target date.",
        targetDate: plan.targetDate,
        currentDate: now
      })
    }
    
    // Use userId from request body if provided, otherwise use the authenticated user's ID
    const userId = req.body.userId ? req.body.userId.toString() : req.user._id.toString();
    
    console.log('Status update - User ID:', userId);
    console.log('Status update - Request body:', req.body);
    console.log('Status update - Current plan status map:', plan.status);
    console.log('Status update - Current plan actions_taken map:', plan.actions_taken);
    
    // Store the original status to check for changes
    const originalStatus = plan.status.get(userId) || "pending";
    
    // Update user's status and actions_taken
    if (status !== undefined) {
      plan.status.set(userId, status)
      console.log('Updated status for user', userId, 'to', status);
    }
    if (actions_taken !== undefined) {
      plan.actions_taken.set(userId, actions_taken)
      console.log('Updated actions_taken for user', userId, 'to', actions_taken);
    }
    
    await plan.save()
    
    // Convert Map to Object for JSON serialization
    const planObj = plan.toObject()
    if (planObj.individualActionPlans) {
      planObj.individualActionPlans = Object.fromEntries(planObj.individualActionPlans)
    }
    if (planObj.status) {
      planObj.status = Object.fromEntries(planObj.status)
    }
    if (planObj.actions_taken) {
      planObj.actions_taken = Object.fromEntries(planObj.actions_taken)
    }
    
    // Regular status updates by assigned users don't trigger notifications
    // Only finalStatus changes by HOD trigger notifications to survey respondents
    
    return res.json(planObj)
  } catch (error) {
    console.error(`Error updating action plan status ${req.params.id}:`, error)
    console.error('User:', req.user)
    console.error('Body:', req.body)
    return res.status(500).json({ message: "Failed to update action plan status", error: error?.message, stack: error?.stack })
  }
}

// Delete an action plan (admin or HOD)
export async function deleteActionPlan(req, res) {
  try {
    const plan = await ActionPlan.findById(req.params.id)
    if (!plan) {
      return res.status(404).json({ message: "Action plan not found" })
    }

    // Authorization: allow admins to delete any action plan, HODs can only delete plans from their current department
    const isAdmin = req.user.role === 'admin';
    const isHOD = req.user.role === 'hod';
    
    if (!isAdmin && !isHOD) {
      return res.status(403).json({ message: "Access denied (Only Admins and HODs are permitted)" })
    }
    
    // If user is HOD (not admin), check if the action plan includes their current department
    if (isHOD && !isAdmin) {
      const hodCurrentDepartment = req.user.currentDepartment;
      if (!hodCurrentDepartment) {
        return res.status(400).json({ message: "No current department found for HOD" })
      }
      
      // Check if the HOD's department is in the action plan's departments array
      const includesHodDepartment = plan.departments.some(deptId => 
        String(deptId) === String(hodCurrentDepartment)
      );
      
      if (!includesHodDepartment) {
        return res.status(403).json({ message: "Access denied (HOD can only delete action plans that include their current department)" })
      }
    }

    // Import the ArchivedActionPlan model
    const { default: ArchivedActionPlan } = await import('../models/ArchivedActionPlan.model.js');
    
    // Create archive record
    const archivedPlan = new ArchivedActionPlan({
      // Copy all original fields
      departments: plan.departments,
      impactedDepartments: plan.impactedDepartments,
      categories: plan.categories,
      assignedBy: plan.assignedBy,
      assignedTo: plan.assignedTo,
      expectations: plan.expectations,
      actionplan: plan.actionplan,
      instructions: plan.instructions,
      actions_taken: plan.actions_taken,
      status: plan.status,
      finalStatus: plan.finalStatus,
      targetDate: plan.targetDate,
      originalSurveyRespondents: plan.originalSurveyRespondents,
      
      // Archive-specific fields
      originalId: plan._id,
      archivedBy: req.user._id,
      archiveReason: req.body.archiveReason || "Action plan deleted",
      originalCreatedAt: plan.createdAt,
      originalUpdatedAt: plan.updatedAt
    });

    // Save the archived plan
    await archivedPlan.save();
    
    // Remove from original collection
    await plan.deleteOne();
    
    console.log(`Action plan ${req.params.id} archived successfully by user ${req.user._id}`);
    
    return res.json({ 
      message: "Action plan archived successfully",
      archivedPlanId: archivedPlan._id,
      originalId: plan._id
    })
  } catch (error) {
    console.error(`Error deleting action plan ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to delete action plan" })
  }
}

// Get individual action plans for a specific user
export async function getIndividualActionPlansForUser(req, res) {
  try {
    const userId = req.user._id
    console.log('Fetching individual action plans for user:', userId);
    
    const plans = await ActionPlan.find({ 
      [`individualActionPlans.${userId}`]: { $exists: true }
    })
      .populate('departments')
      .populate('impactedDepartments')
      .populate('categories')
      .populate('assignedBy', 'name email role currentDepartment')
      .populate('assignedTo', 'name email role currentDepartment')
    
    // Filter to only include individual plans for this user
    const userIndividualPlans = []
    plans.forEach(plan => {
      const userIndividualPlan = plan.individualActionPlans.get(userId.toString())
      if (userIndividualPlan) {
        userIndividualPlans.push({
          ...plan.toObject(),
          individualActionPlan: {
            userId: userId,
            userName: userIndividualPlan.userName,
            actionPlan: userIndividualPlan.actionPlan
          }
        })
      }
    })
    
    console.log('Found', userIndividualPlans.length, 'individual action plans for user');
    return res.json(userIndividualPlans)
  } catch (error) {
    console.error("Error fetching individual action plans (user):", error)
    return res.status(500).json({ message: "Failed to fetch individual action plans" })
  }
}


// Test email configuration (admin only)
export async function testEmailConfig(req, res) {
  try {
    const { testEmailConfiguration } = await import("../utils/emailService.js")
    const result = await testEmailConfiguration()
    
    if (result.success) {
      return res.json({ message: "Email configuration is valid", success: true })
    } else {
      return res.status(500).json({ 
        message: "Email configuration error", 
        error: result.error,
        success: false 
      })
    }
  } catch (error) {
    console.error("Error testing email configuration:", error)
    return res.status(500).json({ 
      message: "Failed to test email configuration", 
      error: error.message,
      success: false 
    })
  }
}
