const express = require("express");
const router = express.Router();
const jobController = require("../../controllers/admin/jobController");
const upload = require("../../middleware/multer");
const authMiddleware = require("../../middleware/auth");

router.post(
  "/job/start",
  authMiddleware,
  upload.none(),
  jobController.startJob
);
router.post(
  "/job/stop",
  authMiddleware,
  upload.array("images", 10),
  jobController.stopJob
);
router.post(
  "/submit/images",
  authMiddleware,
  upload.array("images", 10),
  jobController.submitImages
);
router.get(
  "/employee/:id/jobs",
  authMiddleware,
  jobController.getCompanyByEmployeeId
);

module.exports = router;



// const express = require("express");
// const router = express.Router();
// const jobController = require("../../controllers/admin/jobController");
// const upload = require("../../middleware/multer");

// // Start / Stop / Submit Images
// router.post("/job/start", upload.none(), jobController.startJob);
// router.post("/job/stop", upload.none(), jobController.stopJob);
// // router.post("/submit/images", upload.array("images"), jobController.submitImages);

// module.exports = router;

// routes/admin/jobRoutes.js