const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan("dev"));

// 静态文件（视频文件）
app.use("/uploads", express.static(path.join(process.cwd(), "data/uploads")));
app.use("/outputs", express.static(path.join(process.cwd(), "data/outputs")));

// 前端静态文件 (注意这里路径要回退两级)
app.use("/", express.static(path.join(__dirname, "..", "..", "frontend")));

// 路由 (保持和旧版一样的前缀)
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

const uploadsRoutes = require("./routes/uploads");
app.use("/uploads", uploadsRoutes);

const outputsRoutes = require("./routes/outputs");
app.use("/outputs", outputsRoutes);

// 端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
