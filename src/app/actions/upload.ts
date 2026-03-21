'use server'

import { nanoid } from 'nanoid';



// Manual AWS V4 Signer for R2 PUT requests (avoids bulky S3 SDK and fs.readFile issues)
async function signR2PutUrl({
    bucket,
    key,
    contentType,
    accessKeyId,
    secretAccessKey,
    endpoint,
}: {
    bucket: string;
    key: string;
    contentType: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
}) {
    const region = "auto";
    const service = "s3";
    const method = "PUT";
    const expires = 3600;

    const host = new URL(endpoint).host;
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = datetime.slice(0, 8);
    
    const canonicalUri = `/${bucket}/${key}`;
    const canonicalQuerystring = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(
        `${accessKeyId}/${date}/${region}/${service}/aws4_request`
    )}&X-Amz-Date=${datetime}&X-Amz-Expires=${expires}&X-Amz-SignedHeaders=content-type%3Bhost`;

    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
    const signedHeaders = "content-type;host";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    const encode = (s: string) => new TextEncoder().encode(s);
    const hmac = async (key: CryptoKey | ArrayBuffer, data: string) => {
        const k = key instanceof ArrayBuffer 
            ? await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
            : key;
        return crypto.subtle.sign("HMAC", k, encode(data));
    };

    const kDate = await hmac(encode(`AWS4${secretAccessKey}`).buffer, date);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, "aws4_request");

    const hash = await crypto.subtle.digest("SHA-256", encode(canonicalRequest));
    const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${date}/${region}/${service}/aws4_request\n${Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")}`;
    
    const signature = await hmac(kSigning, stringToSign);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");

    return `${endpoint}/${bucket}/${key}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`;
}

export async function getPresignedUploadUrl(fileName: string, contentType: string) {
    const fileKey = `${nanoid()}-${fileName}`;
    const url = await signR2PutUrl({
        bucket: process.env.R2_BUCKET_NAME!,
        key: fileKey,
        contentType,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        endpoint: process.env.R2_ENDPOINT!,
    });
    return { url, fileKey };
}
