import cors from "cors";
import crypto from "node:crypto";
import express, { type ErrorRequestHandler } from "express";
import { verifyMessage } from "ethers";
import helmet from "helmet";
import multer from "multer";
import { env } from "./config/env.js";
import { isDatabaseConnected } from "./config/db.js";
import {
  addAsset,
  createAccessRequest,
  findAsset,
  getIdentity,
  grantPermission,
  listAccessRequests,
  listAssets,
  listIssuers,
  listPermissions,
  markRegistered,
  revokePermission,
  updateIdentity,
  logAudit,
} from "./data/store.js";
import { storePrivateDocument } from "./services/storage.js";
import { createHash } from "node:crypto";
import { UserModel } from "./models/user.model.js";
import {
  confirmRegistration,
  readChainAsset,
} from "./services/blockchain.js";

export const app = express();

const nonces = new Map<string, { value: string; expiresAt: number }>();
const sessions = new Map<string, { walletAddress: string; expiresAt: number }>();
const sessionCookie = "raksa_session";

function getParam(param: any): string {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && param.length > 0 && typeof param[0] === "string") return param[0];
  return "";
}

function readCookie(request: express.Request, name: string) {
  const value = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return value?.slice(name.length + 1);
}

function requireAuth(request: express.Request, response: express.Response, next: express.NextFunction) {
  const token = readCookie(request, sessionCookie);
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    response.status(401).json({
      success: false,
      error: { code: "AUTH_REQUIRED", message: "Connect your wallet to continue." },
    });
    return;
  }
  response.locals.walletAddress = session.walletAddress.toLowerCase();
  next();
}

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) =>
    callback(null, ["application/pdf", "image/png", "image/jpeg"].includes(file.mimetype)),
});

// Health check
app.get("/health", (_request, response) => {
  response.json({
    success: true,
    data: {
      service: "raksa-id-api",
      status: "healthy",
      database: isDatabaseConnected() ? "mongodb" : "memory-development",
      timestamp: new Date().toISOString(),
    },
  });
});

// Auth Endpoints
app.post("/api/auth/nonce", (request, response) => {
  const walletAddress = typeof request.body?.walletAddress === "string" ? request.body.walletAddress : "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_WALLET", message: "A valid EVM wallet address is required." },
    });
    return;
  }

  const nonce = crypto.randomBytes(24).toString("hex");
  nonces.set(walletAddress.toLowerCase(), { value: nonce, expiresAt: Date.now() + 5 * 60 * 1000 });
  response.json({ success: true, data: { walletAddress, nonce, message: `Sign in to Raksa ID: ${nonce}` } });
});

app.post("/api/auth/verify", async (request, response) => {
  const walletAddress = typeof request.body?.walletAddress === "string" ? request.body.walletAddress : "";
  const signature = typeof request.body?.signature === "string" ? request.body.signature : "";
  const nonceRecord = nonces.get(walletAddress.toLowerCase());

  if (!nonceRecord || nonceRecord.expiresAt < Date.now()) {
    response.status(401).json({
      success: false,
      error: { code: "NONCE_EXPIRED", message: "Request a new sign-in challenge." },
    });
    return;
  }

  try {
    const recoveredAddress = verifyMessage(`Sign in to Raksa ID: ${nonceRecord.value}`, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) throw new Error("signature mismatch");
    nonces.delete(walletAddress.toLowerCase());
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { walletAddress: recoveredAddress, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });

    if (isDatabaseConnected()) {
      await UserModel.findOneAndUpdate(
        { walletAddress: recoveredAddress.toLowerCase() },
        { walletAddress: recoveredAddress.toLowerCase(), lastLoginAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    await logAudit(recoveredAddress, "USER_LOGIN");
    response.setHeader(
      "Set-Cookie",
      `${sessionCookie}=${token}; HttpOnly; Path=/; SameSite=${env.NODE_ENV === "production" ? "None" : "Lax"}${env.NODE_ENV === "production" ? "; Secure" : ""}`
    );
    response.json({ success: true, data: { walletAddress, authenticated: true } });
  } catch {
    response.status(401).json({
      success: false,
      error: { code: "INVALID_SIGNATURE", message: "The wallet signature could not be verified." },
    });
  }
});

app.get("/api/auth/me", requireAuth, (request, response) => {
  const token = readCookie(request, sessionCookie);
  const session = token ? sessions.get(token) : undefined;
  response.json({ success: true, data: { walletAddress: session?.walletAddress, authenticated: true } });
});

app.post("/api/auth/logout", (request, response) => {
  const token = readCookie(request, sessionCookie);
  if (token) sessions.delete(token);
  response.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  response.json({ success: true, data: { authenticated: false } });
});

// Identity Endpoints
app.get("/api/identity", requireAuth, async (_request, response) => {
  const identity = await getIdentity(response.locals.walletAddress as string);
  response.json({ success: true, data: identity });
});

app.patch("/api/identity", requireAuth, async (request, response) => {
  const updated = await updateIdentity(response.locals.walletAddress as string, request.body || {});
  await logAudit(response.locals.walletAddress as string, "IDENTITY_UPDATE");
  response.json({ success: true, data: updated });
});

// Digital Assets Endpoints
app.get("/api/assets", requireAuth, async (_request, response) => {
  response.json({ success: true, data: await listAssets(response.locals.walletAddress as string) });
});

app.get("/api/assets/:assetId", requireAuth, async (request, response) => {
  const assetId = getParam(request.params.assetId);
  const asset = await findAsset(assetId, response.locals.walletAddress as string);
  if (!asset) {
    response.status(404).json({
      success: false,
      error: { code: "ASSET_NOT_FOUND", message: "The requested asset was not found." },
    });
    return;
  }
  const chain = await readChainAsset(asset.assetId || asset.id);
  response.json({ success: true, data: { ...asset, blockchain: chain } });
});

app.post("/api/assets", requireAuth, upload.single("document"), async (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  const type = typeof request.body?.type === "string" ? request.body.type.trim() : "";
  const description = typeof request.body?.description === "string" ? request.body.description.trim() : "";

  if (name.length < 2 || name.length > 120 || !type || !request.file) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_ASSET", message: "A name, asset type, and valid file document are required." },
    });
    return;
  }

  const stored = await storePrivateDocument(request.file);
  const created = await addAsset({
    name,
    type,
    description,
    hash: stored.hash,
    storageReference: stored.reference,
    ownerWallet: response.locals.walletAddress as string,
  });

  await logAudit(response.locals.walletAddress as string, "ASSET_CREATED", created.id, { hash: stored.hash });
  response.status(201).json({ success: true, data: created });
});

