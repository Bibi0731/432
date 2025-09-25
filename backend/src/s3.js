// src/s3.js
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    // credentials 不要写，SDK 会自动用 aws sso login 的缓存
});

module.exports = s3;