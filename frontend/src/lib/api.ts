const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiAsset = {
  id: string;
  assetId?: string;
  name: string;
  issuer: string;
  type: string;
  description?: string;
  status: "DRAFT" | "UPLOADING" | "HASHED" | "PENDING_BLOCKCHAIN" | "REGISTERED" | "REVOKED";
  hash: string | null;
  hashAlgorithm?: string;
  createdAt: string;
  transactionHash?: string | null;
  blockNumber?: number | null;
  contractAddress?: string | null;
  revoked?: boolean;
};

export type ApiBlockchainState = {
  configured: boolean;
  registered: boolean;
  revoked: boolean;
  assetId: string;
  network: string;
  documentHash?: string;
  owner?: string;
  issuer?: string;
};

export type ApiIdentity = {
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

export type ApiPermission = {
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

export type ApiAccessRequest = {
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

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { message?: string };
  } | null;
  if (!response.ok || !body?.success) throw new Error(body?.error?.message ?? "The API request failed.");
  return body.data as T;
}

// Auth API
export function currentSession() {
  return apiRequest<{ walletAddress: string; authenticated: boolean }>("/api/auth/me");
}
export function requestNonce(walletAddress: string) {
  return apiRequest<{ message: string }>("/api/auth/nonce", { method: "POST", body: JSON.stringify({ walletAddress }) });
}
export function verifyWallet(walletAddress: string, signature: string) {
  return apiRequest<{ walletAddress: string; authenticated: boolean }>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ walletAddress, signature }),
  });
}
export function logout() {
  return apiRequest<{ authenticated: false }>("/api/auth/logout", { method: "POST" });
}

// Identity API
export function getIdentity() {
  return apiRequest<ApiIdentity>("/api/identity");
}
export function updateIdentity(data: Partial<ApiIdentity>) {
  return apiRequest<ApiIdentity>("/api/identity", { method: "PATCH", body: JSON.stringify(data) });
}

// Assets API
export function listAssets() {
  return apiRequest<ApiAsset[]>("/api/assets");
}
export function getAsset(assetId: string) {
  return apiRequest<ApiAsset & { blockchain: ApiBlockchainState }>(`/api/assets/${assetId}`);
}
export function createAsset(input: { name: string; type: string; description?: string; file: File }) {
  const body = new FormData();
  body.append("name", input.name);
  body.append("type", input.type);
  if (input.description) body.append("description", input.description);
  body.append("document", input.file);
  return apiRequest<ApiAsset>("/api/assets", { method: "POST", body, headers: {} });
}
export function confirmRegistration(assetId: string, transactionHash: string) {
  return apiRequest<ApiAsset>(`/api/assets/${assetId}/register/confirm`, {
    method: "POST",
    body: JSON.stringify({ transactionHash }),
  });
}

// Verification API
export function verifyAsset(assetId: string, file: File) {
  const body = new FormData();
  body.append("document", file);
  return apiRequest<{
    assetId: string;
    assetName: string;
    integrity: "MATCHED" | "MISMATCH";
    registeredHash: string | null;
    submittedHash: string;
    blockchainRegistration: string;
    issuerAuthenticity: string;
    revocationStatus: string;
    network: string;
  }>(`/api/assets/${assetId}/verify`, { method: "POST", body });
}

export function universalVerify(input: { assetId?: string; file?: File; hash?: string }) {
  const body = new FormData();
  if (input.assetId) body.append("assetId", input.assetId);
  if (input.hash) body.append("hash", input.hash);
  if (input.file) body.append("document", input.file);
  return apiRequest<{
    assetId: string;
    assetName: string;
    documentIntegrity: string;
    registeredHash: string | null;
    submittedHash: string | null;
    blockchainRegistration: string;
    issuerStatus: string;
    revocationStatus: string;
    network: string;
  }>("/api/verify", { method: "POST", body, headers: {} });
}

// Access API
export function listPermissions(assetId: string) {
  return apiRequest<ApiPermission[]>(`/api/assets/${assetId}/access`);
}
export function grantPermission(
  assetId: string,
  recipientWallet: string,
  permission: "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE",
  expiresInDays = 30,
  blockchainTx?: string
) {
  return apiRequest<ApiPermission>(`/api/assets/${assetId}/access`, {
    method: "POST",
    body: JSON.stringify({ recipientWallet, permission, expiresInDays, blockchainTx }),
  });
}
export function revokePermission(assetId: string, permissionId: string) {
  return apiRequest<{ revoked: true }>(`/api/assets/${assetId}/access/${permissionId}`, { method: "DELETE" });
}

// Requests & Issuers API
export function listAccessRequests() {
  return apiRequest<ApiAccessRequest[]>("/api/access-requests");
}
export function createAccessRequest(
  assetId: string,
  ownerWallet: string,
  requestedPermission: "VIEW" | "VERIFY" | "DOWNLOAD" | "SHARE",
  reason: string
) {
  return apiRequest<ApiAccessRequest>("/api/access-requests", {
    method: "POST",
    body: JSON.stringify({ assetId, ownerWallet, requestedPermission, reason }),
  });
}
export function listIssuers() {
  return apiRequest<Array<{ id: string; issuerId: string; name: string; institutionType: string; verified: boolean }>>("/api/issuers");
}
