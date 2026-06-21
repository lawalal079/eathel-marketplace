# System Navigation & Application Flow

## 1. Map of Application Routes

```
[Public Landing]
       │
       ├─► [Marketplace Catalog] (Browse Agents)
       │         │
       │         └─► [Agent Details Page]
       │                   │
       │                   ├─► [Interactive Playground] (Requires Auth)
       │                   └─► [Deploy Serverless API Node] (Requires Funded Escrow)
       │
       ├─► [Developer Console] (Wagmi EOA Connection)
       │         │
       │         └─► [Agent Registration / Metrics Dashboard]
       │
       └─► [User Hub] (Supabase OAuth social login)
                 │
                 ├─► [Internal "Gas Tank" / Escrow Billing]
                 └─► [Deployment Management Panel]
```

---

## 2. Interactive States & Transaction Flows

### 2.1 Playground Live Preview
1.  User clicks **"Test Agent"** in the Marketplace.
2.  Playground mounts a WebSocket or dynamic stream to the serverless container.
3.  User inputs query parameter payloads.
4.  Playground displays real-time execution outputs. The preview costs $0.00 in demo mode but requires a valid user session.

### 2.2 Serverless Deployment Flow
1.  User clicks **"Deploy Node"** on a selected Agent.
2.  Lumina Backend verifies the user's `gas_tank` escrow balance has enough USDC to support the initial run pool.
3.  Database provisions a unique API endpoint under the user's registry.
4.  Each API execution triggers an automated micro-payment transaction, instantly deducting from the user's Supabase balance / Escrow ledger.
