# Raksa ID Technical Architecture

## Core boundary

Raksa ID has three application layers and one trust layer:

- **Frontend:** presents identity, asset, access, verification, issuer, and transaction workflows.
- **Backend:** authenticates wallets with nonce-based signatures, authorizes application actions, validates uploads, orchestrates storage, persists application state, and indexes chain events.
- **MongoDB:** stores users, identities, asset metadata, storage references, requests, permissions, transactions, notifications, and audit metadata.
- **Storage:** stores private documents and returns short-lived signed download URLs.
- **Polygon:** stores only the minimum tamper-evident state: asset hash, owner, issuer, permission state, revocation, and events.

The wallet authorizes blockchain writes. A wallet address alone is not an authenticated application session.

## Asset lifecycle

```text
DRAFT -> UPLOADING -> HASHED -> PENDING_BLOCKCHAIN -> REGISTERED -> REVOKED
```

A database asset is not shown as blockchain registered until the transaction is confirmed and the event or receipt has synchronized back to the backend.

## Permission lifecycle

```text
REQUESTED -> APPROVED -> ACTIVE -> EXPIRED
REQUESTED -> REJECTED
ACTIVE -> REVOKED
```

Permission types are intentionally separate: `VIEW`, `VERIFY`, `DOWNLOAD`, and `SHARE`. Granting one does not imply the others.

## Verification result

Verification reports separate claims:

1. Document integrity: submitted bytes match the registered SHA-256 hash.
2. Blockchain registration: the referenced asset exists on the configured network.
3. Issuer status: the issuer is approved by the application.
4. Ownership: the recorded owner matches the asset record.
5. Revocation: the asset and credential are not revoked.
6. Access authorization: the requesting party has the required permission.

A matching hash proves byte-level integrity, not the truth of every statement in a document.

## Initial routes

- `POST /api/auth/nonce`
- `POST /api/auth/verify`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET|POST|PATCH /api/identity`
- `GET|POST /api/assets`
- `GET|PATCH /api/assets/:assetId`
- `POST /api/verify`
- `GET|POST /api/assets/:assetId/access`
- `POST /api/access-requests/:requestId/approve`
- `POST /api/access-requests/:requestId/reject`
- `GET /api/transactions`

All responses use `{ success: true, data }` or `{ success: false, error: { code, message } }`.
