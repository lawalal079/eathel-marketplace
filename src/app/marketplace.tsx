'use client';

import React, { useState, useCallback } from 'react';
import { useApp } from './context';
import {
  Upload, CheckCircle, Gear, Coins, Star, ChartLine, FileText, Code,
  Translate, Image as ImageIcon, ShieldCheck, TrendUp,
} from '@phosphor-icons/react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  parseAbi,
  type Address,
  type Chain,
  encodeFunctionData,
} from 'viem';
import { useWallets } from '@privy-io/react-auth';
import { useCircleWallet } from './components/providers/CircleWalletProvider';
import { Agent } from '../types';

// ─── Chain & Contract constants ────────────────────────────────────────────────

const CHAIN_ID   = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '5042002', 10);
const RPC_URL    = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.testnet.arc.network';
const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'Arc Testnet';
const PROXY_ADDR = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ?? '') as Address;
const USDC_ADDR  = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '') as Address;

const arcTestnet: Chain = {
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public:  { http: [RPC_URL] },
  },
};

const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) });

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

const MARKETPLACE_ABI = parseAbi([
  'function purchaseAgent(string calldata agentId) external',
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)',
]);

// ─── Display helpers ───────────────────────────────────────────────────────────

const getAgentIcon = (id: string, iconName?: string) => {
  // Resolve icon from on-chain metadata name first (populated by context.tsx from metadataUri JSON)
  switch (iconName) {
    case 'TrendingUp':  return <TrendUp     size={24} className="text-[#4E8981]" />;
    case 'TrendUp':     return <TrendUp     size={24} className="text-[#4E8981]" />;
    case 'ChartLine':   return <ChartLine   size={24} className="text-[#4E8981]" />;
    case 'FileText':    return <FileText    size={24} className="text-[#4E8981]" />;
    case 'Code':        return <Code        size={24} className="text-[#4E8981]" />;
    case 'Translate':   return <Translate   size={24} className="text-[#4E8981]" />;
    case 'Image':       return <ImageIcon   size={24} className="text-[#4E8981]" />;
    case 'ShieldCheck': return <ShieldCheck size={24} className="text-[#4E8981]" />;
    case 'Gear':        return <Gear        size={24} className="text-[#4E8981]" />;
  }
  // Fallback: legacy ID-based mapping for agents without metadata icons
  switch (id) {
    case 'agent_data_analysis':    return <ChartLine   size={24} className="text-[#4E8981]" />;
    case 'agent_content_writing':  return <FileText    size={24} className="text-[#4E8981]" />;
    case 'agent_python_coding':    return <Code        size={24} className="text-[#4E8981]" />;
    case 'agent_lang_translation': return <Translate   size={24} className="text-[#4E8981]" />;
    case 'agent_image_gen':        return <ImageIcon   size={24} className="text-[#4E8981]" />;
    case 'agent_ai_moderation':    return <ShieldCheck size={24} className="text-[#4E8981]" />;
    default:                       return <Gear        size={24} className="text-[#4E8981]" />;
  }
};

const DISPLAY_MAP: Record<string, { name: string; desc: string; price: string; reviews: string; rating: number; reviewsBottom: string }> = {
  agent_data_analysis:    { name: 'Data Analysis',       desc: 'Monitor data',            price: '3.000 USDC', reviews: '253 reviews', rating: 4.7,  reviewsBottom: '276 reviews' },
  agent_content_writing:  { name: 'Content Writing',     desc: 'Analyze script writing',  price: '4.50 USDC',  reviews: '492 reviews', rating: 4.7,  reviewsBottom: '492 reviews' },
  agent_python_coding:    { name: 'Python Coding',       desc: 'Analyze smart codes',     price: '6.00 USDC',  reviews: '312 reviews', rating: 4.66, reviewsBottom: '403 reviews' },
  agent_lang_translation: { name: 'Language Translation',desc: 'Speak and translate',     price: '2.00 USDC',  reviews: '189 reviews', rating: 4.7,  reviewsBottom: '159 reviews' },
  agent_image_gen:        { name: 'Image Generation',    desc: 'Provide content',         price: '5.00 USDC',  reviews: '199 reviews', rating: 4.9,  reviewsBottom: '256 reviews' },
  agent_ai_moderation:    { name: 'AI Moderation',       desc: 'Monitor breaches',        price: '2.50 USDC',  reviews: '330 reviews', rating: 4.53, reviewsBottom: '330 reviews' },
};

