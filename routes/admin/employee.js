const express = require("express");
const {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee
} = require("../../controllers/admin/employeeController");
const authMiddleware = require("../../middleware/auth");

const router = express.Router();

router.post('/employee',  createEmployee);
router.get('/employee', authMiddleware, getAllEmployees);
router.get('/employee/:id', authMiddleware, getEmployeeById);
router.put('/employee/:id', authMiddleware, updateEmployee);
router.delete('/employee/:id', authMiddleware, deleteEmployee);

module.exports = router;
