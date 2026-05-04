import {Department} from "../models/Department.model.js"

// Get all departments
export async function getDepartments(req, res) {
  try {
    const departments = await Department.find()
    return res.json(departments)
  } catch (error) {
    console.error("Error fetching departments:", error)
    return res.status(500).json({ message: "Failed to fetch departments" })
  }
}

// Get department by ID
export async function getDepartmentById(req, res) {
  try {
    const department = await Department.findById(req.params.id)

    if (!department) {
      return res.status(404).json({ message: "Department not found" })
    }

    return res.json(department)
  } catch (error) {
    console.error(`Error fetching department ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to fetch department" })
  }
}

// Create a new department
export async function createDepartment(req, res) {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ message: "Department name is required" })
    }

    // Check if department already exists
    const existingDepartment = await Department.findOne({ name })
    if (existingDepartment) {
      return res.status(409).json({ message: "Department already exists" })
    }

    const department = new Department({
      name,
      description,
    })

    await department.save()

    return res.status(201).json(department)
  } catch (error) {
    console.error("Error creating department:", error)
    return res.status(500).json({ message: "Failed to create department" })
  }
}

// Update a department
export async function updateDepartment(req, res) {
  try {
    const { name, description } = req.body

    const department = await Department.findById(req.params.id)

    if (!department) {
      return res.status(404).json({ message: "Department not found" })
    }

    if (name) department.name = name
    if (description !== undefined) department.description = description

    await department.save()

    return res.json(department)
  } catch (error) {
    console.error(`Error updating department ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to update department" })
  }
}

// Delete a department
export async function deleteDepartment(req, res) {
  try {
    const department = await Department.findById(req.params.id)

    if (!department) {
      return res.status(404).json({ message: "Department not found" })
    }

    await department.deleteOne()

    return res.json({ message: "Department deleted successfully" })
  } catch (error) {
    console.error(`Error deleting department ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to delete department" })
  }
}
