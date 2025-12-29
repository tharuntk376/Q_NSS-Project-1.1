const express = require("express");
const {
  createFrequency,
  getAllFrequencies,
  getFrequencyById,
  updateFrequency,
  deleteFrequency,
} = require("../../controllers/admin/FrequencyController");
const authMiddleware = require("../../middleware/auth");

const router = express.Router();

router.post("/frequency", authMiddleware, createFrequency);
router.get("/frequency", authMiddleware, getAllFrequencies);
router.get("/frequency/:id", authMiddleware, getFrequencyById);
router.put("/frequency/:id", authMiddleware, updateFrequency);
router.delete("/frequency/:id", authMiddleware, deleteFrequency);

module.exports = router;
