// src/controllers/outputsController.js
const outputModel = require('../models/outputModel');
const uploadModel = require('../models/uploadModel');
const ffmpeg = require('fluent-ffmpeg');
const { getPaging, paginateArray } = require('../utils/pagination');

const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream");
const { promisify } = require("util");

const streamPipeline = promisify(pipeline);

const bucketName = process.env.S3_BUCKET || "a2-group31-videos";
const region = process.env.AWS_REGION || "ap-southeast-2";
const s3 = new S3Client({ region });

const TMP_DIR = os.tmpdir();

// 工具函数：保存 S3 对象到本地
async function saveS3ObjectToFile(responseBody, localPath) {
    const writeStream = fs.createWriteStream(localPath);
    await streamPipeline(responseBody, writeStream);
}

// ---------------- 创建转码结果 ----------------
async function create(req, res) {
    const ownerId = req.user.userId;
    const uploadId = req.params.uploadId;
    const { displayName, note } = req.body;

    const upload = uploadModel.getById(uploadId);
    if (!upload || String(upload.ownerId) !== String(ownerId)) {
        return res.status(404).json({ error: "Upload not found" });
    }

    const localSrc = path.join(TMP_DIR, `${Date.now()}-src.mp4`);
    const localOut = path.join(TMP_DIR, `${Date.now()}-out.mp4`);

    try {
        // 1. 从 S3 下载源文件
        const response = await s3.send(
            new GetObjectCommand({
                Bucket: bucketName,
                Key: upload.filename,
            })
        );
        await saveS3ObjectToFile(response.Body, localSrc);

        // 2. ffmpeg 转码
        ffmpeg(localSrc)
            .outputOptions([
                "-c:v libx264",
                "-preset fast",
                "-crf 28",
                "-c:a aac",
                "-b:a 128k",
            ])
            .on("end", async () => {
                try {
                    const fileBuffer = fs.readFileSync(localOut);
                    const outKey = `outputs/${Date.now()}-${path.basename(localOut)}`;

                    // 3. 上传到 S3
                    await s3.send(
                        new PutObjectCommand({
                            Bucket: bucketName,
                            Key: outKey,
                            Body: fileBuffer,
                            ContentType: "video/mp4",
                        })
                    );

                    // 4. 删除临时文件
                    try { fs.unlinkSync(localSrc); } catch { }
                    try { fs.unlinkSync(localOut); } catch { }

                    // 5. 存储到模型
                    const newOutput = outputModel.create({
                        ownerId,
                        uploadId,
                        filename: outKey,
                        originalName: upload.originalName,
                        mimeType: "video/mp4",
                        size: fileBuffer.length,
                        displayName:
                            displayName || `${upload.displayName || upload.originalName} (transcoded)`,
                        note: note || "",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });

                    return res.status(201).json({
                        message: "Transcode complete",
                        output: newOutput,
                    });
                } catch (err) {
                    console.error("Upload to S3 failed:", err);
                    return res.status(500).json({ error: "Failed to upload transcoded file" });
                }
            })
            .on("error", (err) => {
                console.error("FFmpeg error:", err);
                try { fs.unlinkSync(localSrc); } catch { }
                try { fs.unlinkSync(localOut); } catch { }
                return res.status(500).json({ error: "Transcoding failed", details: err.message });
            })
            .save(localOut);

    } catch (err) {
        console.error("Download from S3 failed:", err);
        return res.status(500).json({ error: "Could not download source file" });
    }
}

// ---------------- 获取所有转码结果 ----------------
function getAllMine(req, res) {
    const ownerId = req.user.userId;
    const items = outputModel.getByOwner(ownerId);
    const paging = getPaging(req, { defaultPageSize: 5, maxPageSize: 100 });

    const q = (req.query.q || "").toLowerCase();
    const filtered = q
        ? items.filter(
            (x) =>
                (x.displayName || "").toLowerCase().includes(q) ||
                (x.originalName || "").toLowerCase().includes(q)
        )
        : items;

    const result = paginateArray(filtered, paging);

    res.json({
        items: result.items,
        page: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
    });
}

// ---------------- 获取单个转码结果 ----------------
function getOne(req, res) {
    const ownerId = req.user.userId;
    const item = outputModel.getById(req.params.id);
    if (!item || String(item.ownerId) !== String(ownerId)) {
        return res.status(404).json({ error: "Not found" });
    }
    res.json(item);
}

// ---------------- 更新转码元数据 ----------------
function update(req, res) {
    const ownerId = req.user.userId;
    const updated = outputModel.update(req.params.id, ownerId, req.body);
    if (updated === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (!updated) return res.status(404).json({ error: "Not found" });

    res.json({ message: "Output updated", output: updated });
}

// ---------------- 删除转码结果 ----------------
async function remove(req, res) {
    const ownerId = req.user.userId;
    const removed = outputModel.remove(req.params.id, ownerId);
    if (removed === "forbidden") return res.status(403).json({ error: "Forbidden" });
    if (!removed) return res.status(404).json({ error: "Not found" });

    try {
        await s3.send(
            new DeleteObjectCommand({
                Bucket: bucketName,
                Key: removed.filename,
            })
        );
    } catch (err) {
        console.error("S3 delete error:", err);
    }

    res.json({ message: "Output deleted", deleted: removed });
}

// ---------------- 获取下载链接 ----------------
async function getDownloadLink(req, res) {
    const ownerId = req.user.userId;
    const item = outputModel.getById(req.params.id);

    if (!item || String(item.ownerId) !== String(ownerId)) {
        return res.status(404).json({ error: "Not found" });
    }

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: item.filename,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        res.json({ downloadUrl: url });
    } catch (err) {
        console.error("Presign error:", err);
        res.status(500).json({ error: "Could not generate download link" });
    }
}

// ---------------- 导出 ----------------
module.exports = {
    create,
    getAllMine,
    getOne,
    update,
    remove,
    getDownloadLink,
};
