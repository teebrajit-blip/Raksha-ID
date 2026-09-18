import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.deployContract("RaksaRegistry");
  await registry.waitForDeployment();
  console.log(`RaksaRegistry deployed to ${await registry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
