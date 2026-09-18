// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RaksaRegistry {
    enum PermissionType { None, View, Verify, Download, Share }

    struct Asset {
        bytes32 documentHash;
        address owner;
        address issuer;
        uint64 createdAt;
        bool revoked;
    }

    struct Permission {
        PermissionType permissionType;
        uint64 expiresAt;
        bool active;
    }

    mapping(bytes32 => Asset) private assets;
    mapping(bytes32 => mapping(address => Permission)) private permissions;

    event AssetRegistered(bytes32 indexed assetId, bytes32 indexed documentHash, address indexed owner, address issuer);
    event AssetRevoked(bytes32 indexed assetId);
    event AccessGranted(bytes32 indexed assetId, address indexed recipient, PermissionType permissionType, uint64 expiresAt);
    event AccessRevoked(bytes32 indexed assetId, address indexed recipient);

    function registerAsset(bytes32 assetId, bytes32 documentHash, address issuer) external {
        require(assetId != bytes32(0), "invalid asset id");
        require(documentHash != bytes32(0), "invalid document hash");
        require(assets[assetId].owner == address(0), "asset already registered");
        assets[assetId] = Asset(documentHash, msg.sender, issuer, uint64(block.timestamp), false);
        emit AssetRegistered(assetId, documentHash, msg.sender, issuer);
    }

    function getAsset(bytes32 assetId) external view returns (Asset memory) {
        require(assets[assetId].owner != address(0), "asset not found");
        return assets[assetId];
    }

    function revokeAsset(bytes32 assetId) external {
        require(assets[assetId].owner == msg.sender, "only owner");
        require(!assets[assetId].revoked, "asset already revoked");
        assets[assetId].revoked = true;
        emit AssetRevoked(assetId);
    }

    function grantAccess(bytes32 assetId, address recipient, PermissionType permissionType, uint64 expiresAt) external {
        require(assets[assetId].owner == msg.sender, "only owner");
        require(!assets[assetId].revoked, "asset revoked");
        require(recipient != address(0) && permissionType != PermissionType.None, "invalid permission");
        require(expiresAt > block.timestamp, "expiry must be future");
        permissions[assetId][recipient] = Permission(permissionType, expiresAt, true);
        emit AccessGranted(assetId, recipient, permissionType, expiresAt);
    }

    function revokeAccess(bytes32 assetId, address recipient) external {
        require(assets[assetId].owner == msg.sender, "only owner");
        require(permissions[assetId][recipient].active, "permission not active");
        permissions[assetId][recipient].active = false;
        emit AccessRevoked(assetId, recipient);
    }

    function checkAccess(bytes32 assetId, address recipient, PermissionType requiredPermission) external view returns (bool) {
        Asset memory asset = assets[assetId];
        Permission memory permission = permissions[assetId][recipient];
        return asset.owner != address(0) && !asset.revoked && permission.active && permission.expiresAt > block.timestamp && permission.permissionType == requiredPermission;
    }
}
