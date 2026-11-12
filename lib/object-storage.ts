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

type BucketKind = "private" | "public";

const clients = new Map<BucketKind, S3Client>();
const PUBLIC_PREFIXES = ["user-media/", "video-posts/"] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for object storage.`);
  return value;
}

function bucketName(kind: BucketKind): string {
  const name = required(kind === "private" ? "S3_BUCKET" : "S3_PUBLIC_BUCKET");
  if (kind === "public" && name === required("S3_BUCKET")) {
    throw new Error("S3_PUBLIC_BUCKET must be a dedicated bucket, different from private S3_BUCKET.");
  }
  return name;
}

function getClient(kind: BucketKind): S3Client {
  const cached = clients.get(kind);
  if (cached) return cached;

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

  const client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    ...(endpoint ? { endpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false" } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
  clients.set(kind, client);
  return client;
}

function validateKey(key: string): void {
  if (!key || key.startsWith("/") || key.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("Object key must be a non-empty relative path.");
  }
}

function isAllowedPublicKey(key: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function encodedKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function publicObjectUrl(key: string): string {
  validateKey(key);
  if (!isAllowedPublicKey(key)) {
    throw new Error("Only user-media/ and video-posts/ objects may be stored in public object storage.");
  }
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
  await getClient("private").send(
    new PutObjectCommand({
      Bucket: bucketName("private"),
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
  await getClient("public").send(
    new PutObjectCommand({
      Bucket: bucketName("public"),
      Key: key,
      Body: body,
      ...(options.contentType ? { ContentType: options.contentType } : {}),
    }),
  );
  return { url };
}

export async function getObject(key: string): Promise<Buffer | null> {
  validateKey(key);
  try {
    const response = await getClient("private").send(
      new GetObjectCommand({ Bucket: bucketName("private"), Key: key }),
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
  await getClient("private").send(
    new DeleteObjectCommand({ Bucket: bucketName("private"), Key: key }),
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
  const response = await getClient("private").send(
    new ListObjectsV2Command({
      Bucket: bucketName("private"),
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
