import mongoose from "mongoose"
import { Department } from "../models/Department.model.js"
import {SIPOC} from "../models/SIPOC.model.js"
import { deleteFileFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { logSIPOCEvent } from "../utils/logger.js"

// Get SIPOC by department
export async function getSIPOCByDepartment(req, res) {
  try {
    const { departmentId } = req.query

    if (!departmentId) {
      return res.status(400).json({ message: "DepartmentId parameter is required" })
    }

    const department = await Department.findById(departmentId)
    if(!department){
      return res.status(404).json({message :"Invalid DepartmentId"})
    }

    const sipoc = await SIPOC.aggregate([{ 
      $match :{
        department :new mongoose.Types.ObjectId(departmentId)
       }
      }])

    if (!sipoc) {
      return res.status(404).json({ message: "SIPOC not found for this department" })
    }

    // Log the view action
    await logSIPOCEvent('SIPOC_VIEWED', { department: departmentId }, req.user, req)

    return res.json(sipoc)
  } catch (error) {
    console.error("Error fetching SIPOC:", error)
    // Log the error
    await logSIPOCEvent('SIPOC_VIEWED', { department: req.query.departmentId }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to fetch SIPOC data" })
  }
}

export async function getSIPOCById(req, res) {
  try {
    const sipoc = await SIPOC.findById(req.params.id )

    if (!sipoc) {
      return res.status(404).json({ message: "SIPOC not found" })
    }

    // Log the view action
    await logSIPOCEvent('SIPOC_VIEWED', sipoc, req.user, req)

    return res.json(sipoc)
  } catch (error) {
    console.error("Error fetching SIPOC:", error)
    // Log the error
    await logSIPOCEvent('SIPOC_VIEWED', { _id: req.params.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to fetch SIPOC data" })
  }
}

// Create SIPOC
export async function createSIPOC(req, res) {
  try {
    let { departmentId, entries } = req.body

    console.log('Received SIPOC data:', { departmentId, entries });

    if (!departmentId || !entries) {
      return res.status(400).json({ message: "DepartmentId and entries are required" })
    }

    const department = await Department.findById(departmentId)
    if(!department){
      return res.status(404).json({message :"Invalid DepartmentId"})
    }

    const processLocalPath = req.files?.processPicture ? req.files?.processPicture[0].path : "";
    
    let processFile ="";
    if (processLocalPath){
      processFile = await uploadOnCloudinary(processLocalPath);
    }
    entries = JSON.parse(entries);
    console.log('Parsed entries:', entries);
    
    entries = {
      ...entries, 
      process: {
        ...entries.process,
        file: processFile.url || "",
        input: entries?.process?.input || ""
      }
    };
    
    console.log('Final entries to save:', entries);
    
    const sipoc = await SIPOC.create({ department : new mongoose.Types.ObjectId(departmentId), entries })

    // Log the creation
    await logSIPOCEvent('SIPOC_CREATED', sipoc, req.user, req, 'SUCCESS')

    return res.json(sipoc)
  } catch (error) {
    console.error("Error creating SIPOC:", error)
    // Log the error
    await logSIPOCEvent('SIPOC_CREATED', { department: req.body.departmentId }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to create SIPOC data" })
  }
}

//Update SIPOC
export async function updateSIPOC(req, res) {
  try {
    let { entries } = req.body
    if (!req.params.id){
      return res.status(400).json({message : "SIPOC Id is required"})
    }
    const sipoc = await SIPOC.findById( req.params.id);
    if (!sipoc){
      return res.status(404).json({message : "SIPOC not found"})
    }
    entries = JSON.parse(entries)
    
    const newProcessLocalPath = req?.files?.processPicture ? req.files?.processPicture[0].path : "";
    if (newProcessLocalPath){
      if (entries?.process?.file){
        await deleteFileFromCloudinary(entries?.process?.file)
      }
      const newProcessFile = await uploadOnCloudinary(newProcessLocalPath);
      entries = {...entries, process : {...entries.process , file : newProcessFile.url, input : entries.process?.input} };
    }

    sipoc.entries = entries;
    await sipoc.save()

    // Log the update
    await logSIPOCEvent('SIPOC_UPDATED', sipoc, req.user, req, 'SUCCESS')

    return res.json(sipoc)
  } catch (error) {
    console.error("Error updating SIPOC:", error)
    // Log the error
    await logSIPOCEvent('SIPOC_UPDATED', { _id: req.params.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to update SIPOC data" })
  }
}

// Delete SIPOC
export async function deleteSIPOC(req, res) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ message: "id parameter is required" })
    }

    const sipoc = await SIPOC.findById(id);
    if(!sipoc){
      return res.status(404).json({message : "SIPOC does not exist"})
    }

    const processFile = sipoc?.entries?.process?.file || ""

    if (processFile) await deleteFileFromCloudinary(processFile);

    const result = await SIPOC.deleteOne({ _id : new mongoose.Types.ObjectId(id) })

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "SIPOC not found for this department" })
    }

    // Log the deletion
    await logSIPOCEvent('SIPOC_DELETED', sipoc, req.user, req, 'SUCCESS')

    return res.json({ message: "SIPOC deleted successfully" })
  } catch (error) {
    console.error("Error deleting SIPOC:", error)
    // Log the error
    await logSIPOCEvent('SIPOC_DELETED', { _id: req.query.id }, req.user, req, 'FAILURE', error.message)
    return res.status(500).json({ message: "Failed to delete SIPOC data" })
  }
}
