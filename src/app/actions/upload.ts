'use server'

import { nanoid } from 'nanoid';
import { logToDb } from '@/lib/logger';
import { syncUser } from '@/lib/user-auth';

// AWS V4 signing requires encoding ALL chars except: A-Z a-z 0-9 - _ . ~
// encodeURIComponent leaves ( ) ! ~ * ' unencoded, which causes signature mismatches.
function awsUriEncode(str: string): string {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// Manual AWS V4 Signer for R2 requests (avoids bulky S3 SDK and fs.readFile issues)
async function signR2Url({
    bucket,
    key,
    method,
    contentType = "",
    accessKeyId,
    secretAccessKey,
    endpoint,
}: {
    bucket: string;
    key: string;
    method: "PUT" | "DELETE";
    contentType?: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
}) {
    const region = "auto";
    const service = "s3";
    const expires = 3600;

    const host = new URL(endpoint).host;
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = datetime.slice(0, 8);
    
    const encodedKey = key.split('/').map(awsUriEncode).join('/');
    const canonicalUri = `/${bucket}/${encodedKey}`;
    const credentialScope = `${date}/${region}/${service}/aws4_request`;

    const queryParams: Record<string, string> = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
        "X-Amz-Date": datetime,
        "X-Amz-Expires": expires.toString(),
        "X-Amz-SignedHeaders": method === "PUT" ? "content-type;host" : "host",
    };

    const canonicalQuerystring = Object.entries(queryParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");

    const canonicalHeaders = method === "PUT" 
        ? `content-type:${contentType}\nhost:${host}\n`
        : `host:${host}\n`;
    const signedHeaders = method === "PUT" ? "content-type;host" : "host";
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
    const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credentialScope}\n${Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")}`;
    
    const signature = await hmac(kSigning, stringToSign);
    const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");

    return `${endpoint}/${bucket}/${encodedKey}?${canonicalQuerystring}&X-Amz-Signature=${signatureHex}`;
}


export async function getPresignedUploadUrl(fileName: string, contentType: string) {
    // In Guest/UTM flow, a user might not have a db record yet.
    // They obtain the presigned URL, upload, and THEN createSong() creates their shadow account.
    // Security: The presigned URL is limited to a single unique file key and method.
    // Identity verification happens in createSong stage.
    await syncUser();

    // Sanitize fileName: replace spaces with underscores, strip chars that can break AWS signing
    const sanitizedName = fileName
        .replace(/\s+/g, '_')
        .replace(/[()[\]!~*'",;@$&+=]/g, '_')
        .replace(/_+/g, '_');  // collapse multiple underscores
    const fileKey = `${nanoid()}-${sanitizedName}`;
    const url = await signR2Url({
        bucket: process.env.R2_BUCKET_NAME!,
        key: fileKey,
        method: "PUT",
        contentType,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        endpoint: process.env.R2_ENDPOINT!,
    });
    return { url, fileKey };
}

export async function deleteFileFromR2(fileKey: string) {
    if (!fileKey) return { success: false, error: "Missing file key" };

    try {
        const url = await signR2Url({
            bucket: process.env.R2_BUCKET_NAME!,
            key: fileKey,
            method: "DELETE",
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
            endpoint: process.env.R2_ENDPOINT!,
        });

        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`R2 Delete failed: ${res.status} ${res.statusText} - ${errorText}`);
        }

        return { success: true };
    } catch (error) {
        await logToDb({ message: "R2 deletion error", data: error, source: "upload.ts:deleteFileFromR2" });
        return { success: false, error: "Failed to delete from R2" };
    }
}
