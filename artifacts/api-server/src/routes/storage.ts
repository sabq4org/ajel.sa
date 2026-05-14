import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  StorageQuotaExceededError,
} from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * GET /storage/quota
 *
 * Returns current Object Storage usage and quota information.
 * Useful for admin dashboards to monitor storage consumption.
 */
router.get("/storage/quota", async (req: Request, res: Response) => {
  try {
    const usage = await objectStorageService.getStorageUsage();
    res.json(usage);
  } catch (error) {
    req.log.error({ err: error }, "Error fetching storage quota");
    res.status(500).json({ error: "Failed to fetch storage quota" });
  }
});

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 *
 * Enforces site-wide storage quota before issuing the URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const usage = await objectStorageService.checkQuota(size);

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    const responseBody = RequestUploadUrlResponse.parse({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    });

    if (usage.isNearLimit) {
      req.log.warn(
        { percentUsed: usage.percentUsed.toFixed(1) },
        "Storage quota near limit"
      );
      res.set("X-Storage-Warning", "quota_near_limit");
    }

    res.json({ ...responseBody, storageWarning: usage.isNearLimit ? "quota_near_limit" : null });
  } catch (error) {
    if (error instanceof StorageQuotaExceededError) {
      req.log.warn({ err: error }, "Upload rejected: storage quota exceeded");
      res.status(507).json({
        error: "storage_quota_exceeded",
        message: error.message,
      });
      return;
    }
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * DELETE /storage/objects/*
 *
 * Permanently remove an object entity from the bucket. Used by ajelsa's
 * media-deletion endpoint so deletes propagate beyond the DB row and the
 * underlying GCS file is actually freed (otherwise quota grows silently).
 *
 * Internal-only: requires the shared `SESSION_SECRET` to be supplied as a
 * bearer token in the `X-Internal-Token` header. Both ajelsa and api-server
 * run in the same container and share this secret, so external callers (who
 * cannot read the env var) cannot delete arbitrary objects even though the
 * route is exposed on the same /api prefix as the read routes.
 *
 * Returns 204 on success, 401 on missing/invalid token, 404 if the object
 * is already gone.
 */
router.delete("/storage/objects/*path", async (req: Request, res: Response) => {
  const expected = process.env.SESSION_SECRET;
  const provided = req.header("x-internal-token");
  if (!expected || !provided || provided !== expected) {
    req.log.warn("Storage DELETE rejected: invalid or missing internal token");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    await objectStorageService.deleteObjectEntity(objectPath);
    res.status(204).end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object delete: already gone");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error deleting object");
    res.status(500).json({ error: "Failed to delete object" });
  }
});

export default router;
