import mongoose from "mongoose"
import { Category } from "../models/Category.model.js"
import { Department } from "../models/Department.model.js"
// Get all categories
export async function getCategories(req, res) {
  try {
    const categories = await Category.find()
    return res.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return res.status(500).json({ message: "Failed to fetch categories" })
  }
}

// Get category by ID
export async function getCategoryById(req, res) {
  try {
    const category = await Category.findById(req.params.id)

    if (category.length === 0) {
      return res.status(404).json({ message: "Category not found" })
    }

    return res.json(category[0])
  } catch (error) {
    console.error(`Error fetching category ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to fetch category" })
  }
}

// Create a new category
export async function createCategory(req, res) {
  try {
    const { name, description, department:departmentId } = req.body

    if (!name) {
      return res.status(400).json({ message: "Category name and DepartmentId are required" })
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name })
    if (existingCategory) {
      return res.status(409).json({ message: "Category already exists" })
    }
    if (departmentId){
      const department = await Department.findById(departmentId);
      if (!department){
        return res.status(400).json({message :"Invalid Department Id"})
      }
    }

    const category = new Category({
      name,
      description
    })

    if (departmentId){
      category.department = new mongoose.Types.ObjectId(departmentId) 
    }

    await category.save()
    return res.status(201).json(category)
  } catch (error) {
    console.error("Error creating category:", error)
    return res.status(500).json({ message: "Failed to create category" })
  }
}

// Update a category
export async function updateCategory(req, res) {
  try {
    const { name, description, departmentId } = req.body

    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    if (name) category.name = name
    if (description !== undefined) category.description = description
    if (departmentId){
      const department = await Department.findById(departmentId);
      if (!department){
        return res.status(400).json({message :"Invalid Department Id"})
      }
      category.department = new mongoose.Types.ObjectId(departmentId)
    }

    await category.save()
    
    return res.json(category)
  } catch (error) {
    console.error(`Error updating category ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to update category" })
  }
}

// Delete a category
export async function deleteCategory(req, res) {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    await category.deleteOne()

    return res.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error(`Error deleting category ${req.params.id}:`, error)
    return res.status(500).json({ message: "Failed to delete category" })
  }
}
