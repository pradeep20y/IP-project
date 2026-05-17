# Art Chain — Decentralized NFT Art Marketplace

A full-stack NFT marketplace for protecting and monetizing digital art on Ethereum.
Artists mint their work as ERC-721 NFTs with on-chain EIP-2981 royalties that pay
out automatically on every secondary sale.

## Stack

| Layer        | Tech                                              |
| ------------ | ------------------------------------------------- |
| Smart contracts | Solidity 0.8.24 + Hardhat + OpenZeppelin v5   |
| Frontend     | React 18 + Vite + wagmi v2 + RainbowKit v2         |
| Wallet       | MetaMask (and any WalletConnect-compatible wallet) |
| Chain target | Ethereum Sepolia testnet (chainId 11155111)        |
| Storage      | Mock IPFS (localStorage) — swap in Pinata later   |

## Features

- **MetaMask login** — no usernames/passwords; wallet address is identity
- **Mint** — upload artwork, set title/description/category/royalty %, mint as ERC-721
- **Marketplace listings** — fixed-price listings with browse, filter, search, sort
- **EIP-2981 royalties** — original creator earns a % on every resale, paid on-chain
- **Platform fee** — owner-configurable, capped at 10%, withdrawable
- **Transaction history** — minted/listed/bought/sold events per wallet
- **Admin panel** — owner-only fee config + content flagging

## Project layout

```
.
├── contracts/      # Hardhat project (Solidity + tests + deploy)
│   ├── contracts/
│   │   ├── NFTCollection.sol
│   │   └── Marketplace.sol
│   ├── test/
│   ├── scripts/
│   └── hardhat.config.js
├── frontend/       # Vite + React app
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── lib/        # mock IPFS, formatting
│       ├── config/     # wagmi + contract addresses
│       └── abi/        # contract ABIs
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- A wallet (MetaMask) with some Sepolia ETH — grab some from a faucet such as
  [sepoliafaucet.com](https://sepoliafaucet.com)
- A Sepolia RPC URL — free tier from [Alchemy](https://alchemy.com) or
  [Infura](https://infura.io) works fine
- A [WalletConnect Cloud](https://cloud.walletconnect.com) project ID (free)

## 1. Smart contracts

```powershell
cd contracts
npm install
copy .env.example .env       # then edit .env with your RPC URL + throwaway PRIVATE_KEY
npm run compile
npm test
```

You should see all tests pass (NFTCollection + Marketplace).

### Deploy to Sepolia

```powershell
npm run deploy:sepolia
```

The deploy script:
1. Deploys `NFTCollection` (ERC-721 + EIP-2981)
2. Deploys `Marketplace` with a default 2.5% platform fee
3. Writes addresses to `contracts/deployments/sepolia.json`
4. Exports the compiled ABIs into `frontend/src/abi/`
5. Prints the three values you need to paste into `frontend/.env`

### Deploy locally (optional)

In one terminal:
```powershell
cd contracts
npm run node
```
In another:
```powershell
cd contracts
npm run deploy:local
```

## 2. Frontend

```powershell
cd frontend
npm install
copy .env.example .env       # edit with the addresses printed by the deploy script
npm run dev
```

App runs on http://localhost:5173.

### What goes in `frontend/.env`

```
VITE_NFT_ADDRESS=0x...               # from deploy output
VITE_MARKETPLACE_ADDRESS=0x...       # from deploy output
VITE_CHAIN_ID=11155111               # Sepolia (use 31337 for local Hardhat)
VITE_WALLETCONNECT_PROJECT_ID=...    # from cloud.walletconnect.com
```

## End-to-end flow

1. **Connect** — click "Connect Wallet" in the navbar, pick MetaMask, switch to Sepolia
2. **Mint** — go to `/mint`, upload an image, fill in metadata, choose royalty %, mint
3. **List** — open the new NFT from `/me`, approve the marketplace, set a price
4. **Browse** — buyers see it on `/`, filter by price/category, click to view detail
5. **Buy** — buyer hits "Buy for X ETH" → contract splits funds (creator + platform + seller)
6. **History** — both sides see the transaction under `/me` → History tab
7. **Resale** — buyer can re-list; on next sale the original creator still receives the royalty

## Swapping the mock IPFS for real Pinata

The mock IPFS module ([frontend/src/lib/ipfs.js](frontend/src/lib/ipfs.js)) stores
files in `localStorage` keyed by a fake CID (`mock://...`). To go live with real IPFS:

1. Sign up at [pinata.cloud](https://pinata.cloud) and get a JWT
2. Replace `uploadFile` and `uploadMetadata` in `ipfs.js` with HTTP POSTs to
   `https://api.pinata.cloud/pinning/pinFileToIPFS` and `pinJSONToIPFS`
3. Return `ipfs://<cid>` instead of `mock://<cid>` — the rest of the app already
   handles both prefixes via `resolveTokenURI`

## Security notes

This is demo/educational code. Before production you should:

- Use a hardware wallet or vault for the deployer key (never a hot wallet for owner)
- Add per-listing expiry and a circuit breaker (`Pausable`) for emergencies
- Have the contracts professionally audited (especially the royalty/payment math)
- Run [Slither](https://github.com/crytic/slither) and fuzz-test the marketplace
- Consider pull-payment pattern for seller/royalty payouts to avoid grief vectors
- Move file storage to actual IPFS — `localStorage` is per-browser and easily lost

## Scripts cheatsheet

```powershell
# Contracts
cd contracts
npm run compile          # solc compile
npm test                 # full test suite
npm run deploy:sepolia   # deploy + export ABIs
npm run export-abis      # re-export ABIs without redeploy

# Frontend
cd frontend
npm run dev              # vite dev server
npm run build            # production build
npm run preview          # preview production build
```

## License

MIT
