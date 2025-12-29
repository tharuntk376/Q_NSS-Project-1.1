// const express = require("express")
// const { createShift, getAllShift, getShiftById, deleteShift, } = require("../../controllers/admin/ShiftController");
// const { model } = require("mongoose");

// const router = express.Router();

// router.post("/shift", createShift);
// router.get("/shift", getAllShift);
// router.get("/shift/:id", getShiftById);
// router.delete("/shift/:id", deleteShift);

// module.exports = router;



 // 🔐 Protected
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/auth");
const {
  createShift,
  getAllShift,
  getShiftById,
  updateShift,
  deleteShift,
} = require("../../controllers/admin/ShiftController");

// Protected routes
router.post("/shift", authMiddleware, createShift);
router.get("/shift", authMiddleware, getAllShift);
router.get("/shift/:id", authMiddleware, getShiftById);
router.put("/shift/:id", authMiddleware, updateShift);
router.delete("/shift/:id", authMiddleware, deleteShift);

module.exports = router;
