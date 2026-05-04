import express from 'express';
import { getHODDashboardData } from '../controllers/hodDashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get HOD Dashboard data for a specific department
router.get('/:departmentId', requireAuth, getHODDashboardData);

export default router;

