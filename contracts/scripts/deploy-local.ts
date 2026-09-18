import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const registry = await ethers.deployContract("RaksaRegistry");
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  const manifest = { address, chainId: 31337, network: "Hardhat Local", deployer: deployer.address, deployedAt: new Date().toISOString() };
  await mkdir(path.resolve("deployments"), { recursive: true });
  await writeFile(path.resolve("deployments/local.json"), JSON.stringify(manifest, null, 2));
  console.log(`RaksaRegistry deployed to ${address}`);
  console.log("Deployment manifest written to deployments/local.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});