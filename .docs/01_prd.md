# Product Requirements Document (PRD)

## 1. System Scope & Product Definition
Lumina AI Agent Marketplace is an enterprise-grade, high-performance platform where organizations and developers discover, test, deploy, and monitor self-contained AI agents. The platform runs on a premium Web3 design language, blending deep obsidian aesthetics with absolute transactional transparency.

---

## 2. Core User Personas & Flows

### 2.1 Corporate End-User
*   **Onboarding**: Email-based corporate social sign-in.
*   **Wallet Experience**: Gasless, embedded execution. Behind the scenes, an institutional wallet engine (e.g., Circle Programmable Wallets) functions as the user's "Gas Tank." Users load this tank with USDC via standard credit card invoices or corporate transfers.
*   **Primary Tasks**: Browse agents in the Marketplace, test agents using a real-time console, deploy agents to dedicated serverless API endpoints, and view historical billing invoices.

### 2.2 Autonomous Agent Developer
*   **Onboarding**: Self-custodial connection (Metamask, Coinbase Wallet, WalletConnect) using Wagmi/Viem.
*   **Primary Tasks**: Register new AI agents on the marketplace platform, define custom execution price matrices (per-run cost in USDC), set up agent logic Webhooks, and collect earned revenue directly into their Web3 address.

---

## 3. Dual-Wallet Architecture Engine

| Feature | Embedded Wallet (Gas Tank) | External EOA (Wagmi/Viem) |
| :--- | :--- | :--- |
| **Target Audience** | Corporate End-Users / Operators | Web3 Developers / Agent Creators |
| **Authentication** | OAuth / Enterprise Social / Supabase Auth | Cryptographic Signature (Web3) |
| **Gas Policy** | Gasless (Sponsored via Relayer or Circle API) | User Pays Gas (Native ETH/POL/etc.) |
| **Token Balance** | Tracked via USDC Escrow Smart Contract / DB | Direct on-chain wallet balance |

---

## 4. USDC Transactional Escrow & Nano-Payment Logic
*   **Asset Pricing**: Agent runs are priced in micro-fractions of USDC (e.g., $0.001 per run).
*   **Payment Flow**:
    1.  **Fund**: End-user deposits USDC into the Marketplace Escrow Smart Contract (or internal custodial account).
    2.  **Deploy & Run**: User calls the agent endpoint.
    3.  **Deduct**: On successful run, a serverless hook calculates the agent's price and executes a nano-deduction from the user's escrow balance.
    4.  **Disburse**: Deducted fees are routed:
        *   **90%** directly to the Agent Developer's registered wallet.
        *   **10%** protocol fee to the Lumina platform treasury.
