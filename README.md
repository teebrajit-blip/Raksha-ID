# Raksa ID

Raksa ID is a Web2 identity and digital-asset platform with Polygon used as a selective integrity, ownership, permission, and audit layer. Sensitive identity data and documents remain off-chain.

## Current capabilities

- Next.js dashboard with identity, assets, access, and verification views
- Wallet nonce authentication with HttpOnly sessions
- Wallet-scoped asset ownership
- Private local document storage and SHA-256 hashing
- Server-side document integrity verification
- MongoDB persistence when enabled, with an explicit development memory fallback
- Solidity registry with ownership, revocation, permissions, expiry, and events
- Polygon Amoy read-only verification and wallet-driven registration handoff

## Repository layout

- `frontend/` Next.js App Router application
- `backend/` Express API, authentication, storage, persistence, and blockchain adapter
- `contracts/` Solidity registry and Hardhat tests/deployment
- `docs/` architecture and deployment runbooks

## Quick start

Requirements: Node.js 20+ and Docker Desktop for local MongoDB.

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item contracts/.env.example contracts/.env
npm run dev:db
```

Set `MONGODB_ENABLED=true` in `backend/.env` when the MongoDB container is running. Start the applications in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

Open `http://localhost:3000`.

## Validation

```powershell
npm run build
npm test
```

## Polygon Amoy

Deployment requires a locally supplied, funded deployer wallet. Never commit the private key or expose it through `NEXT_PUBLIC_*` variables. Follow [docs/deployment.md](docs/deployment.md) for deployment and environment configuration.

- `frontend/` Next.js App Router application
- `backend/` Express API boundary (to be implemented in the next slice)
- `contracts/` Solidity and Hardhat workspace (to be implemented in the next slice)
- `docs/` architecture and API contracts

## Local development

```powershell
cd frontend
npm run dev
```


## Build

```powershell
cd frontend
npm run build
```

## Delivery order

1. Backend foundation and environment validation
2. MongoDB models and wallet nonce authentication
3. Storage abstraction, upload validation, and SHA-256 hashing
4. Asset lifecycle and smart contract tests
5. Polygon Amoy registration and transaction synchronization
6. Verification, permissions, issuer workflows, notifications, and audit history
