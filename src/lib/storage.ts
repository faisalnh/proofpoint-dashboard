import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// MinIO S3 client configuration
const s3Client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
    region: "us-east-1", // MinIO doesn't care about region, but SDK requires it
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true, // Required for MinIO
});

const BUCKET_NAME = process.env.MINIO_BUCKET || "evidence";

export interface UploadResult {
    key: string;
    url: string;
}

/**
 * Upload a file to MinIO S3
 */
export async function uploadFile(
    file: Buffer,
    fileName: string,
    userId: string,
    contentType: string
): Promise<UploadResult> {
    const timestamp = Date.now();
    const key = `${userId}/${timestamp}_${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
    });

    await s3Client.send(command);

    // Generate public URL
    const url = `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${key}`;

    return { key, url };
}

/**
 * Get a signed URL for file download (expires in 1 hour)
 */
export async function getSignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(key: string): string {
    return `${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

/**
 * Delete a file from MinIO S3
 */
export async function deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
}

export { s3Client, BUCKET_NAME };
