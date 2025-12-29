const express = require("express");
const router = express.Router();
const upload = require("../../middleware/multer");

const {
  createPrivacyPolicy,
  getPrivacyPolicies,
  getPrivacyPolicyById,
  updatePrivacyPolicy,
  deletePrivacyPolicy,
} = require("../../controllers/admin/PrivacyPolicyController");

router.post("/privacy", upload.single("privacy_policy_file"), createPrivacyPolicy);

router.get("/privacy",  upload.single("privacy_policy_file"), getPrivacyPolicies);
router.get("/privacy/:id", getPrivacyPolicyById);
router.put("/privacy/:id", upload.single("privacy_policy_file"), updatePrivacyPolicy);
router.delete("/privacy/:id", deletePrivacyPolicy);

module.exports = router;
