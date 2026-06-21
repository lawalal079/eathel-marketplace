'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPublicClient, http, parseAbi, decodeFunctionData, type Address } from 'viem';
import { User, Agent, ExecutionLog } from '../types';
import { CircleWalletProvider, useCircleWallet } from './components/providers/CircleWalletProvider';

// ─── Chain & public client (read-only) ────────────────────────────────────────

const _CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '5042002', 10);
const _RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.testnet.arc.network';
const _PROXY_ADDR = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ?? '') as Address;
// Start scanning from the block the contract was deployed — not genesis.
// This avoids scanning millions of irrelevant blocks on every page load.
const _DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_MARKETPLACE_DEPLOY_BLOCK ?? '0');

const _arcChain = {
  id: _CHAIN_ID,
  name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: { default: { http: [_RPC_URL] }, public: { http: [_RPC_URL] } },
} as const;

const _publicClient = createPublicClient({ chain: _arcChain as any, transport: http(_RPC_URL) });

const _MARKETPLACE_ABI = parseAbi([
  'event AgentListed(string indexed agentId, uint256 price, string metadataUri, address indexed developer)',
  'event AgentPurchased(address indexed buyer, string indexed agentId, uint256 totalPaid)',
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)',
]);

const _USDC_ADDR = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '') as Address;

const _USDC_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

// ─── XSS-safe sanitizer ───────────────────────────────────────────────────────

/**
 * Strips HTML tags, script payloads, javascript: URIs, and on* event handlers
 * from developer-supplied strings before rendering them in the UI.
 */
function sanitizeString(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw
    // Remove all HTML / XML tags
    .replace(/<[^>]*>/g, '')
    // Neutralise javascript: URIs (case-insensitive, with optional whitespace)
    .replace(/javascript\s*:/gi, 'blocked:')
    // Remove inline event handlers (onload=, onclick=, onerror= …)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Collapse encoded angle brackets
    .replace(/&lt;/gi, '').replace(/&gt;/gi, '')
    // Trim excess whitespace
    .trim()
    // Hard cap at 512 chars to prevent UI flooding
    .slice(0, 512);
}

// ─── Context shape ─────────────────────────────────────────────────────────────

interface AppContextType {
  // ── App state ─────────────────────────────────────────────────────────────
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  activeTab: 'marketplace' | 'my-agents' | 'workflows' | 'billing';
  setActiveTab: (tab: 'marketplace' | 'my-agents' | 'workflows' | 'billing') => void;
  agents: Agent[];
  deployedAgentIds: string[];
  executionLogs: ExecutionLog[];
  deployAgent: (agentId: string) => Promise<boolean>;
  recordDeployment: (agentId: string, txHash?: string) => void;
  topUpBalance: (amount: number) => void;
  selectedAgentForDeploy: Agent | null;
  setSelectedAgentForDeploy: (agent: Agent | null) => void;
  runMission: (agentId: string, missionText: string) => Promise<string>;

  // ── Wallet (read-only mirrors from wagmi via CircleWalletProvider) ─────────
  walletAddress: string | null;
  isConnected: boolean;
  usdcBalance: string;
  refreshBalance: () => Promise<void>;
}

// ─── Default data ──────────────────────────────────────────────────────────────

const defaultUser: User = {
  id: 'usr_01j7x',
  email: 'corporate.admin@aethellabs.com',
  wallet_type: 'CIRCLE',
  usdc_account_balance: 0.00,
};

const initialAgents: Agent[] = [];

const initialLogs: ExecutionLog[] = [];

// ─── Inner context (reads from wagmi via CircleWalletProvider) ─────────────────

const AppContext = createContext<AppContextType | undefined>(undefined);

