import { Contract, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";
import { env } from "../config/env.js";

const registryAbi = [
  "function getAsset(bytes32 assetId) view returns (bytes32 documentHash, address owner, address issuer, uint64 createdAt, bool revoked)",
  "function checkAccess(bytes32 assetId, address recipient, uint8 requiredPermission) view returns (bool)",
  "event AssetRegistered(bytes32 indexed assetId, bytes32 indexed documentHash, address indexed owner, address issuer)",
  "event AssetRevoked(bytes32 indexed assetId)",
  "event AccessGranted(bytes32 indexed assetId, address indexed recipient, uint8 permissionType, uint64 expiresAt)",
  "event AccessRevoked(bytes32 indexed assetId, address indexed recipient)",
];

export type ChainAssetState = {
  configured: boolean;
  registered: boolean;
  revoked: boolean;
  assetId: string;
  network: string;
  documentHash?: string;
  owner?: string;
  issuer?: string;
};

export enum PermissionType {
  None = 0,
  View = 1,
  Verify = 2,
  Download = 3,
  Share = 4,
}

function provider() {
  return new JsonRpcProvider(env.RPC_URL, env.CHAIN_ID, { staticNetwork: true });
}

function registry() {
  if (!env.CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS is not configured");
  return new Contract(env.CONTRACT_ADDRESS, registryAbi, provider());
}

export function deriveChainAssetId(assetId: string) {
  return keccak256(toUtf8Bytes(assetId));
}

export async function readChainAsset(assetId: string): Promise<ChainAssetState> {
  const derivedAssetId = deriveChainAssetId(assetId);
  const base = {
    configured: Boolean(env.CONTRACT_ADDRESS),
    assetId: derivedAssetId,
    network: env.NETWORK_NAME,
  };
  if (!env.CONTRACT_ADDRESS) return { ...base, registered: false, revoked: false };

  try {
    const getAsset = registry().getFunction("getAsset");
    const asset = (await getAsset(derivedAssetId)) as unknown as {
      documentHash: string;
      owner: string;
      issuer: string;
      revoked: boolean;
    };
    const registered = asset.owner !== "0x0000000000000000000000000000000000000000";
    return {
      ...base,
      registered,
      revoked: asset.revoked,
      documentHash: registered ? asset.documentHash : undefined,
      owner: registered ? asset.owner : undefined,
      issuer: registered ? asset.issuer : undefined,
    };
  } catch {
    return { ...base, registered: false, revoked: false };
  }
}

export async function checkChainAccess(
  assetId: string,
  recipientWallet: string,
  permission: PermissionType
): Promise<boolean> {
  if (!env.CONTRACT_ADDRESS) return false;
  try {
    const derivedAssetId = deriveChainAssetId(assetId);
    const checkAccess = registry().getFunction("checkAccess");
    const hasAccess = (await checkAccess(derivedAssetId, recipientWallet, permission)) as boolean;
    return hasAccess;
  } catch {
    return false;
  }
}

export async function confirmRegistration(input: {
  assetId: string;
  ownerWallet: string;
  documentHash: string;
  transactionHash: string;
}) {
  const chainProvider = provider();
  const receipt = await chainProvider.getTransactionReceipt(input.transactionHash);
  if (!receipt || receipt.status !== 1 || !receipt.blockNumber)
    throw new Error("Transaction is not confirmed successfully.");
  if (!env.CONTRACT_ADDRESS || receipt.to?.toLowerCase() !== env.CONTRACT_ADDRESS.toLowerCase())
    throw new Error("Transaction was not sent to the Raksa registry.");
  const transaction = await chainProvider.getTransaction(input.transactionHash);
  if (!transaction || transaction.from.toLowerCase() !== input.ownerWallet.toLowerCase())
    throw new Error("Transaction sender does not own this asset.");
  const getAsset = registry().getFunction("getAsset");
  const chainAsset = (await getAsset(deriveChainAssetId(input.assetId))) as unknown as {
    documentHash: string;
    owner: string;
    revoked: boolean;
  };
  if (chainAsset.owner.toLowerCase() !== input.ownerWallet.toLowerCase())
    throw new Error("On-chain owner does not match the authenticated wallet.");
  if (chainAsset.documentHash.toLowerCase() !== `0x${input.documentHash}`.toLowerCase())
    throw new Error("On-chain document hash does not match the stored document.");
  if (chainAsset.revoked) throw new Error("The on-chain asset is revoked.");
  return { blockNumber: receipt.blockNumber, contractAddress: env.CONTRACT_ADDRESS };
}
