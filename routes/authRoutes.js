const express = require("express");
const router = express.Router();
const multer = require("multer");
const { register, login } = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

const upload = multer();

const populateFarmData = (req, res, next) => {
  req.farmData = req.body || {};
  next();
};

router.post("/register", authMiddleware, upload.none(), populateFarmData, register);
router.post("/login", upload.none(), populateFarmData, login);

module.exports = router;