app.post("/api/assets/:assetId/register/confirm", requireAuth, async (request, response) => {
  const assetId = getParam(request.params.assetId);
  const transactionHash = typeof request.body?.transactionHash === "string" ? request.body.transactionHash : "";
  const asset = await findAsset(assetId, response.locals.walletAddress as string);

  if (!asset || !asset.hash || !transactionHash) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_REGISTRATION", message: "A pending owned asset and transaction hash are required." },
    });
    return;
  }

  try {
    const confirmed = await confirmRegistration({
      assetId: asset.assetId || asset.id,
      ownerWallet: response.locals.walletAddress as string,
      documentHash: asset.hash,
      transactionHash,
    });
    const updated = await markRegistered(assetId, response.locals.walletAddress as string, {
      transactionHash,
      ...confirmed,
    });
    await logAudit(response.locals.walletAddress as string, "ASSET_REGISTERED", assetId, { transactionHash });
    response.json({ success: true, data: updated });
  } catch (error) {
    response.status(422).json({
      success: false,
      error: {
        code: "REGISTRATION_NOT_CONFIRMED",
        message: error instanceof Error ? error.message : "The blockchain transaction could not be verified.",
      },
    });
  }
});

// Verification Endpoints (4-Layer Verification Model)
app.post("/api/assets/:assetId/verify", requireAuth, upload.single("document"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({
      success: false,
      error: { code: "DOCUMENT_REQUIRED", message: "Upload a document to verify." },
    });
    return;
  }
  const assetId = getParam(request.params.assetId);
  const asset = await findAsset(assetId, response.locals.walletAddress as string);
  if (!asset) {
    response.status(404).json({
      success: false,
      error: { code: "ASSET_NOT_FOUND", message: "The asset was not found in your vault." },
    });
    return;
  }

  const submittedHash = createHash("sha256").update(request.file.buffer).digest("hex");
  const matched = Boolean(asset.hash && asset.hash === submittedHash);
  const chain = await readChainAsset(asset.assetId || asset.id);

  response.json({
    success: true,
    data: {
      assetId: asset.assetId || asset.id,
      assetName: asset.name,
      integrity: matched ? "MATCHED" : "MISMATCH",
      registeredHash: asset.hash,
      submittedHash,
      blockchainRegistration: chain.registered ? "VERIFIED" : "NOT_FOUND",
      issuerAuthenticity: asset.issuer ? "VERIFIED" : "UNVERIFIED",
      revocationStatus: chain.revoked ? "REVOKED" : "NOT_REVOKED",
      network: chain.network,
    },
  });
});

