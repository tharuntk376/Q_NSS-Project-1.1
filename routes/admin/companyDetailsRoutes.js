const express = require('express');

// const {
//   createCompanydetails,
//   getAllCompanies,
//   getCompanyById,
//   updateCompany,
//   deleteCompany,
//   getCompanyByEmployeeId,
// } = require('../../controllers/admin/Company_details');

const {
  createCompanydetails,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getActiveJobsByEmployeeId,
  getCompletedJobsByEmployeeId,
  getEmployeeCalendar,
} = require('../../controllers/admin/Company_details');
const authMiddleware = require('../../middleware/auth');

const router = express.Router();

// Admin  // employee id
router.post('/customer', authMiddleware, createCompanydetails);
router.get('/customer', authMiddleware, getAllCompanies);
router.get('/customer/:id', authMiddleware, getCompanyById);
router.put('/customer/:id', authMiddleware, updateCompany);
router.delete('/customer/:id', authMiddleware, deleteCompany);
// router.get('/customer_single/:id', authMiddleware, getCompanyByEmployeeId);
router.get('/customer_single/active/:id', authMiddleware, getActiveJobsByEmployeeId);
router.get('/customer_single/completed/:id', authMiddleware, getCompletedJobsByEmployeeId);

// App  // employee id
// router.get('/app/customer/:id', authMiddleware, getCompanyByEmployeeId);
router.get('/app/customer/active/:id', authMiddleware, getActiveJobsByEmployeeId);
router.get('/app/customer/completed/:id', authMiddleware, getCompletedJobsByEmployeeId);
router.get('/app/customer/calendar/:id', authMiddleware, getEmployeeCalendar);

module.exports = router;
