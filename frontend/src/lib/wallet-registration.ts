import { Contract, BrowserProvider, keccak256, toUtf8Bytes } from "ethers";

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "80002");
const networkName = process.env.NEXT_PUBLIC_NETWORK_NAME ?? "Polygon Amoy";
const abi = ["function registerAsset(bytes32 assetId, bytes32 documentHash, address issuer)"];

const networkParams = {
  chainId: `0x${configuredChainId.toString(16)}`,
  chainName: networkName,
  nativeCurrency: {
    name: configuredChainId === 31337 ? "ETH" : "MATIC",
    symbol: configuredChainId === 31337 ? "ETH" : "MATIC",
    decimals: 18,
  },
  rpcUrls: [configuredChainId === 31337 ? "http://127.0.0.1:8545" : "https://rpc-amoy.polygon.technology"],
  blockExplorerUrls: configuredChainId === 31337 ? [] : ["https://amoy.polygonscan.com"],
};

async function ensureCorrectNetwork(provider: { send(method: string, params: unknown[]): Promise<unknown> }) {
  const chainId = await provider.send("eth_chainId", []);
  if (chainId === networkParams.chainId) return;

  try {
    await provider.send("wallet_switchEthereumChain", [{ chainId: networkParams.chainId }]);
  } catch (switchError) {
    const errorCode = (switchError as { code?: number }).code;
    // 4902 = chain not added to MetaMask yet
    // -32603 = internal JSON-RPC error (MetaMask sometimes uses this for unknown chains)
    // Some wallets throw different codes, so we try adding the chain for any switch failure
    if (errorCode === 4902 || errorCode === -32603 || errorCode === 4001) {
      if (errorCode === 4001) {
        // User explicitly rejected the switch
        throw new Error(
          `You rejected the network switch. Please switch MetaMask to "${networkName}" manually:\n\n` +
          `1. Open MetaMask\n` +
          `2. Click the network dropdown (top)\n` +
          `3. Click "Add network" → "Add a network manually"\n` +
          `4. Fill in:\n` +
          `   • Network Name: ${networkName}\n` +
          `   • RPC URL: ${networkParams.rpcUrls[0]}\n` +
          `   • Chain ID: ${configuredChainId}\n` +
          `   • Currency Symbol: ${networkParams.nativeCurrency.symbol}\n` +
          `5. Save and switch to it`
        );
      }
      try {
        await provider.send("wallet_addEthereumChain", [networkParams]);
      } catch (addError) {
        throw new Error(
          `Could not add "${networkName}" to MetaMask automatically.\n\n` +
          `Add it manually in MetaMask:\n` +
          `1. Open MetaMask → Settings → Networks → Add Network\n` +
          `2. Network Name: ${networkName}\n` +
          `3. RPC URL: ${networkParams.rpcUrls[0]}\n` +
          `4. Chain ID: ${configuredChainId}\n` +
          `5. Currency Symbol: ${networkParams.nativeCurrency.symbol}`
        );
      }
    } else {
      // Unknown error — try adding the chain as a fallback
      try {
        await provider.send("wallet_addEthereumChain", [networkParams]);
      } catch {
        throw new Error(
          `Switch MetaMask to "${networkName}" to register this asset.\n\n` +
          `Manual setup:\n` +
          `• Network Name: ${networkName}\n` +
          `• RPC URL: ${networkParams.rpcUrls[0]}\n` +
          `• Chain ID: ${configuredChainId}\n` +
          `• Currency Symbol: ${networkParams.nativeCurrency.symbol}`
        );
      }
    }
  }
}

export async function registerAssetOnWallet(assetId: string, documentHash: string) {
  if (!contractAddress) throw new Error("The Raksa registry is not deployed yet. Deploy it, then set NEXT_PUBLIC_CONTRACT_ADDRESS.");
  if (!window.ethereum) throw new Error("Install a browser wallet (MetaMask) to register this asset.");

  const provider = new BrowserProvider(window.ethereum);
  await ensureCorrectNetwork(provider);
  const signer = await provider.getSigner();
  const contract = new Contract(contractAddress, abi, signer);
  const transaction = await contract.registerAsset(
    keccak256(toUtf8Bytes(assetId)),
    `0x${documentHash}`,
    "0x0000000000000000000000000000000000000000"
  );
  const receipt = await transaction.wait();
  if (!receipt?.hash) throw new Error("The registration transaction did not return a receipt.");
  return receipt.hash as string;
}