# Deployment and local operations

## Local development

1. Install Node.js 20+ and Docker Desktop.
2. Install all workspace dependencies:

```powershell
npm run install:all
```

3. Start MongoDB:

```powershell
npm run dev:db
```

4. Copy environment templates:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item contracts/.env.example contracts/.env
```

5. Set `MONGODB_ENABLED=true` in `backend/.env` when MongoDB is running.
6. Start the API and frontend in separate terminals:

```powershell
npm run dev:backend
npm run dev:frontend
```

The API runs on `http://localhost:4000`; the frontend runs on `http://localhost:3000`.

## Local contract deployment

For a complete local wallet flow without Amoy funds, use Hardhat's local EVM:

Terminal 1:

```powershell
cd contracts
npx hardhat node
```

Terminal 2:

```powershell
npm run deploy:local --prefix contracts
```

Import one of the private test accounts printed by `hardhat node` into MetaMask and switch MetaMask to:

```text
Network name: Raksa Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency symbol: ETH
```

Copy the address from `contracts/deployments/local.json` into both `CONTRACT_ADDRESS` and `NEXT_PUBLIC_CONTRACT_ADDRESS`. Restart the API and frontend. This local chain is disposable and is not Polygon Amoy.

## Polygon Amoy deployment

The deployer key must be supplied locally in `contracts/.env` and must never be committed or placed in a `NEXT_PUBLIC_*` variable.

1. Fund the deployer wallet with Polygon Amoy test MATIC.
2. Set `POLYGON_AMOY_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in `contracts/.env`.
3. Compile and test:

```powershell
npm run build:contracts
npm run test:contracts
```

4. Deploy:

```powershell
npm run deploy:amoy --prefix contracts
```

5. Copy the printed registry address into:

```text
backend/.env: CONTRACT_ADDRESS=<address>
frontend/.env.local: NEXT_PUBLIC_CONTRACT_ADDRESS=<address>
```

6. Restart the API and frontend. Verification will then query the deployed registry, and pending assets will expose the wallet registration action.

## Production notes

- Use a managed MongoDB deployment and set `MONGODB_ENABLED=true`.
- Replace the local private storage adapter with S3-compatible object storage and signed URLs.
- Use a strong random `SESSION_SECRET` and HTTPS.
- Keep `DEPLOYER_PRIVATE_KEY`, `MONGODB_URI`, storage credentials, and session secrets server-side.
- Run `npm run build` and `npm test` before deployment.
