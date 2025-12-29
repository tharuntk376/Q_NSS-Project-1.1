const express = require("express");
const {
  createTalent,
  getAllTalents,
  getTalentById,
  updateTalent,
  deleteTalent
} = require("../../controllers/admin/talentController");
const authMiddleware = require("../../middleware/auth");

const router = express.Router();

router.post('/talent', authMiddleware, createTalent);
router.get('/talent', authMiddleware, getAllTalents);
router.get('/talent/:id', authMiddleware, getTalentById);
router.put('/talent/:id', authMiddleware, updateTalent);
router.delete('/talent/:id', authMiddleware, deleteTalent);

module.exports = router;