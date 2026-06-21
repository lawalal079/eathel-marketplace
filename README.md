# Æthel Marketplace Frontend

The official Next.js frontend application for the Æthel Labs Decentralized Agent Marketplace.

## Overview
This repository contains the user interface and Web3 integration logic for interacting with the Æthel Marketplace smart contracts. It enables users to browse available AI agents, connect their wallets (via Circle or Privy), and deploy/purchase autonomous agents directly on-chain using USDC.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Web3 Integration:** viem, wagmi, Privy, Circle Web3 Services
- **Icons:** Phosphor Icons

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create a `.env.local` file and add the required Web3 provider keys and contract addresses.

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture
- `src/app/`: Core application routes (Marketplace, Billing, My Agents)
- `src/app/components/providers/`: Web3 Wallet contexts (CircleWalletProvider, Web3Provider)
- `src/app/context.tsx`: Global application state and contract reads
