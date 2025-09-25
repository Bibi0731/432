// src/routes/outputs.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const outputsController = require("../controllers/outputsController");

// ----------------- 路由 -----------------
router.post("/:uploadId", authenticate, outputsController.create);
router.get("/", authenticate, outputsController.getAllMine);

// 注意：要放在 /:id 前面
router.get("/:id/download-link", authenticate, outputsController.getDownloadLink);

router.get("/:id", authenticate, outputsController.getOne);
router.patch("/:id", authenticate, outputsController.update);
router.delete("/:id", authenticate, outputsController.remove);

module.exports = router;
