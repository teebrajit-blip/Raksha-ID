import { expect } from "chai";
import { ethers } from "hardhat";

describe("RaksaRegistry", function () {
  it("registers an asset and restricts access changes to its owner", async function () {
    const [owner, issuer, recipient, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("RaksaRegistry");
    const assetId = ethers.id("asset-1");
    const documentHash = ethers.id("document-1");
    const expiry = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) + 3600n;

    await expect(registry.registerAsset(assetId, documentHash, issuer.address))
      .to.emit(registry, "AssetRegistered").withArgs(assetId, documentHash, owner.address, issuer.address);

    await expect(registry.connect(stranger).grantAccess(assetId, recipient.address, 2, expiry)).to.be.revertedWith("only owner");
    await registry.grantAccess(assetId, recipient.address, 2, expiry);
    expect(await registry.checkAccess(assetId, recipient.address, 2)).to.equal(true);

    await registry.revokeAccess(assetId, recipient.address);
    expect(await registry.checkAccess(assetId, recipient.address, 2)).to.equal(false);
  });

  it("prevents duplicate registration and owner-only revocation", async function () {
    const [owner, issuer, stranger] = await ethers.getSigners();
    const registry = await ethers.deployContract("RaksaRegistry");
    const assetId = ethers.id("asset-2");
    const documentHash = ethers.id("document-2");

    await registry.registerAsset(assetId, documentHash, issuer.address);
    await expect(registry.registerAsset(assetId, documentHash, issuer.address)).to.be.revertedWith("asset already registered");
    await expect(registry.connect(stranger).revokeAsset(assetId)).to.be.revertedWith("only owner");
    await registry.revokeAsset(assetId);
    expect((await registry.getAsset(assetId)).revoked).to.equal(true);
  });
});
