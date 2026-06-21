# Backend Database Schema Matrix

## 1. Relational Table Schema Maps

### 1.1 `users_profile` Table
*   **id**: `uuid` (Primary Key, matches Supabase auth.users)
*   **email**: `varchar(255)`
*   **wallet_address**: `varchar(42)` (Optional, Wagmi EOA mapping)
*   **circle_wallet_id**: `varchar(255)` (Circle Programmable Wallet Identifier)
*   **gas_tank_balance**: `numeric(12, 6)` (Escrow balance in USDC)
*   **created_at**: `timestamp`

### 1.2 `agent_registry` Table
*   **id**: `uuid` (Primary Key)
*   **developer_id**: `uuid` (Foreign Key -> users_profile.id)
*   **name**: `varchar(100)`
*   **description**: `text`
*   **price_per_run**: `numeric(10, 6)` (Execution cost in USDC)
*   **webhook_url**: `text`
*   **tags**: `text[]` (Array of tags, e.g. ["NLP", "Web3"])
*   **created_at**: `timestamp`

### 1.3 `execution_logs` Table
*   **id**: `uuid` (Primary Key)
*   **user_id**: `uuid` (Foreign Key -> users_profile.id)
*   **agent_id**: `uuid` (Foreign Key -> agent_registry.id)
*   **status**: `varchar(50)` (e.g., "COMPLETED", "FAILED")
*   **cost_incurred**: `numeric(10, 6)` (USDC price deducted)
*   **response_time_ms**: `integer`
*   **created_at**: `timestamp`

---

## 2. Row-Level Security (RLS) Guardrails

```sql
-- Enable RLS on all tables
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- users_profile policy: Users can only read/edit their own data
CREATE POLICY user_read_own_profile ON users_profile
    FOR ALL USING (auth.uid() = id);

-- agent_registry policy: Anyone can read agents; only developers can edit/delete
CREATE POLICY public_read_agents ON agent_registry
    FOR SELECT USING (true);

CREATE POLICY developer_modify_own_agents ON agent_registry
    FOR ALL USING (auth.uid() = developer_id);

-- execution_logs policy: Users can only view their own execution history
CREATE POLICY user_view_own_logs ON execution_logs
    FOR SELECT USING (auth.uid() = user_id);
```