app.post("/api/verify", upload.single("document"), async (request, response) => {
  const assetId = typeof request.body?.assetId === "string" ? request.body.assetId.trim() : "";
  let submittedHash = "";

  if (request.file) {
    submittedHash = createHash("sha256").update(request.file.buffer).digest("hex");
  } else if (typeof request.body?.hash === "string") {
    submittedHash = request.body.hash.trim();
  }

  if (!assetId && !submittedHash) {
    response.status(400).json({
      success: false,
      error: { code: "VERIFICATION_INPUT_REQUIRED", message: "Provide an Asset ID, SHA-256 hash, or document file." },
    });
    return;
  }

  const asset = assetId ? await findAsset(assetId) : null;
  const chain = assetId ? await readChainAsset(assetId) : { registered: false, revoked: false, network: env.NETWORK_NAME, configured: false, assetId: "" };
  const matched = Boolean(asset && asset.hash && asset.hash === submittedHash);

  response.json({
    success: true,
    data: {
      assetId: assetId || "UNSPECIFIED",
      assetName: asset?.name || "Unknown Asset",
      documentIntegrity: submittedHash ? (matched || (chain as any).documentHash === `0x${submittedHash}` ? "MATCHED" : "MISMATCH") : "UNCHECKED",
      registeredHash: asset?.hash || (chain as any).documentHash || null,
      submittedHash: submittedHash || null,
      blockchainRegistration: chain.registered ? "VERIFIED" : "NOT_FOUND",
      issuerStatus: asset?.issuer ? "VALIDATED" : "UNVERIFIED",
      revocationStatus: chain.revoked ? "REVOKED" : "ACTIVE",
      network: chain.network,
    },
  });
});

// Access Permissions Endpoints
app.get("/api/assets/:assetId/access", requireAuth, async (request, response) => {
  const assetId = getParam(request.params.assetId);
  const perms = await listPermissions(assetId, response.locals.walletAddress as string);
  response.json({ success: true, data: perms });
});

app.post("/api/assets/:assetId/access", requireAuth, async (request, response) => {
  const assetId = getParam(request.params.assetId);
  const recipientWallet = typeof request.body?.recipientWallet === "string" ? request.body.recipientWallet.trim() : "";
  const permission = request.body?.permission as "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE";
  const expiresInDays = Number(request.body?.expiresInDays) || 30;

  if (!recipientWallet || !permission) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_PERMISSION", message: "Recipient wallet address and permission type are required." },
    });
    return;
  }

  const perm = await grantPermission({
    assetId,
    ownerWallet: response.locals.walletAddress as string,
    recipientWallet,
    permission,
    expiresInDays,
    blockchainTx: typeof request.body?.blockchainTx === "string" ? request.body.blockchainTx : undefined,
  });

  await logAudit(response.locals.walletAddress as string, "ACCESS_GRANTED", assetId, { recipientWallet, permission });
  response.status(201).json({ success: true, data: perm });
});

app.delete("/api/assets/:assetId/access/:permissionId", requireAuth, async (request, response) => {
  const permissionId = getParam(request.params.permissionId);
  const success = await revokePermission(permissionId, response.locals.walletAddress as string);
  if (!success) {
    response.status(404).json({
      success: false,
      error: { code: "PERMISSION_NOT_FOUND", message: "Permission not found or unauthorized." },
    });
    return;
  }
  await logAudit(response.locals.walletAddress as string, "ACCESS_REVOKED", permissionId);
  response.json({ success: true, data: { revoked: true } });
});

// Access Requests Endpoints
app.get("/api/access-requests", requireAuth, async (_request, response) => {
  const reqs = await listAccessRequests(response.locals.walletAddress as string);
  response.json({ success: true, data: reqs });
});

app.post("/api/access-requests", requireAuth, async (request, response) => {
  const assetId = typeof request.body?.assetId === "string" ? request.body.assetId.trim() : "";
  const ownerWallet = typeof request.body?.ownerWallet === "string" ? request.body.ownerWallet.trim() : "";
  const requestedPermission = request.body?.requestedPermission as "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE";
  const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";

  if (!assetId || !ownerWallet || !requestedPermission) {
    response.status(400).json({
      success: false,
      error: { code: "INVALID_ACCESS_REQUEST", message: "assetId, ownerWallet, and requestedPermission are required." },
    });
    return;
  }

  const created = await createAccessRequest({
    assetId,
    ownerWallet,
    requesterWallet: response.locals.walletAddress as string,
    requestedPermission,
    reason,
  });

  await logAudit(response.locals.walletAddress as string, "ACCESS_REQUESTED", assetId, { requestedPermission });
  response.status(201).json({ success: true, data: created });
});

// Issuers Endpoint
app.get("/api/issuers", async (_request, response) => {
  response.json({ success: true, data: await listIssuers() });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." },
  });
};

app.use(errorHandler);
