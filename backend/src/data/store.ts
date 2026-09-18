import { isDatabaseConnected } from "../config/db.js";
import { AssetModel } from "../models/asset.model.js";
import { IdentityModel } from "../models/identity.model.js";
import { AccessPermissionModel } from "../models/access-permission.model.js";
import { AccessRequestModel } from "../models/access-request.model.js";
import { IssuerModel } from "../models/issuer.model.js";
import { TransactionModel } from "../models/transaction.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { AuditLogModel } from "../models/audit-log.model.js";

export type AssetStatus = "DRAFT" | "UPLOADING" | "HASHED" | "PENDING_BLOCKCHAIN" | "REGISTERED" | "REVOKED";

export type Asset = {
  id: string;
  assetId: string;
  ownerWallet: string;
  name: string;
  issuer: string;
  type: string;
  description: string;
  status: AssetStatus;
  hash: string | null;
  hashAlgorithm: string;
  storageReference: string | null;
  transactionHash: string | null;
  blockNumber: number | null;
  contractAddress: string | null;
  revoked: boolean;
  createdAt: string;
};

export type AccessPermission = {
  id: string;
  assetId: string;
  ownerWallet: string;
  recipientWallet: string;
  permission: "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE";
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  blockchainTx: string | null;
  createdAt: string;
};

export type AccessRequest = {
  id: string;
  assetId: string;
  requesterWallet: string;
  ownerWallet: string;
  requestedPermission: "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE";
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  expiresAt: string | null;
  createdAt: string;
};

export type Identity = {
  identityId: string;
  walletAddress: string;
  displayName: string;
  verificationStatus: "UNVERIFIED" | "VERIFIED";
  visibilitySettings: {
    displayName: string;
    email: string;
    phone: string;
    address: string;
    wallet: string;
  };
};

export type Issuer = {
  id: string;
  issuerId: string;
  name: string;
  institutionType: string;
  verified: boolean;
  issuerWallet: string;
};

// In-Memory Fallback Arrays
const assets: Asset[] = [
  {
    id: "asset-btech",
    assetId: "RID-ASSET-BTECH",
    ownerWallet: "demo-wallet",
    name: "B.Tech Certificate",
    issuer: "National Institute of Technology",
    type: "Certificate",
    description: "Bachelor of Technology degree certificate",
    status: "REGISTERED",
    hash: "9f86d081884c7d65",
    hashAlgorithm: "SHA-256",
    storageReference: null,
    transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    blockNumber: 123456,
    contractAddress: "0x0000000000000000000000000000000000000000",
    revoked: false,
    createdAt: "2026-09-12T10:00:00.000Z",
  },
  {
    id: "asset-license",
    assetId: "RID-ASSET-LICENSE",
    ownerWallet: "demo-wallet",
    name: "Frontend Engineer License",
    issuer: "Open Web Guild",
    type: "License",
    description: "Certified Professional Engineer license",
    status: "PENDING_BLOCKCHAIN",
    hash: null,
    hashAlgorithm: "SHA-256",
    storageReference: null,
    transactionHash: null,
    blockNumber: null,
    contractAddress: null,
    revoked: false,
    createdAt: "2026-09-15T10:00:00.000Z",
  },
];

const permissions: AccessPermission[] = [];
const accessRequests: AccessRequest[] = [];
const identities: Map<string, Identity> = new Map();
const issuers: Issuer[] = [
  {
    id: "iss-1",
    issuerId: "RID-ISS-001",
    name: "National Institute of Technology",
    institutionType: "University",
    verified: true,
    issuerWallet: "0x1111111111111111111111111111111111111111",
  },
];

