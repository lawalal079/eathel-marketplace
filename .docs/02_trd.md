# Technical Requirements Document (TRD)

## 1. Frontend Architecture (Next.js App Router)
*   **Framework**: Next.js 16+ using the App Router (`src/app/` directory).
*   **Language**: TypeScript for complete compile-time type safety.
*   **Styling**: Tailwind CSS with custom utility overrides to support the high-contrast corporate obsidian theme.
*   **Icons**: `@phosphor-icons/react` for sleek, unified line-art icon design.

---

## 2. Infrastructure & Database (Supabase PostgreSQL)
*   **Database**: Supabase PostgreSQL hosting database state.
*   **Realtime**: Supabase subscription endpoints to stream execution logs dynamically to the front-end playground consoles.
*   **Authentication**: Supabase Auth handling the OAuth login lifecycle, mapping user IDs seamlessly to their internal Circle Wallet metadata.
*   **Row-Level Security (RLS)**: Enforced database-level protection preventing cross-tenant visibility.

---

## 3. Web3 & Smart Contracts (Wagmi, Viem, Foundry)
*   **Wagmi & Viem**: Used for managing EOA wallet connections, handling network switches, and signing messages or payload proofs.
*   **Smart Contracts**:
    *   Developed using the **Foundry** toolchain (`forge` for builds, tests, and deployments).
    *   **Escrow System**: A secure, audited Solidity contract storing user USDC balances and handling payouts via cryptographic multi-signatures or oracle execution proofs.
    *   **Agent Registry**: Optional on-chain NFT registry for developer-signed agents.
