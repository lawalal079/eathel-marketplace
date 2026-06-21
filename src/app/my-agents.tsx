'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from './context';
import { useCircleWallet } from './components/providers/CircleWalletProvider';
import { useWallets } from '@privy-io/react-auth';
import { Cpu, ShieldCheck, Gear, TerminalWindow, ArrowRight, X, PaperPlaneRight, CaretDown, TrendUp, ChartLine, FileText, Code, Translate, Image as ImageIcon } from '@phosphor-icons/react';
import { Agent } from '../types';

// Matches the sidebar My Agents double-gear icon (without checkmark badge)
const AgentSettingsIcon = () => (
  <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Large gear (bottom-left) */}
    <circle cx="12" cy="20" r="4.5" stroke="currentColor" strokeWidth="2.2" />
    <path d="M12 12.5v3M12 24.5v3M4.5 20h3M19.5 20h3M6.7 14.7l2.1 2.1M15.2 23.2l2.1 2.1M6.7 25.3l2.1-2.1M15.2 16.8l2.1-2.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    {/* Small gear (top-right) */}
    <circle cx="21" cy="11" r="2.8" stroke="currentColor" strokeWidth="2.2" />
    <path d="M21 5.5v2.5M21 14v2.5M15.5 11h2.5M24 11h2.5M17.1 7.1l1.8 1.8M23.1 13.1l1.8 1.8M17.1 14.9l1.8-1.8M23.1 7.1l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const getAgentIcon = (id: string, iconName?: string) => {
  switch (iconName) {
    case 'TrendingUp':  return <TrendUp     size={20} className="text-[#4E8981]" weight="fill" />;
    case 'TrendUp':     return <TrendUp     size={20} className="text-[#4E8981]" weight="fill" />;
    case 'ChartLine':   return <ChartLine   size={20} className="text-[#4E8981]" weight="fill" />;
    case 'FileText':    return <FileText    size={20} className="text-[#4E8981]" weight="fill" />;
    case 'Code':        return <Code        size={20} className="text-[#4E8981]" weight="fill" />;
    case 'Translate':   return <Translate   size={20} className="text-[#4E8981]" weight="fill" />;
    case 'Image':       return <ImageIcon   size={20} className="text-[#4E8981]" weight="fill" />;
    case 'ShieldCheck': return <ShieldCheck size={20} className="text-[#4E8981]" weight="fill" />;
    case 'Gear':        return <Gear        size={20} className="text-[#4E8981]" weight="fill" />;
  }
  switch (id) {
    case 'agent_data_analysis':    return <ChartLine   size={20} className="text-[#4E8981]" weight="fill" />;
    case 'agent_content_writing':  return <FileText    size={20} className="text-[#4E8981]" weight="fill" />;
    case 'agent_python_coding':    return <Code        size={20} className="text-[#4E8981]" weight="fill" />;
    case 'agent_lang_translation': return <Translate   size={20} className="text-[#4E8981]" weight="fill" />;
    case 'agent_image_gen':        return <ImageIcon   size={20} className="text-[#4E8981]" weight="fill" />;
    case 'agent_ai_moderation':    return <ShieldCheck size={20} className="text-[#4E8981]" weight="fill" />;
    default:                       return <Cpu         size={20} className="text-[#4E8981]" weight="fill" />;
  }
};

// ─── Console Log Line ──────────────────────────────────────────────────────────
interface ConsoleLine {
  id: string;
  type: 'system' | 'user' | 'ack';
  text: string;
  ts: string;
}