function toAsset(doc: any): Asset {
  return {
    id: doc._id.toString(),
    assetId: doc.assetId || doc._id.toString(),
    ownerWallet: doc.ownerWallet,
    name: doc.name,
    issuer: doc.issuer,
    type: doc.type,
    description: doc.description || "",
    status: doc.status as AssetStatus,
    hash: doc.hash ?? null,
    hashAlgorithm: doc.hashAlgorithm || "SHA-256",
    storageReference: doc.storageReference ?? null,
    transactionHash: doc.transactionHash ?? null,
    blockNumber: doc.blockNumber ?? null,
    contractAddress: doc.contractAddress ?? null,
    revoked: Boolean(doc.revoked),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
}

// Asset Operations
export async function listAssets(ownerWallet: string): Promise<Asset[]> {
  const normalized = ownerWallet.toLowerCase();
  if (isDatabaseConnected()) {
    const docs = await AssetModel.find({ ownerWallet: normalized }).sort({ createdAt: -1 }).lean();
    return docs.map(toAsset);
  }
  return assets.filter((asset) => asset.ownerWallet === normalized);
}

export async function addAsset(input: {
  name: string;
  type: string;
  description?: string;
  hash: string | null;
  storageReference: string | null;
  ownerWallet: string;
  issuer?: string;
}): Promise<Asset> {
  const normalizedWallet = input.ownerWallet.toLowerCase();
  const assetId = `RID-ASSET-${Date.now().toString(36).toUpperCase()}`;
  const issuer = input.issuer || "Self-uploaded document";

  if (isDatabaseConnected()) {
    const created = await AssetModel.create({
      assetId,
      ownerWallet: normalizedWallet,
      name: input.name,
      type: input.type,
      description: input.description || "",
      hash: input.hash,
      storageReference: input.storageReference,
      issuer,
      status: "PENDING_BLOCKCHAIN",
    });
    return toAsset(created.toObject());
  }

  const asset: Asset = {
    id: `asset-${Date.now()}`,
    assetId,
    ownerWallet: normalizedWallet,
    name: input.name,
    type: input.type,
    description: input.description || "",
    issuer,
    status: "PENDING_BLOCKCHAIN",
    hash: input.hash,
    hashAlgorithm: "SHA-256",
    storageReference: input.storageReference,
    transactionHash: null,
    blockNumber: null,
    contractAddress: null,
    revoked: false,
    createdAt: new Date().toISOString(),
  };
  assets.unshift(asset);
  return asset;
}

export async function findAsset(idOrAssetId: string, ownerWallet?: string): Promise<Asset | null> {
  const normalizedWallet = ownerWallet ? ownerWallet.toLowerCase() : null;
  if (isDatabaseConnected()) {
    const query: any = { $or: [{ _id: idOrAssetId }, { assetId: idOrAssetId }] };
    if (normalizedWallet) query.ownerWallet = normalizedWallet;
    const doc = await AssetModel.findOne(query).lean();
    return doc ? toAsset(doc) : null;
  }
  return (
    assets.find(
      (a) =>
        (a.id === idOrAssetId || a.assetId === idOrAssetId) &&
        (!normalizedWallet || a.ownerWallet === normalizedWallet)
    ) ?? null
  );
}

export async function markRegistered(
  id: string,
  ownerWallet: string,
  metadata: { transactionHash: string; blockNumber: number; contractAddress: string }
): Promise<Asset | null> {
  const normalized = ownerWallet.toLowerCase();
  if (isDatabaseConnected()) {
    const updated = await AssetModel.findOneAndUpdate(
      { $or: [{ _id: id }, { assetId: id }], ownerWallet: normalized },
      { status: "REGISTERED", ...metadata },
      { new: true }
    ).lean();
    return updated ? toAsset(updated) : null;
  }
  const asset = assets.find(
    (item) => (item.id === id || item.assetId === id) && item.ownerWallet === normalized
  );
  if (!asset) return null;
  Object.assign(asset, { status: "REGISTERED" as const, ...metadata });
  return asset;
}

// Identity Operations
export async function getIdentity(walletAddress: string): Promise<Identity> {
  const normalized = walletAddress.toLowerCase();
  if (isDatabaseConnected()) {
    const doc = await IdentityModel.findOne({ walletAddress: normalized }).lean();
    if (doc) {
      return {
        identityId: doc.identityId,
        walletAddress: doc.walletAddress,
        displayName: doc.displayName || "",
        verificationStatus: doc.verificationStatus as any,
        visibilitySettings: doc.visibilitySettings as any,
      };
    }
  }
  return (
    identities.get(normalized) || {
      identityId: `RID-${normalized.slice(2, 10).toUpperCase()}`,
      walletAddress: normalized,
      displayName: "Identity Holder",
      verificationStatus: "UNVERIFIED",
      visibilitySettings: {
        displayName: "PUBLIC",
        email: "PRIVATE",
        phone: "PRIVATE",
        address: "PRIVATE",
        wallet: "CONTROLLED",
      },
    }
  );
}

export async function updateIdentity(walletAddress: string, data: Partial<Identity>): Promise<Identity> {
  const current = await getIdentity(walletAddress);
  const updated: Identity = { ...current, ...data };

  if (isDatabaseConnected()) {
    await IdentityModel.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { ...updated },
      { upsert: true, new: true }
    );
  } else {
    identities.set(walletAddress.toLowerCase(), updated);
  }
  return updated;
}

// Permissions Operations
export async function listPermissions(assetId: string, ownerWallet: string): Promise<AccessPermission[]> {
  const normalized = ownerWallet.toLowerCase();
  if (isDatabaseConnected()) {
    const docs = await AccessPermissionModel.find({ assetId, ownerWallet: normalized }).lean();
    return docs.map((d) => ({
      id: d._id.toString(),
      assetId: d.assetId,
      ownerWallet: d.ownerWallet,
      recipientWallet: d.recipientWallet,
      permission: d.permission as any,
      status: d.status as any,
      expiresAt: d.expiresAt.toISOString(),
      blockchainTx: d.blockchainTx ?? null,
      createdAt: d.createdAt.toISOString(),
    }));
  }
  return permissions.filter((p) => p.assetId === assetId && p.ownerWallet === normalized);
}

