const express = require("express");
const {
  createPropertyType,
  getAllPropertyTypes,
  getPropertyTypeById,
  updatePropertyType,
  deletePropertyType,
} = require("../../controllers/admin/PropertyTypeController");
const authMiddleware = require("../../middleware/auth");

const router = express.Router();

router.post("/property_type", authMiddleware, createPropertyType);
router.get("/property_type", authMiddleware, getAllPropertyTypes);
router.get("/property_type/:id", authMiddleware, getPropertyTypeById);
router.put("/property_type/:id", authMiddleware, updatePropertyType);
router.delete("/property_type/:id", authMiddleware, deletePropertyType);

module.exports = router;