function nowTs() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Agent Console Panel ───────────────────────────────────────────────────────
function AgentConsole({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  // ── Wallet resolution (hooks must be at component top-level) ─────────────────
  const circle = useCircleWallet();
  const { wallets: privyWallets } = useWallets();
  const userAddress: string | null = circle.walletAddress ?? privyWallets[0]?.address ?? null;

  const [input, setInput] = useState('');
  const [lines, setLines] = useState<ConsoleLine[]>([
    { id: 'boot-1', type: 'system', text: `Node "${agent.name}" — session initialised.`, ts: nowTs() },
    { id: 'boot-2', type: 'system', text: 'Awaiting operational directive…', ts: nowTs() },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addLine = (line: Omit<ConsoleLine, 'id'>) =>
    setLines(prev => [...prev, { id: `line-${Date.now()}-${Math.random()}`, ...line }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const directive = input.trim();
    if (!directive) return;

    // Echo user input immediately
    addLine({ type: 'user', text: `> ${directive}`, ts: nowTs() });
    setInput('');

    // Pending ack while we verify the license
    addLine({ type: 'ack', text: '⟳ Verifying license and queuing directive…', ts: nowTs() });

    try {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'executeDirective',
          userAddress: userAddress ?? '',
          agentId: agent.id,
          directive,
        }),
      });
      const json = await res.json();

      addLine({
        type: res.ok ? 'ack' : 'system',
        text: res.ok
          ? `✓ ${json.message ?? 'Directive accepted.'}`
          : `✗ ${json.error ?? 'Execution blocked.'}`,
        ts: nowTs(),
      });
    } catch {
      addLine({
        type: 'system',
        text: '✗ Network error — could not reach execution proxy.',
        ts: nowTs(),
      });
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-[#2A2F35] bg-[#0B0B0C] overflow-hidden animate-fadeIn">
      {/* Console top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2F35] bg-[#0f1214]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-[#4E8981] tracking-widest uppercase font-mono">
            {agent.id} — Live Console
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#8a8f98] hover:text-white transition-colors p-1 rounded cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Log output */}
      <div className="h-36 overflow-y-auto px-4 py-3 space-y-1.5 font-mono text-[11px] scrollbar-none">
        {lines.map(line => (
          <div key={line.id} className="flex gap-2">
            <span className="text-[#2A2F35] flex-shrink-0">[{line.ts}]</span>
            <span
              className={
                line.type === 'user'
                  ? 'text-[#4E8981]'
                  : line.type === 'ack'
                  ? 'text-amber-400/80'
                  : 'text-[#8a8f98]'
              }
            >
              {line.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-2 border-t border-[#2A2F35] bg-[#0f1214]"
      >
        <span className="text-[#4E8981] font-mono text-xs flex-shrink-0">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Assign Operational Directive…"
          className="flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder-[#3a4048]"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="text-[#4E8981] hover:text-white disabled:text-[#2A2F35] transition-colors cursor-pointer"
        >
          <PaperPlaneRight size={16} weight="fill" />
        </button>
      </form>
    </div>
  );
}

// ─── Glassmorphic Empty State ──────────────────────────────────────────────────
function EmptyDeployments({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="relative max-w-md w-full rounded-2xl border border-[#4E8981]/20 p-10 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(78,137,129,0.06) 0%, rgba(11,11,12,0.9) 60%, rgba(78,137,129,0.04) 100%)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 60px rgba(78,137,129,0.06), inset 0 1px 0 rgba(78,137,129,0.12)',
        }}
      >
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#4E8981]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#4E8981]/4 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="relative w-16 h-16 mx-auto mb-6 rounded-2xl border border-[#4E8981]/20 bg-[#4E8981]/5 flex items-center justify-center">
          <AgentSettingsIcon />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#2A2F35] border border-[#0B0B0C] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8a8f98]" />
          </span>
        </div>

        {/* Text */}
        <h2 className="text-white text-xl font-bold tracking-tight mb-2">
          No Active Deployments Detected
        </h2>
        <p className="text-[#8a8f98] text-sm leading-relaxed mb-8">
          Your deployment grid is empty. Browse the marketplace to acquire and activate an AI agent for your operations.
        </p>

        {/* Step hints */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-[#8a8f98] mb-8 font-mono">
          <span className="px-2 py-0.5 border border-[#2A2F35] rounded">01 Browse</span>
          <ArrowRight size={10} className="text-[#4E8981]" />
          <span className="px-2 py-0.5 border border-[#2A2F35] rounded">02 Deploy</span>
          <ArrowRight size={10} className="text-[#4E8981]" />
          <span className="px-2 py-0.5 border border-[#4E8981]/30 rounded text-[#4E8981]">03 Operate</span>
        </div>

        {/* CTA button */}
        <button
          onClick={onBrowse}
          className="group relative inline-flex items-center gap-2 bg-[#4E8981]/10 hover:bg-[#4E8981]/20 border border-[#4E8981]/40 hover:border-[#4E8981]/70 text-[#4E8981] font-bold px-8 py-3 rounded-xl text-sm tracking-widest uppercase transition-all duration-200 active:scale-95 cursor-pointer"
          style={{ boxShadow: '0 0 20px rgba(78,137,129,0.08)' }}
        >
          <span>Browse Marketplace</span>
          <ArrowRight
            size={16}
            weight="bold"
            className="group-hover:translate-x-0.5 transition-transform duration-200"
          />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MyAgents() {
  const { agents, deployedAgentIds, setActiveTab, setSelectedAgentForDeploy } = useApp();

  // Only show deployed agents (those whose ID appears in deployedAgentIds)
  const deployedAgents = agents.filter(a => deployedAgentIds.includes(a.id));

  // Which agent's console is currently open (null = none)
  const [openConsoleId, setOpenConsoleId] = useState<string | null>(null);

  const handleLaunch = (agent: Agent) => {
    setOpenConsoleId(prev => (prev === agent.id ? null : agent.id));
  };

  const handleBrowseMarketplace = () => {
    setActiveTab('marketplace');
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold font-sans text-[#e5e2e1] mb-2 tracking-tight">
          Active Deployments
        </h1>
        <p className="text-[#c1c6d5] text-sm">
          Select a deployed computational unit to assign tasks or configure execution hooks.
        </p>
      </div>

      {/* Empty state */}
      {deployedAgents.length === 0 && (
        <EmptyDeployments onBrowse={handleBrowseMarketplace} />
      )}

      {/* Agent cards grid */}
      {deployedAgents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deployedAgents.map((agent) => {
            const isOpen = openConsoleId === agent.id;
            return (
              <div
                key={agent.id}
                className="bg-[#1A1D20] border border-[#2A2F35] rounded-xl p-6 hover:border-[#4E8981]/50 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#4E8981]/10 border border-[#4E8981]/20 flex items-center justify-center text-[#4E8981]">
                        {getAgentIcon(agent.id, agent.icon)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">{agent.name}</h3>
                        <p className="text-[10px] text-[#4E8981] font-bold tracking-widest uppercase">Node: ACTIVE</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] bg-[#4E8981]/10 border border-[#4E8981]/20 text-[#4E8981] px-2 py-0.5 rounded-md font-semibold">
                      <ShieldCheck size={12} weight="fill" />
                      SECURED
                    </span>
                  </div>
                  <p className="text-xs text-[#8a8f98] leading-relaxed mb-6">
                    {agent.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#2A2F35]">
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-[#4E8981]/10 border border-[#4E8981]/20 text-[#4E8981] hover:bg-[#4E8981]/20 rounded-lg transition-colors cursor-pointer">
                      <Gear size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleLaunch(agent)}
                    className={`flex items-center gap-1.5 border px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all ${
                      isOpen
                        ? 'bg-[#4E8981]/20 border-[#4E8981]/60 text-[#4E8981]'
                        : 'bg-[#4E8981]/10 border-[#4E8981]/40 hover:bg-[#4E8981]/20 text-[#4E8981]'
                    }`}
                  >
                    <TerminalWindow size={16} />
                    {isOpen ? 'Close Console' : 'Launch Console'}
                    <CaretDown
                      size={12}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {/* Agent Console overlay */}
                {isOpen && (
                  <AgentConsole
                    agent={agent}
                    onClose={() => setOpenConsoleId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
