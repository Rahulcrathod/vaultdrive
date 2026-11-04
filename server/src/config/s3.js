import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const LOCAL_VAULT_DIR = path.resolve(__dirname, "../../data/vault");

if (!fs.existsSync(LOCAL_VAULT_DIR)) {
  fs.mkdirSync(LOCAL_VAULT_DIR, { recursive: true });
}

export const isS3Configured = Boolean(
  process.env.AWS_S3_BUCKET &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  !process.env.AWS_S3_BUCKET.includes("YOUR_")
);

export let s3 = null;
if (isS3Configured) {
  s3 = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  console.log("☁️ [Storage] AWS S3 Object Storage configured for bucket:", process.env.AWS_S3_BUCKET);
} else {
  console.log("ℹ️ [Storage] AWS credentials not detected. Using Local Encrypted Object Vault at:", LOCAL_VAULT_DIR);
}

/**
 * Creates an upload target (Presigned URL for S3, or local API endpoint for development)
 */
export async function createUploadUrl(objectKey, contentType = "application/octet-stream") {
  if (isS3Configured && s3) {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: objectKey,
      ContentType: contentType,
      ServerSideEncryption: "AES256"
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });
    return { type: "s3_presigned", uploadUrl: url, method: "PUT" };
  } else {
    // Local development direct upload endpoint
    return {
      type: "local_vault",
      uploadUrl: `/api/files/vault-upload/${encodeURIComponent(objectKey)}`,
      method: "PUT"
    };
  }
}

/**
 * Creates a download target (Presigned URL for S3, or local stream endpoint)
 */
export async function createDownloadUrl(objectKey) {
  if (isS3Configured && s3) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: objectKey
    });
    return await getSignedUrl(s3, command, { expiresIn: 900 });
  } else {
    return `/api/files/vault-download/${encodeURIComponent(objectKey)}`;
  }
}

/**
 * Deletes an object from object storage
 */
export async function deleteObject(objectKey) {
  if (isS3Configured && s3) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: objectKey
    });
    await s3.send(command);
  } else {
    const filePath = path.join(LOCAL_VAULT_DIR, objectKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Verifies object exists and returns size
 */
export async function getObjectMetadata(objectKey) {
  if (isS3Configured && s3) {
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: objectKey
    });
    const res = await s3.send(command);
    return { size: res.ContentLength };
  } else {
    const filePath = path.join(LOCAL_VAULT_DIR, objectKey);
    if (!fs.existsSync(filePath)) {
      throw new Error("Object not found in local vault");
    }
    const stat = fs.statSync(filePath);
    return { size: stat.size };
  }
}