function AppProviderInner({ children }: { children: React.ReactNode }) {
  const { walletAddress, isConnected, usdcBalance: onChainBalance, refreshBalance } = useCircleWallet();

  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-agents' | 'workflows' | 'billing'>('marketplace');
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [deployedAgentIds, setDeployedAgentIds] = useState<string[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>(initialLogs);

  // Load cached agents from localStorage on mount (synchronously sets state if found)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('aethel_marketplace_agents');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAgents(parsed);
          }
        }
      } catch (e) {
        console.warn('[context] Failed to load cached agents from localStorage:', e);
      }
    }
  }, []);

  // ── Load live on-chain agents — full chain paginated scan ─────────────────
  //    Optimised with Promise.all parallel chunking, background caching,
  //    and incremental delta sync to achieve sub-second cold load times.
  useEffect(() => {
    if (!_PROXY_ADDR) return;

    let cancelled = false;

    const loadAgents = async () => {
      try {
        const CHUNK_SIZE = 9500n;
        const latestBlock = await _publicClient.getBlockNumber();

        // 1. Load cached agents and last scanned block from localStorage
        let cachedAgents: Agent[] = [];
        let startBlock = _DEPLOY_BLOCK;

        if (typeof window !== 'undefined') {
          try {
            const cached = localStorage.getItem('aethel_marketplace_agents');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                cachedAgents = parsed;
              }
            }

            const lastScanned = localStorage.getItem('aethel_marketplace_last_scanned_block');
            if (lastScanned) {
              const parsedBlock = BigInt(lastScanned);
              // Ensure lastScannedBlock is valid and in-bounds
              if (parsedBlock >= _DEPLOY_BLOCK && parsedBlock <= latestBlock) {
                startBlock = parsedBlock + 1n;
              }
            }
          } catch (e) {
            console.warn('[context] Failed to load cached state:', e);
          }
        }

        // 2. Refresh/verify status of all cached agents in parallel (to catch updates/delistings)
        let verifiedCached: Agent[] = [];
        if (cachedAgents.length > 0) {
          const verifyPromises = cachedAgents.map(async (agent) => {
            try {
              const entry = await _publicClient.readContract({
                address: _PROXY_ADDR,
                abi: _MARKETPLACE_ABI,
                functionName: 'marketRegistry',
                args: [agent.id],
              }) as readonly [string, Address, bigint, boolean, string];

              const [agentId, , price, isListed, metadataUri] = entry;
              if (!isListed || agentId === "") return null;

              let title = agentId;
              let description = '';
              let icon = '';
              try {
                const parsed = JSON.parse(metadataUri);
                title = sanitizeString(parsed.title ?? agentId);
                description = sanitizeString(parsed.description ?? '');
                icon = sanitizeString(parsed.icon ?? '');
              } catch {
                title = sanitizeString(metadataUri || agentId);
              }

              return {
                ...agent,
                name: title,
                description: description,
                usdc_price: Number(price) / 1_000_000,
                tags: [icon].filter(Boolean),
                category: icon || 'General',
                metadataUri: sanitizeString(metadataUri),
              };
            } catch (err) {
              // RPC failed — return cached version to prevent UI flicker
              return agent;
            }
          });

          const verifiedResults = await Promise.all(verifyPromises);
          verifiedCached = verifiedResults.filter((a): a is Agent => a !== null);
        }

        // 3. Scan for NEW listings in parallel chunks
        const newLogs: any[] = [];
        if (startBlock <= latestBlock) {
          const chunkPromises = [];
          for (let chunkStart = startBlock; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
            const chunkEnd = chunkStart + CHUNK_SIZE - 1n < latestBlock
              ? chunkStart + CHUNK_SIZE - 1n
              : latestBlock;

            chunkPromises.push(
              _publicClient.getLogs({
                address: _PROXY_ADDR,
                event: _MARKETPLACE_ABI[0] as any,
                fromBlock: chunkStart,
                toBlock: chunkEnd,
              }).catch(err => {
                console.warn(`[context] Failed to scan range ${chunkStart} - ${chunkEnd}:`, err);
                return [] as any[];
              })
            );
          }

          const chunkResults = await Promise.all(chunkPromises);
          newLogs.push(...chunkResults.flat());
        }

        if (cancelled) return;

        // 4. Resolve details for all newly discovered logs in parallel
        const seenIds = new Set<string>(verifiedCached.map(a => a.id));
        const resolvedNew: Agent[] = [];

        if (newLogs.length > 0) {
          const resolvePromises = newLogs.map(async (log) => {
            const args = (log as any).args as {
              agentId: string;
              price: bigint;
              metadataUri: string;
              developer: Address;
            };
            if (!args?.agentId) return null;

            const topicIdHash = args.agentId;

            try {
              let targetId = topicIdHash;
              if (topicIdHash.startsWith('0x') && topicIdHash.length === 66) {
                try {
                  const tx = await _publicClient.getTransaction({ hash: log.transactionHash });
                  const coderAbi = parseAbi(['function listAgent(string agentId, uint256 price, string metadataUri)']);
                  const { args: decodedArgs } = decodeFunctionData({
                    abi: coderAbi,
                    data: tx.input
                  });
                  if (decodedArgs && decodedArgs[0]) {
                    targetId = decodedArgs[0] as string;
                  }
                } catch {
                  // Fallback decoding
                }
              }

              if (seenIds.has(targetId)) return null;

              const entry = await _publicClient.readContract({
                address: _PROXY_ADDR,
                abi: _MARKETPLACE_ABI,
                functionName: 'marketRegistry',
                args: [targetId],
              }) as readonly [string, Address, bigint, boolean, string];

              const [agentId, , price, isListed, metadataUri] = entry;
              if (!isListed || agentId === "") return null;

              let title = agentId;
              let description = '';
              let icon = '';
              try {
                const parsed = JSON.parse(metadataUri);
                title = sanitizeString(parsed.title ?? agentId);
                description = sanitizeString(parsed.description ?? '');
                icon = sanitizeString(parsed.icon ?? '');
              } catch {
                title = sanitizeString(metadataUri || agentId);
              }

              return {
                id: sanitizeString(targetId),
                name: title,
                description: description,
                usdc_price: Number(price) / 1_000_000,
                rating: 4.8,
                review_count: 0,
                tags: [icon].filter(Boolean),
                category: icon || 'General',
                metadataUri: sanitizeString(metadataUri),
              };
            } catch (err) {
              return null;
            }
          });

          const resolvedResults = await Promise.all(resolvePromises);
          for (const agent of resolvedResults) {
            if (agent && !seenIds.has(agent.id)) {
              seenIds.add(agent.id);
              resolvedNew.push(agent);
            }
          }
        }

        if (cancelled) return;

        // 5. Merge, update state, and save to cache
        const finalAgents = [...verifiedCached, ...resolvedNew];
        setAgents(finalAgents);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('aethel_marketplace_agents', JSON.stringify(finalAgents));
            localStorage.setItem('aethel_marketplace_last_scanned_block', latestBlock.toString());
          } catch (e) {
            console.warn('[context] Failed to save state to localStorage:', e);
          }
        }
      } catch (err) {
        console.warn('[context] Failed to load on-chain agents:', err);
      }
    };

    void loadAgents();
    return () => { cancelled = true; };
  }, []);

  // ── Real-time watcher: pick up any AgentListed event from any dev instantly ─
  //    The paginated crawl covers history; this covers the present and future.
  //    When a new agent is listed while the marketplace is open, it streams in
  //    without requiring a page refresh.
  useEffect(() => {
    if (!_PROXY_ADDR) return;

    const unwatch = _publicClient.watchContractEvent({
      address: _PROXY_ADDR,
      abi: _MARKETPLACE_ABI,
      eventName: 'AgentListed',
      onLogs: async (logs) => {
        for (const log of logs) {
          const { agentId } = (log as any).args as { agentId: string };
          if (!agentId) continue;
          try {
            let targetId = agentId;
            if (agentId.startsWith('0x') && agentId.length === 66) {
              try {
                const tx = await _publicClient.getTransaction({ hash: log.transactionHash });
                const coderAbi = parseAbi(['function listAgent(string agentId, uint256 price, string metadataUri)']);
                const { args: decodedArgs } = decodeFunctionData({
                  abi: coderAbi,
                  data: tx.input
                });
                if (decodedArgs && decodedArgs[0]) {
                  targetId = decodedArgs[0] as string;
                }
              } catch {
                // Decoding failed — targetId stays as hash, agent will be skipped.
              }
            }

            const entry = await _publicClient.readContract({
              address: _PROXY_ADDR,
              abi: _MARKETPLACE_ABI,
              functionName: 'marketRegistry',
              args: [targetId],
            }) as readonly [string, Address, bigint, boolean, string];

            const [id, , price, isListed, metadataUri] = entry;
            if (!isListed) continue;

            let title = id;
            let description = '';
            let icon = '';
            try {
              const parsed = JSON.parse(metadataUri);
              title = sanitizeString(parsed.title ?? id);
              description = sanitizeString(parsed.description ?? '');
              icon = sanitizeString(parsed.icon ?? '');
            } catch {
              title = sanitizeString(metadataUri || id);
            }

            const newAgent: Agent = {
              id: sanitizeString(targetId),
              name: title,
              description: description,
              usdc_price: Number(price) / 1_000_000,
              rating: 4.8,
              review_count: 0,
              tags: [icon].filter(Boolean),
              category: icon || 'General',
              metadataUri: sanitizeString(metadataUri),
            };

            // Append only if not already present (dedup guard) and save to cache
            setAgents(prev => {
              if (prev.some(a => a.id === newAgent.id)) return prev;
              const nextAgents = [...prev, newAgent];
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('aethel_marketplace_agents', JSON.stringify(nextAgents));
                } catch (e) {
                  console.warn('[context] Failed to write new agent to localStorage:', e);
                }
              }
              return nextAgents;
            });
          } catch {
            // readContract failed — skip this agent
          }
        }
      },
    });

    return () => { unwatch(); };
  }, []);

  // ── Load live on-chain user transaction logs ───────────────────────────────
  useEffect(() => {
    if (!walletAddress) {
      setExecutionLogs([]);
      return;
    }

    let cancelled = false;

    const formatBlockTimestamp = (timestampInSeconds: number) => {
      const date = new Date(timestampInSeconds * 1000);
      return date
        .toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
        .replace(',', ' ·');
    };

    const fetchRealLogs = async () => {
      try {
        const currentAddress = walletAddress as Address;
        const CHUNK_SIZE = 9500n;
        const latestBlock = await _publicClient.getBlockNumber();

        // 1. Fetch AgentPurchased logs for this user as buyer
        const purchaseLogs: any[] = [];
        for (let chunkStart = _DEPLOY_BLOCK; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
          const chunkEnd = chunkStart + CHUNK_SIZE - 1n < latestBlock ? chunkStart + CHUNK_SIZE - 1n : latestBlock;
          try {
            const chunk = await _publicClient.getLogs({
              address: _PROXY_ADDR,
              event: _MARKETPLACE_ABI[1] as any, // AgentPurchased
              args: { buyer: currentAddress },
              fromBlock: chunkStart,
              toBlock: chunkEnd,
            });
            purchaseLogs.push(...chunk);
          } catch (e) {
            console.warn('[context] purchase logs fetch failed for chunk:', chunkStart, e);
          }
        }

        // 2. Fetch AgentListed logs for this user as developer
        const listingLogs: any[] = [];
        for (let chunkStart = _DEPLOY_BLOCK; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
          const chunkEnd = chunkStart + CHUNK_SIZE - 1n < latestBlock ? chunkStart + CHUNK_SIZE - 1n : latestBlock;
          try {
            const chunk = await _publicClient.getLogs({
              address: _PROXY_ADDR,
              event: _MARKETPLACE_ABI[0] as any, // AgentListed
              args: { developer: currentAddress },
              fromBlock: chunkStart,
              toBlock: chunkEnd,
            });
            listingLogs.push(...chunk);
          } catch (e) {
            console.warn('[context] listing logs fetch failed for chunk:', chunkStart, e);
          }
        }

        // 3. Fetch USDC Transfer logs:
        // A. From this user (Outgoing compute credit deposits to the marketplace contract)
        const transferFromLogs: any[] = [];
        for (let chunkStart = _DEPLOY_BLOCK; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
          const chunkEnd = chunkStart + CHUNK_SIZE - 1n < latestBlock ? chunkStart + CHUNK_SIZE - 1n : latestBlock;
          try {
            const chunk = await _publicClient.getLogs({
              address: _USDC_ADDR,
              event: _USDC_ABI[0] as any, // Transfer
              args: { from: currentAddress, to: _PROXY_ADDR },
              fromBlock: chunkStart,
              toBlock: chunkEnd,
            });
            transferFromLogs.push(...chunk);
          } catch (e) {
            console.warn('[context] transferFrom logs fetch failed for chunk:', chunkStart, e);
          }
        }

        // B. To this user (Incoming split payments or payouts from the marketplace contract)
        const transferToLogs: any[] = [];
        for (let chunkStart = _DEPLOY_BLOCK; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
          const chunkEnd = chunkStart + CHUNK_SIZE - 1n < latestBlock ? chunkStart + CHUNK_SIZE - 1n : latestBlock;
          try {
            const chunk = await _publicClient.getLogs({
              address: _USDC_ADDR,
              event: _USDC_ABI[0] as any, // Transfer
              args: { from: _PROXY_ADDR, to: currentAddress },
              fromBlock: chunkStart,
              toBlock: chunkEnd,
            });
            transferToLogs.push(...chunk);
          } catch (e) {
            console.warn('[context] transferTo logs fetch failed for chunk:', chunkStart, e);
          }
        }

        if (cancelled) return;

        // Group all logs by transaction hash to avoid duplicates and enrich each record
        const txMap = new Map<string, {
          hash: string;
          blockNumber: bigint;
          purchaseEvent?: any;
          listingEvent?: any;
          transfers: any[];
        }>();

        const getOrCreateTx = (log: any) => {
          const hash = log.transactionHash;
          if (!txMap.has(hash)) {
            txMap.set(hash, {
              hash,
              blockNumber: log.blockNumber,
              transfers: [],
            });
          }
          return txMap.get(hash)!;
        };

        for (const log of purchaseLogs) {
          getOrCreateTx(log).purchaseEvent = log;
        }
        for (const log of listingLogs) {
          getOrCreateTx(log).listingEvent = log;
        }
        for (const log of transferFromLogs) {
          getOrCreateTx(log).transfers.push(log);
        }
        for (const log of transferToLogs) {
          getOrCreateTx(log).transfers.push(log);
        }

        // Now, resolve block timestamps for the unique transactions.
        const uniqueBlocks = Array.from(new Set(Array.from(txMap.values()).map(tx => tx.blockNumber)));
        const blockTimestamps: Record<string, number> = {};

        await Promise.all(
          uniqueBlocks.map(async (blockNum) => {
            try {
              const block = await _publicClient.getBlock({ blockNumber: blockNum });
              blockTimestamps[blockNum.toString()] = Number(block.timestamp);
            } catch (err) {
              console.warn('[context] Failed to fetch block timestamp for', blockNum, err);
            }
          })
        );

        if (cancelled) return;

        // Map grouped transactions to ExecutionLog structure
        const realLogs: ExecutionLog[] = [];
        const txList = Array.from(txMap.values());
        txList.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        for (const tx of txList) {
          const timestampSec = blockTimestamps[tx.blockNumber.toString()] || Math.floor(Date.now() / 1000);
          const dateStr = formatBlockTimestamp(timestampSec);

          if (tx.purchaseEvent) {
            const args = tx.purchaseEvent.args;
            const agentId = args.agentId;
            const totalPaid = Number(args.totalPaid) / 1_000_000;

            const matchedAgent = agents.find(a => a.id === agentId);
            const agentName = matchedAgent ? matchedAgent.name : agentId;

            realLogs.push({
              id: `tx_${tx.hash.slice(2, 10)}`,
              agent_id: agentId,
              agent_name: agentName,
              timestamp: dateStr,
              status: 'SUCCESS',
              tx_type: 'Deployment',
              cost_usdc: totalPaid,
              tx_hash: `${tx.hash.slice(0, 8)}...${tx.hash.slice(-4)}`,
            });
          } else if (tx.listingEvent) {
            const args = tx.listingEvent.args;
            const agentId = args.agentId;

            const matchedAgent = agents.find(a => a.id === agentId);
            const agentName = matchedAgent ? matchedAgent.name : agentId;

            realLogs.push({
              id: `tx_${tx.hash.slice(2, 10)}`,
              agent_id: agentId,
              agent_name: agentName,
              timestamp: dateStr,
              status: 'SUCCESS',
              tx_type: 'Listing',
              cost_usdc: 0.00,
              tx_hash: `${tx.hash.slice(0, 8)}...${tx.hash.slice(-4)}`,
            });
          } else {
            // Standalone USDC transfers (like direct transfers or funding/withdrawing if any)
            const seenLogIndices = new Set<number>();
            for (const transfer of tx.transfers) {
              const logIndex = transfer.logIndex ?? 0;
              if (seenLogIndices.has(logIndex)) continue;
              seenLogIndices.add(logIndex);

              const { from, to, value } = transfer.args;
              const transferVal = Number(value) / 1_000_000;
              const isOutgoing = from?.toLowerCase() === walletAddress?.toLowerCase();

              realLogs.push({
                id: `tx_${tx.hash.slice(2, 10)}_${logIndex}`,
                agent_id: 'usdc_transfer',
                agent_name: isOutgoing ? 'Compute Credit Deposit' : 'USDC Transfer In',
                timestamp: dateStr,
                status: 'SUCCESS',
                tx_type: isOutgoing ? 'Transfer Out' : 'Transfer In',
                cost_usdc: isOutgoing ? transferVal : -transferVal,
                tx_hash: `${tx.hash.slice(0, 8)}...${tx.hash.slice(-4)}`,
              });
            }
          }
        }

        if (!cancelled) {
          setExecutionLogs(realLogs);
        }
      } catch (err) {
        console.error('[context] Error fetching real on-chain logs:', err);
      }
    };

    void fetchRealLogs();

    // Listen to real-time events to append to the log list instantly
    const unwatchPurchases = _publicClient.watchContractEvent({
      address: _PROXY_ADDR,
      abi: parseAbi(['event AgentPurchased(address indexed buyer, string indexed agentId, uint256 totalPaid)']),
      eventName: 'AgentPurchased',
      onLogs: async (logs) => {
        for (const log of logs) {
          const { buyer, agentId, totalPaid } = (log as any).args;
          if (buyer.toLowerCase() !== walletAddress.toLowerCase()) continue;
          
          let blockTimestamp = Math.floor(Date.now() / 1000);
          try {
            const block = await _publicClient.getBlock({ blockNumber: log.blockNumber });
            blockTimestamp = Number(block.timestamp);
          } catch {}

          const matchedAgent = agents.find(a => a.id === agentId);
          const agentName = matchedAgent ? matchedAgent.name : agentId;

          const newEntry: ExecutionLog = {
            id: `tx_${log.transactionHash.slice(2, 10)}`,
            agent_id: agentId,
            agent_name: agentName,
            timestamp: formatBlockTimestamp(blockTimestamp),
            status: 'SUCCESS',
            tx_type: 'Deployment',
            cost_usdc: Number(totalPaid) / 1_000_000,
            tx_hash: `${log.transactionHash.slice(0, 8)}...${log.transactionHash.slice(-4)}`,
          };

          setExecutionLogs(prev => {
            if (prev.some(l => l.tx_hash === newEntry.tx_hash)) return prev;
            return [newEntry, ...prev];
          });
        }
      }
    });

    const unwatchListings = _publicClient.watchContractEvent({
      address: _PROXY_ADDR,
      abi: parseAbi(['event AgentListed(string indexed agentId, uint256 price, string metadataUri, address indexed developer)']),
      eventName: 'AgentListed',
      onLogs: async (logs) => {
        for (const log of logs) {
          const { developer, agentId } = (log as any).args;
          if (developer.toLowerCase() !== walletAddress.toLowerCase()) continue;
          
          let blockTimestamp = Math.floor(Date.now() / 1000);
          try {
            const block = await _publicClient.getBlock({ blockNumber: log.blockNumber });
            blockTimestamp = Number(block.timestamp);
          } catch {}

          const matchedAgent = agents.find(a => a.id === agentId);
          const agentName = matchedAgent ? matchedAgent.name : agentId;

          const newEntry: ExecutionLog = {
            id: `tx_${log.transactionHash.slice(2, 10)}`,
            agent_id: agentId,
            agent_name: agentName,
            timestamp: formatBlockTimestamp(blockTimestamp),
            status: 'SUCCESS',
            tx_type: 'Listing',
            cost_usdc: 0.00,
            tx_hash: `${log.transactionHash.slice(0, 8)}...${log.transactionHash.slice(-4)}`,
          };

          setExecutionLogs(prev => {
            if (prev.some(l => l.tx_hash === newEntry.tx_hash)) return prev;
            return [newEntry, ...prev];
          });
        }
      }
    });

    return () => {
      cancelled = true;
      unwatchPurchases();
      unwatchListings();
    };
  }, [walletAddress, agents]);

  const [selectedAgentForDeploy, setSelectedAgentForDeploy] = useState<Agent | null>(null);

  // Sync live on-chain balance into currentUser
  useEffect(() => {
    if (isConnected && onChainBalance !== '0.00') {
      const parsed = parseFloat(onChainBalance);
      if (!isNaN(parsed)) {
        setCurrentUser(prev => ({ ...prev, usdc_account_balance: parsed, wallet_type: 'EOA' }));
      }
    }
  }, [isConnected, onChainBalance]);

  useEffect(() => {
    if (!isConnected) {
      setCurrentUser(prev => ({ ...prev, wallet_type: 'CIRCLE' }));
    }
  }, [isConnected]);

  // ── Hydrate deployedAgentIds from on-chain license state ────────────────────
  // Runs whenever the wallet address or the agent list changes, so purchased
  // agents are always visible even after a page refresh.
  useEffect(() => {
    if (!walletAddress || !_PROXY_ADDR || agents.length === 0) return;
    let cancelled = false;

    const checkLicenses = async () => {
      const _LICENSE_ABI = [
        {
          name: 'userLicenses',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: '', type: 'address' }, { name: '', type: 'string' }],
          outputs: [{ name: '', type: 'bool' }],
        },
      ] as const;

      const licensed: string[] = [];
      for (const agent of agents) {
        try {
          const has = await _publicClient.readContract({
            address: _PROXY_ADDR,
            abi: _LICENSE_ABI,
            functionName: 'userLicenses',
            args: [walletAddress as Address, agent.id],
          }) as boolean;
          if (has) licensed.push(agent.id);
        } catch {
          // skip on RPC error
        }
      }

      if (!cancelled && licensed.length > 0) {
        setDeployedAgentIds(prev => {
          const merged = [...prev];
          for (const id of licensed) {
            if (!merged.includes(id)) merged.push(id);
          }
          return merged;
        });
      }
    };

    void checkLicenses();
    return () => { cancelled = true; };
  }, [walletAddress, agents]);



  const deployAgent = async (agentId: string): Promise<boolean> => {
    const targetAgent = agents.find(a => a.id === agentId);
    if (!targetAgent) return false;

    if (currentUser.usdc_account_balance < targetAgent.usdc_price) {
      alert('Insufficient USDC balance. Please top up your Gas Tank.');
      return false;
    }

    setCurrentUser(prev => ({
      ...prev,
      usdc_account_balance: parseFloat((prev.usdc_account_balance - targetAgent.usdc_price).toFixed(4)),
    }));

    const newLog: ExecutionLog = {
      id: `tx_${Math.random().toString(36).substr(2, 9)}`,
      agent_id: targetAgent.id,
      agent_name: targetAgent.name.replace(/\s+/g, '_'),
      timestamp: new Date()
        .toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        .replace(',', ' ·'),
      status: 'SUCCESS',
      tx_type: 'Deployment',
      cost_usdc: targetAgent.usdc_price,
      tx_hash: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };

    setExecutionLogs(prev => [newLog, ...prev]);
    setDeployedAgentIds(prev => prev.includes(agentId) ? prev : [...prev, agentId]);
    return true;
  };

  /**
   * Records an on-chain confirmed deployment directly — skips the local
   * balance check because the transaction receipt already proves payment.
   * Called by marketplace.tsx after a successful purchaseAgent() tx.
   */
  const recordDeployment = (agentId: string, txHash?: string) => {
    const targetAgent = agents.find(a => a.id === agentId);
    if (!targetAgent) return;

    const newLog: ExecutionLog = {
      id: `tx_${Math.random().toString(36).substr(2, 9)}`,
      agent_id: targetAgent.id,
      agent_name: targetAgent.name.replace(/\s+/g, '_'),
      timestamp: new Date()
        .toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        .replace(',', ' ·'),
      status: 'SUCCESS',
      tx_type: 'Deployment',
      cost_usdc: targetAgent.usdc_price,
      tx_hash: txHash ?? ('0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')),
    };

    setExecutionLogs(prev => [newLog, ...prev]);
    setDeployedAgentIds(prev => prev.includes(agentId) ? prev : [...prev, agentId]);
  };

  const runMission = async (_agentId: string, _missionText: string): Promise<string> => {
    setCurrentUser(prev => ({
      ...prev,
      usdc_account_balance: parseFloat((prev.usdc_account_balance - 0.05).toFixed(4)),
    }));
    return new Promise(resolve => setTimeout(() => resolve('Success'), 2000));
  };

  const topUpBalance = (amount: number) => {
    setCurrentUser(prev => ({
      ...prev,
      usdc_account_balance: parseFloat((prev.usdc_account_balance + amount).toFixed(2)),
    }));
  };

  const displayUsdcBalance =
    isConnected
      ? onChainBalance
      : currentUser.usdc_account_balance.toFixed(2);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeTab,
        setActiveTab,
        agents,
        deployedAgentIds,
        executionLogs,
        deployAgent,
        recordDeployment,
        topUpBalance,
        selectedAgentForDeploy,
        setSelectedAgentForDeploy,
        runMission,
        walletAddress,
        isConnected,
        usdcBalance: displayUsdcBalance,
        refreshBalance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Public provider ───────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CircleWalletProvider>
    <AppProviderInner>{children}</AppProviderInner>
  </CircleWalletProvider>
);

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
