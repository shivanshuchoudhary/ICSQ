import mongoose from "mongoose"
import { DepartmentMapping } from "../models/DepartmentMapping.model.js"
import { Department } from "../models/Department.model.js"

// Get all department mappings
export async function getDepartmentMappings(req, res) {
  try {
    const mappings = await DepartmentMapping.find()
      .populate('department', 'name')
      .populate('reviewerDepartments', 'name')

    return res.json(mappings)
  } catch (error) {
    console.error("Error fetching department mappings:", error)
    return res.status(500).json({ message: "Failed to fetch department mappings" })
  }
}

// Get mapping by department ID
export async function getDepartmentMappingById(req, res) {
  try {
    const mapping = await DepartmentMapping.findOne({ department: req.params.id })
      .populate('department', 'name')
      .populate('reviewerDepartments', 'name')

    if (!mapping) {
      return res.status(404).json({ message: "Department mapping not found" })
    }

    return res.json(mapping)
  } catch (error) {
    console.error(`Error fetching department mapping ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to fetch department mapping" })
  }
}

// Create or update department mapping
export async function updateDepartmentMapping(req, res) {
  try {
    const { departmentId, reviewerDepartments } = req.body;

    // Basic validation
    if (!departmentId || !Array.isArray(reviewerDepartments)) {
      return res.status(400).json({ message: "Department ID and reviewer departments array are required" });
    }

    // Convert IDs to ObjectIds and validate them
    let departmentObjectId;
    try {
      departmentObjectId = new mongoose.Types.ObjectId(departmentId);
    } catch (error) {
      return res.status(400).json({ message: "Invalid department ID format" });
    }

    let reviewerDepartmentObjectIds;
    try {
      reviewerDepartmentObjectIds = reviewerDepartments.map(id => new mongoose.Types.ObjectId(id));
    } catch (error) {
      return res.status(400).json({ message: "Invalid reviewer department ID format" });
    }

    // Validate department exists
    const department = await Department.findById(departmentObjectId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Validate reviewer departments
    if (reviewerDepartments.length > 0) {
      // Check for self-review
      if (reviewerDepartments.includes(departmentId)) {
        return res.status(400).json({ message: "A department cannot review itself" });
      }

      // Validate all reviewer departments exist
      const validDepartments = await Department.find({
        _id: { $in: reviewerDepartmentObjectIds }
      });

      if (validDepartments.length !== reviewerDepartments.length) {
        return res.status(400).json({ message: "One or more reviewer department IDs are invalid" });
      }
    }

    // Use findOneAndUpdate with upsert to either update existing mapping or create new one
    const mapping = await DepartmentMapping.findOneAndUpdate(
      { department: departmentObjectId },
      { 
        department: departmentObjectId,
        reviewerDepartments: reviewerDepartmentObjectIds 
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );

    // Populate and return the mapping
    const populatedMapping = await DepartmentMapping.findById(mapping._id)
      .populate('department', 'name')
      .populate('reviewerDepartments', 'name');

    return res.json(populatedMapping);
  } catch (error) {
    console.error("Error updating department mapping:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Department mapping already exists",
        details: error.message 
      });
    }

    return res.status(500).json({ 
      message: "Failed to update department mapping",
      error: error.message 
    });
  }
}

// Delete department mapping
export async function deleteDepartmentMapping(req, res) {
  try {
    const mapping = await DepartmentMapping.findOne({ department: req.params.id })

    if (!mapping) {
      return res.status(404).json({ message: "Department mapping not found" })
    }

    await mapping.deleteOne()
    return res.json({ message: "Department mapping deleted successfully" })
  } catch (error) {
    console.error(`Error deleting department mapping ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to delete department mapping" })
  }
} 