const d = (id: string, fallback: Agent) => DISPLAY_MAP[id] ?? {
  name: fallback.name, desc: fallback.description,
  price: `${fallback.usdc_price.toFixed(2)} USDC`,
  reviews: `${fallback.review_count} reviews`, rating: fallback.rating,
  reviewsBottom: `${fallback.review_count} reviews`,
};

// ─── USDC icon ─────────────────────────────────────────────────────────────────
const USDCIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`${className} flex-shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <g fill="white">
      <path d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 00.427.303h.975a.416.416 0 00.427-.425v-.06a3.04 3.04 0 00-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.242-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.668 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.242-.244-.364-.427-.364h-1.036a.416.416 0 00-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.914v1.457c0 .242.183.425.487.485h.915c.243 0 .426-.182.487-.485V21.34c1.829-.303 3.047-1.578 3.047-3.217z" />
      <path d="M12.892 24.497c-4.754-1.7-7.192-6.98-5.424-11.653.914-2.55 2.925-4.491 5.424-5.402.244-.121.365-.303.365-.607v-.85c0-.242-.121-.424-.365-.485-.061 0-.183 0-.244.06a10.895 10.895 0 00-7.13 13.717c1.096 3.4 3.717 6.01 7.13 7.102.244.121.488 0 .548-.243.061-.06.061-.122.061-.243v-.85c0-.182-.182-.424-.365-.546zm6.46-18.936c-.244-.122-.488 0-.548.242-.061.061-.061.122-.061.243v.85c0 .243.182.485.365.607 4.754 1.7 7.192 6.98 5.424 11.653-.914 2.55-2.925 4.491-5.424 5.402-.244.121-.365.303-.365.607v.85c0 .242.121.424.365.485.061 0 .183 0 .244-.06a10.895 10.895 0 007.13-13.717c-1.096-3.46-3.778-6.07-7.13-7.162z" />
    </g>
  </svg>
);

// ─── Micro-spinner ─────────────────────────────────────────────────────────────
const Spinner = ({ className = '' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width={13} height={13}>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Agent card state ──────────────────────────────────────────────────────────
type DeployPhase = 'idle' | 'step1' | 'step2' | 'success' | 'error';
interface CardState { phase: DeployPhase; error?: string }

// ─── Skeleton card ─────────────────────────────────────────────────────────────
const AgentCardSkeleton = () => (
  <div className="bg-[#1A1D20] border border-[#2A2F35] rounded-[16px] p-6 flex flex-col gap-4 min-h-[220px]">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl skeleton-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 w-3/4 skeleton-pulse rounded" />
        <div className="h-3 w-1/2 skeleton-pulse rounded opacity-70" />
      </div>
    </div>
    <div className="flex justify-between">
      <div className="h-4 w-24 skeleton-pulse rounded" />
      <div className="h-3 w-16 skeleton-pulse rounded opacity-70" />
    </div>
    <div className="border-t border-[#2A2F35]" />
    <div className="flex justify-between items-center">
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => <div key={i} className="w-3.5 h-3.5 skeleton-pulse rounded-sm" />)}
      </div>
      <div className="h-3 w-16 skeleton-pulse rounded opacity-70" />
    </div>
    <div className="flex justify-end mt-auto">
      <div className="h-8 w-20 skeleton-pulse rounded-xl" />
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
export default function Marketplace() {
  const {
    agents, deployAgent, recordDeployment, setSelectedAgentForDeploy, setActiveTab,
    usdcBalance, refreshBalance, isConnected, deployedAgentIds,
  } = useApp();

  const circle = useCircleWallet();
  const { wallets: privyWallets } = useWallets();

  // Active wallet routing
  const activeMethod: 'circle' | 'privy' | null =
    circle.authMethod === 'circle_google' ? 'circle'
    : privyWallets.length > 0 ? 'privy'
    : null;

  const activeAddress: Address | null =
    activeMethod === 'circle' ? (circle.walletAddress as Address | null)
    : activeMethod === 'privy'  ? (privyWallets[0]?.address as Address | null)
    : null;

  // Per-card state
  const [cardStates, setCardStates]   = useState<Record<string, CardState>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingAgents = agents.length === 0;

  const setCard = useCallback((id: string, state: CardState) =>
    setCardStates(prev => ({ ...prev, [id]: state })), []);

  // ── Privy wallet client ─────────────────────────────────────────────────────
  const getPrivyClient = useCallback(async () => {
    const wallet = privyWallets[0];
    if (!wallet) throw new Error('No Privy wallet connected');
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({ account: wallet.address as Address, chain: arcTestnet, transport: custom(provider) });
  }, [privyWallets]);

  // ── Core TX sender ──────────────────────────────────────────────────────────
  const sendTx = useCallback(async (data: `0x${string}`, to: Address): Promise<`0x${string}`> => {
    if (!activeAddress) throw new Error('No wallet connected');

    if (activeMethod === 'privy') {
      const wc = await getPrivyClient();
      const hash = await wc.sendTransaction({ to, data, account: activeAddress, chain: arcTestnet });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    }

    // Circle path
    const userToken = circle.loginResult?.userToken;
    const walletId  = circle.circleWallets?.[0]?.id;
    if (!userToken || !walletId) throw new Error('Circle credentials not found');

    // Fetch pre-existing transactions to correlate by difference
    const preTxIds = new Set<string>();
    let hasPreTx = false;
    try {
      const preRes = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listTransactions', userToken }),
      });
      const preJson = await preRes.json();
      if (preRes.ok && preJson.transactions) {
        preJson.transactions.forEach((t: any) => {
          if (t.id) preTxIds.add(t.id);
        });
        hasPreTx = true;
      }
    } catch (e) {
      console.warn('Failed to pre-fetch transactions list:', e);
    }

    const createdAfter = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10m lookback fallback for clock skew

    const res = await fetch('/api/endpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sendContractTransaction', userToken, walletId, contractAddress: to, callData: data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Circle tx failed');

    await circle.executeChallenge!(json.challengeId);

    // Poll for transaction by listing transactions
    let hash: string | null = null;
    const TERMINAL = new Set(['COMPLETE', 'FAILED', 'CANCELLED']);
    for (let i = 0; i < 45 && !hash; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pr = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listTransactions', userToken }),
      });
      const pj = await pr.json();
      if (pr.ok && pj.transactions) {
        const match = pj.transactions.find((t: any) => {
          if (t.walletId !== walletId) return false;
          if (hasPreTx) {
            return !preTxIds.has(t.id);
          }
          return new Date(t.createDate).getTime() >= new Date(createdAfter).getTime();
        });

        if (match) {
          if (match.txHash) {
            hash = match.txHash;
          } else if (TERMINAL.has(match.state) || TERMINAL.has(match.status)) {
            throw new Error(`Circle transaction execution failed: ${match.errorReason || match.state || match.status}`);
          }
        }
      }
    }
    if (!hash) throw new Error('Timed out waiting for transaction hash.');
    await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
    return hash as `0x${string}`;
  }, [activeAddress, activeMethod, getPrivyClient, circle]);

  // ── On-chain Deploy: Step 1 (approve) → Step 2 (purchaseAgent) ─────────────
  const handleDeploy = useCallback(async (agent: Agent) => {
    const phase = cardStates[agent.id]?.phase;
    if (phase === 'step1' || phase === 'step2' || phase === 'success') return;

    // If no wallet, fall back to local state-only deploy (no real tx)
    if (!activeAddress) {
      setCard(agent.id, { phase: 'step1' });
      setSelectedAgentForDeploy(agent);
      const ok = await deployAgent(agent.id);
      if (ok) {
        setCard(agent.id, { phase: 'success' });
        setTimeout(() => { setCard(agent.id, { phase: 'idle' }); setActiveTab('my-agents'); }, 1400);
      } else {
        setCard(agent.id, { phase: 'error', error: 'Insufficient balance.' });
        setTimeout(() => setCard(agent.id, { phase: 'idle' }), 4000);
      }
      return;
    }

    try {
      // Step 1/2 — USDC approve
      setCard(agent.id, { phase: 'step1' });
      const priceWei = parseUnits(agent.usdc_price.toFixed(6), 6);

      // Check existing allowance first
      const allowance = await publicClient.readContract({
        address: USDC_ADDR, abi: ERC20_ABI, functionName: 'allowance',
        args: [activeAddress, PROXY_ADDR],
      }) as bigint;

      if (allowance < priceWei) {
        const approveData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [PROXY_ADDR, priceWei] });
        await sendTx(approveData, USDC_ADDR);
      }

      // Step 2/2 — purchaseAgent
      setCard(agent.id, { phase: 'step2' });
      const purchaseData = encodeFunctionData({ abi: MARKETPLACE_ABI, functionName: 'purchaseAgent', args: [agent.id] });
      const txHash = await sendTx(purchaseData, PROXY_ADDR);

      // Record in local app state — use recordDeployment (no balance check)
      // because the on-chain tx receipt already proves payment.
      setSelectedAgentForDeploy(agent);
      recordDeployment(agent.id, txHash);

      setCard(agent.id, { phase: 'success' });
      setTimeout(() => { setCard(agent.id, { phase: 'idle' }); setActiveTab('my-agents'); }, 1600);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Unknown error';
      const clean = raw.split('\n')[0].replace(/execution reverted:?\s*/i, '').slice(0, 90);
      setCard(agent.id, { phase: 'error', error: `Deployment failed: ${clean || 'Transaction rejected.'}` });
      setTimeout(() => setCard(agent.id, { phase: 'idle' }), 5000);
    }
  }, [cardStates, activeAddress, sendTx, deployAgent, recordDeployment, setSelectedAgentForDeploy, setActiveTab, setCard]);

  // ── Render deploy button ─────────────────────────────────────────────────────
  const renderBtn = (agent: Agent) => {
    // Already purchased — greyed out, non-interactive
    if (deployedAgentIds.includes(agent.id)) {
      return (
        <button
          disabled
          className="flex flex-col items-center justify-center border px-5 py-2 rounded-xl text-xs font-semibold cursor-not-allowed opacity-40 min-w-[110px] bg-[#2A2F35]/30 border-[#2A2F35] text-[#8a8f98]"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle size={13} weight="fill" />
            <span>Already Bought</span>
          </div>
        </button>
      );
    }

    const state = cardStates[agent.id] ?? { phase: 'idle' };

    type Cfg = { label: string; sub?: string; cls: string; disabled: boolean; icon?: React.ReactNode };
    const cfgs: Record<DeployPhase, Cfg> = {
      idle: {
        label: 'Deploy',
        cls: 'bg-[#4E8981]/10 border-[#4E8981]/40 hover:bg-[#4E8981]/20 text-[#4E8981]',
        disabled: false,
      },
      step1: {
        label: 'Step 1/2',
        sub: 'Approving USDC…',
        cls: 'bg-amber-900/20 border-amber-700/40 text-amber-400 cursor-not-allowed',
        disabled: true,
        icon: <Spinner className="text-amber-400" />,
      },
      step2: {
        label: 'Step 2/2',
        sub: 'Confirming Tx…',
        cls: 'bg-sky-900/20 border-sky-700/40 text-sky-400 cursor-not-allowed',
        disabled: true,
        icon: <Spinner className="text-sky-400" />,
      },
      success: {
        label: 'Success!',
        cls: 'bg-emerald-900/20 border-emerald-700/40 text-emerald-400 cursor-not-allowed',
        disabled: true,
        icon: <CheckCircle size={13} weight="fill" className="text-emerald-400" />,
      },
      error: {
        label: 'Retry',
        cls: 'bg-rose-900/20 border-rose-700/40 hover:bg-rose-900/30 text-rose-400',
        disabled: false,
      },
    };

    const cfg = cfgs[state.phase];

    return (
      <div className="flex flex-col items-end gap-1.5">
        <button
          onClick={() => handleDeploy(agent)}
          disabled={cfg.disabled}
          className={`flex flex-col items-center justify-center border px-5 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-md min-w-[110px] ${cfg.cls}`}
        >
          <div className="flex items-center gap-1.5">
            {cfg.icon}
            <span>{cfg.label}</span>
          </div>
          {cfg.sub && (
            <span className="text-[9px] opacity-70 font-normal mt-0.5 tracking-wide">{cfg.sub}</span>
          )}
        </button>
        {state.phase === 'error' && state.error && (
          <p className="text-[10px] text-rose-400 leading-snug text-right max-w-[180px] animate-fadeIn">
            {state.error}
          </p>
        )}
      </div>
    );
  };

  // ── Refresh balance ─────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-[32px] font-bold text-white mb-2 font-sans tracking-tight">
            AI Agent Marketplace
          </h1>
          <p className="text-[#8a8f98] text-lg font-light">
            Deploy AI agents to perform digital tasks and earn USDC
          </p>
        </div>

        {/* Balance widget */}
        <div className="bg-[#1A1D20] border border-[#2A2F35] rounded-xl p-4 w-[280px] h-[92px] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[#8a8f98] text-sm font-medium">Account balance</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-[#8a8f98] hover:text-white transition-colors cursor-pointer p-0.5 rounded-lg hover:bg-white/5 active:scale-95 flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={isRefreshing ? 'animate-spin text-[#4E8981]' : ''}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <USDCIcon className="w-10 h-10" />
            <span className="text-2xl font-bold text-white tracking-tight">
              {usdcBalance} <span className="text-sm text-[#8a8f98] font-normal">USDC</span>
            </span>
          </div>
        </div>
      </div>

      {/* Process Banner */}
      <div className="w-full bg-[#1A1D20] rounded-xl py-3 px-6 flex items-center justify-between overflow-x-auto select-none border border-[#2A2F35]">
        <div className="flex items-center gap-8 min-w-[760px] w-full justify-between text-neutral-300 text-[13px] font-medium">
          <div className="flex items-center gap-2"><Upload size={16} weight="bold" className="text-[#4E8981]" /><span className="text-white">Agent Deployment</span></div>
          <span className="text-[#2A2F35] font-bold">&gt;</span>
          <div className="flex items-center gap-2"><CheckCircle size={16} weight="bold" className="text-[#8a8f98]" /><span>Task Assignment</span></div>
          <span className="text-[#2A2F35] font-bold">&gt;</span>
          <div className="flex items-center gap-2"><Gear size={16} weight="bold" className="text-[#8a8f98]" /><span>Autonomous Work</span></div>
          <span className="text-[#2A2F35] font-bold">&gt;</span>
          <div className="flex items-center gap-2"><Coins size={16} weight="bold" className="text-[#8a8f98]" /><span>Payment in USDC</span></div>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {isLoadingAgents
          ? [...Array(6)].map((_, i) => <AgentCardSkeleton key={i} />)
          : agents.map(agent => {
              const info = d(agent.id, agent);
              return (
                <div
                  key={agent.id}
                  className="bg-[#1A1D20] border border-[#2A2F35] rounded-[16px] p-6 flex flex-col justify-between min-h-[220px] shadow-xl hover:border-[#4E8981]/50 hover:shadow-[0_0_20px_rgba(78,137,129,0.05)] transition-all duration-300"
                >
                  <div>
                    {/* Card header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#4E8981]/10 border border-[#4E8981]/20 flex items-center justify-center flex-shrink-0">
                        {getAgentIcon(agent.id, agent.tags[0])}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">{info.name}</h3>
                        <p className="text-xs text-[#8a8f98] mt-1">{info.desc}</p>
                      </div>
                    </div>

                    {/* Price & reviews */}
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-sm font-bold text-[#4E8981]">{info.price}</span>
                      {/* <span className="text-xs text-[#8a8f98]">{info.reviews}</span> */}
                    </div>

                    <hr className="border-[#2A2F35] mb-3" />

                    {/* Stars */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} weight="fill"
                              className={i < Math.floor(info.rating) ? 'text-[#facc15]' : 'text-[#2A2F35]'} />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-white ml-1">
                          {info.rating.toString().replace('.', ',')}
                        </span>
                      </div>
                      {/* <span className="text-xs text-[#8a8f98]">{info.reviewsBottom}</span> */}
                    </div>
                  </div>

                  {/* Deploy button — live on-chain flow */}
                  <div className="flex justify-end">
                    {renderBtn(agent)}
                  </div>
                </div>
              );
            })}
      </div>

      {/* No-wallet hint */}
      {!isConnected && !isLoadingAgents && (
        <p className="text-center text-xs text-[#8a8f98] pt-2">
          Connect a wallet (Google or External) to execute on-chain deployments.
        </p>
      )}
    </div>
  );
}
