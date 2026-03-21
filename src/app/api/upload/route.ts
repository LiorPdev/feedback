import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = 'edge';

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
    try {
        const { fileName, contentType } = await request.json();
        
        if (!fileName || !contentType) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const fileKey = `${nanoid()}-${fileName}`;
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: contentType,
        });

        const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
        return NextResponse.json({ url, fileKey });
    } catch (error) {
        console.error('API Upload error:', error);
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }
}
