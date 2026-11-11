import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type StoredObjectOptions = {
  contentType?: string;
};

type ObjectPage = {
  keys: string[];
  nextCursor?: string;
};

let client: S3Client | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for object storage.`);
  return value;
}

function getClient(): S3Client {
  if (client) return client;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error("Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or neither to use the host's default credentials.");
  }
  if (endpoint) {
    let parsedEndpoint: URL;
    try {
      parsedEndpoint = new URL(endpoint);
    } catch {
      throw new Error("S3_ENDPOINT must be a valid HTTP or HTTPS URL.");
    }
    if (
      (parsedEndpoint.protocol !== "https:" && parsedEndpoint.protocol !== "http:") ||
      parsedEndpoint.username ||
      parsedEndpoint.password ||
      parsedEndpoint.search ||
      parsedEndpoint.hash
    ) {
      throw new Error("S3_ENDPOINT must use HTTP or HTTPS.");
    }
  }

  client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    ...(endpoint ? { endpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false" } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
  return client;
}

function bucketName(): string {
  return required("S3_BUCKET");
}

function validateKey(key: string): void {
  if (!key || key.startsWith("/") || key.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("Object key must be a non-empty relative path.");
  }
}

function encodedKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function publicObjectUrl(key: string): string {
  validateKey(key);
  const base = required("S3_PUBLIC_BASE_URL").replace(/\/+$/, "");
  const parsed = new URL(base);
  if (parsed.protocol !== "https:" && process.env.NODE_ENV !== "development") {
    throw new Error("S3_PUBLIC_BASE_URL must use HTTPS outside development.");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("S3_PUBLIC_BASE_URL must not include a query string or fragment.");
  }
  return `${base}/${encodedKey(key)}`;
}

export function isPublicObjectUrlForPrefix(value: string, prefix: string): boolean {
  try {
    const base = new URL(required("S3_PUBLIC_BASE_URL"));
    const candidate = new URL(value);
    if (
      (base.protocol !== "https:" && process.env.NODE_ENV !== "development") ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    ) {
      return false;
    }
    const basePath = base.pathname.replace(/\/+$/, "");
    const expectedPrefix = `${basePath}/${encodedKey(prefix)}/`;
    return (
      candidate.protocol === base.protocol &&
      candidate.host === base.host &&
      candidate.pathname.startsWith(expectedPrefix) &&
      !candidate.search &&
      !candidate.hash
    );
  } catch {
    return false;
  }
}

export async function putObject(
  key: string,
  body: Uint8Array | string,
  options: StoredObjectOptions = {},
): Promise<void> {
  validateKey(key);
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: body,
      ...(options.contentType ? { ContentType: options.contentType } : {}),
    }),
  );
}

export async function putPublicObject(
  key: string,
  body: Uint8Array | string,
  options: StoredObjectOptions = {},
): Promise<{ url: string }> {
  const url = publicObjectUrl(key);
  await putObject(key, body, options);
  return { url };
}

export async function getObject(key: string): Promise<Buffer | null> {
  validateKey(key);
  try {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: key }),
    );
    if (!response.Body) return null;
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "$metadata" in error &&
      error.$metadata &&
      typeof error.$metadata === "object" &&
      "httpStatusCode" in error.$metadata &&
      error.$metadata.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function deleteObject(key: string): Promise<void> {
  validateKey(key);
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucketName(), Key: key }),
  );
}

export async function listObjectKeys(
  prefix: string,
  cursor?: string,
  limit = 1000,
): Promise<ObjectPage> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("Object listing limit must be between 1 and 1000.");
  }
  const response = await getClient().send(
    new ListObjectsV2Command({
      Bucket: bucketName(),
      Prefix: prefix,
      MaxKeys: limit,
      ...(cursor ? { ContinuationToken: cursor } : {}),
    }),
  );
  return {
    keys: (response.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key)),
    ...(response.IsTruncated && response.NextContinuationToken
      ? { nextCursor: response.NextContinuationToken }
      : {}),
  };
}
