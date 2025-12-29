const express = require("express");
const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} = require("../../controllers/admin/ServiceController");
const authMiddleware = require("../../middleware/auth");

const router = express.Router();

router.post("/service", authMiddleware, createService);
router.get("/service", authMiddleware, getAllServices);
router.get("/service/:id", authMiddleware, getServiceById);
router.put("/service/:id", authMiddleware, updateService);
router.delete("/service/:id", authMiddleware, deleteService);

module.exports = router;
