const express = require("express");
const router = express.Router();
const completedJobController = require("../../controllers/admin/completedJobController");
const authMiddleware = require("../../middleware/auth");

// Get completed jobs for a specific employee
router.get("/completedjobs/employee/:employeeId", authMiddleware, completedJobController.getCompletedJobsByEmployee);

// Get all completed jobs
router.get("/completedalljobs", authMiddleware, completedJobController.getAllCompletedJobs);

module.exports = router;
