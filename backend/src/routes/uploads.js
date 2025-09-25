const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const uploadsController = require("../controllers/uploadsController");
const upload = require("../middleware/upload"); // 👈 用我们写的本地 tmp/ 版本

// 路由（全部需要登录）
router.post("/", authenticate, upload.single("file"), uploadsController.create);
router.get("/", authenticate, uploadsController.getAllMine);
router.get("/:id", authenticate, uploadsController.getOne);
router.patch("/:id", authenticate, uploadsController.update);
router.delete("/:id", authenticate, uploadsController.remove);
router.get("/:id/download-link", authenticate, uploadsController.getDownloadLink);

module.exports = router;