export async function grantPermission(input: {
  assetId: string;
  ownerWallet: string;
  recipientWallet: string;
  permission: "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE";
  expiresInDays: number;
  blockchainTx?: string;
}): Promise<AccessPermission> {
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86400 * 1000).toISOString();
  const normalizedOwner = input.ownerWallet.toLowerCase();
  const normalizedRecipient = input.recipientWallet.toLowerCase();

  if (isDatabaseConnected()) {
    const created = await AccessPermissionModel.create({
      assetId: input.assetId,
      ownerWallet: normalizedOwner,
      recipientWallet: normalizedRecipient,
      permission: input.permission,
      expiresAt: new Date(expiresAt),
      blockchainTx: input.blockchainTx || null,
      status: "ACTIVE",
    });
    return {
      id: created._id.toString(),
      assetId: created.assetId,
      ownerWallet: created.ownerWallet,
      recipientWallet: created.recipientWallet,
      permission: created.permission as any,
      status: created.status as any,
      expiresAt: created.expiresAt.toISOString(),
      blockchainTx: created.blockchainTx ?? null,
      createdAt: created.createdAt.toISOString(),
    };
  }

  const perm: AccessPermission = {
    id: `perm-${Date.now()}`,
    assetId: input.assetId,
    ownerWallet: normalizedOwner,
    recipientWallet: normalizedRecipient,
    permission: input.permission,
    status: "ACTIVE",
    expiresAt,
    blockchainTx: input.blockchainTx || null,
    createdAt: new Date().toISOString(),
  };
  permissions.push(perm);
  return perm;
}

export async function revokePermission(permissionId: string, ownerWallet: string): Promise<boolean> {
  const normalized = ownerWallet.toLowerCase();
  if (isDatabaseConnected()) {
    const res = await AccessPermissionModel.updateOne(
      { _id: permissionId, ownerWallet: normalized },
      { status: "REVOKED" }
    );
    return res.modifiedCount > 0;
  }
  const perm = permissions.find((p) => p.id === permissionId && p.ownerWallet === normalized);
  if (!perm) return false;
  perm.status = "REVOKED";
  return true;
}

// Access Requests
export async function createAccessRequest(input: {
  assetId: string;
  requesterWallet: string;
  ownerWallet: string;
  requestedPermission: "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE";
  reason: string;
}): Promise<AccessRequest> {
  const req: AccessRequest = {
    id: `req-${Date.now()}`,
    assetId: input.assetId,
    requesterWallet: input.requesterWallet.toLowerCase(),
    ownerWallet: input.ownerWallet.toLowerCase(),
    requestedPermission: input.requestedPermission,
    reason: input.reason,
    status: "PENDING",
    expiresAt: null,
    createdAt: new Date().toISOString(),
  };

  if (isDatabaseConnected()) {
    const created = await AccessRequestModel.create({ ...input, requesterWallet: req.requesterWallet, ownerWallet: req.ownerWallet });
    req.id = created._id.toString();
  } else {
    accessRequests.push(req);
  }

  return req;
}

export async function listAccessRequests(walletAddress: string): Promise<AccessRequest[]> {
  const normalized = walletAddress.toLowerCase();
  if (isDatabaseConnected()) {
    const docs = await AccessRequestModel.find({
      $or: [{ ownerWallet: normalized }, { requesterWallet: normalized }],
    })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => ({
      id: d._id.toString(),
      assetId: d.assetId,
      requesterWallet: d.requesterWallet,
      ownerWallet: d.ownerWallet,
      requestedPermission: d.requestedPermission as any,
      reason: d.reason,
      status: d.status as any,
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
    }));
  }
  return accessRequests.filter((r) => r.ownerWallet === normalized || r.requesterWallet === normalized);
}

// Issuers
export async function listIssuers(): Promise<Issuer[]> {
  if (isDatabaseConnected()) {
    const docs = await IssuerModel.find({ verified: true }).lean();
    return docs.map((d) => ({
      id: d._id.toString(),
      issuerId: d.issuerId,
      name: d.name,
      institutionType: d.institutionType,
      verified: d.verified,
      issuerWallet: d.issuerWallet,
    }));
  }
  return issuers;
}

// Audit Log & Notifications
export async function logAudit(walletAddress: string, action: string, targetId?: string, metadata?: any) {
  if (isDatabaseConnected()) {
    await AuditLogModel.create({
      walletAddress: walletAddress.toLowerCase(),
      action,
      targetId: targetId || null,
      metadata: metadata || {},
    });
  }
}

export async function createNotification(walletAddress: string, title: string, message: string, type = "INFO", relatedAssetId?: string) {
  if (isDatabaseConnected()) {
    await NotificationModel.create({
      walletAddress: walletAddress.toLowerCase(),
      type,
      title,
      message,
      relatedAssetId: relatedAssetId || null,
    });
  }
}
