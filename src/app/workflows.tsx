'use client';

import React from 'react';
import { useApp } from './context';
import { Cpu, Swap, ShieldCheck, CheckCircle } from '@phosphor-icons/react';

export default function Workflows() {
  const { executionLogs } = useApp();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold font-sans text-[#e5e2e1] mb-2 tracking-tight">
          Pipeline Orchestration
        </h1>
        <p className="text-[#c1c6d5] text-sm">
          Track multi-agent sequences, on-chain validations, and autonomous execution threads.
        </p>
      </div>

      {/* Grid of Workflows */}
      <div className="space-y-6">
        <div className="bg-[#1A1D20] border border-[#2A2F35] rounded-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-[#2A2F35]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#4E8981]/10 border border-[#4E8981]/20 flex items-center justify-center text-[#4E8981]">
                <Swap size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Arbitrage Loop &amp; Settlement</h3>
                <p className="text-xs text-[#8a8f98]">Triggered manually via Circle EOA Bridge</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#4E8981]/10 border border-[#4E8981]/20 text-[#4E8981] font-bold text-[10px] rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4E8981] animate-pulse"></span>
              Synchronized
            </span>
          </div>

          {/* Workflow Steps layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0B0B0C]/40 rounded-lg border border-[#2A2F35]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#4E8981] uppercase tracking-wider">Step 1</span>
                <CheckCircle size={14} className="text-[#4E8981]" weight="fill" />
              </div>
              <p className="text-xs font-semibold text-white">Sentiment Scan</p>
              <p className="text-[10px] text-[#8a8f98] mt-1">Market Sentiment Oracle</p>
            </div>

            <div className="p-4 bg-[#0B0B0C]/40 rounded-lg border border-[#2A2F35]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#4E8981] uppercase tracking-wider">Step 2</span>
                <CheckCircle size={14} className="text-[#4E8981]" weight="fill" />
              </div>
              <p className="text-xs font-semibold text-white">Price Evaluation</p>
              <p className="text-[10px] text-[#8a8f98] mt-1">Æthel_Labs_Core_Llama3</p>
            </div>

            <div className="p-4 bg-[#0B0B0C]/40 rounded-lg border border-[#2A2F35]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#4E8981] uppercase tracking-wider">Step 3</span>
                <CheckCircle size={14} className="text-[#4E8981]" weight="fill" />
              </div>
              <p className="text-xs font-semibold text-white">Arbitrage Trade</p>
              <p className="text-[10px] text-[#8a8f98] mt-1">Neural_Arbitrage_v2</p>
            </div>

            <div className="p-4 bg-[#0B0B0C]/40 rounded-lg border border-[#2A2F35]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[#4E8981] uppercase tracking-wider">Step 4</span>
                <CheckCircle size={14} className="text-[#4E8981]" weight="fill" />
              </div>
              <p className="text-xs font-semibold text-white">Ledger Settlement</p>
              <p className="text-[10px] text-[#8a8f98] mt-1">Chain_Index_Worker_04</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Ledger List */}
      <div className="bg-[#1A1D20] border border-[#2A2F35] rounded-xl p-6">
        <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Recent Executions</h4>
        <div className="space-y-4">
          {executionLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#0B0B0C]/20 border border-[#2A2F35] rounded-lg gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#4E8981]/10 border border-[#4E8981]/20 flex items-center justify-center text-[#4E8981]">
                  <Cpu size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{log.agent_name}</p>
                  <p className="text-[10px] text-[#8a8f98]">{log.timestamp}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[10px] text-gray-500 font-mono select-all">{log.tx_hash}</span>
                <span className="text-xs font-bold text-white">{log.cost_usdc.toFixed(4)} USDC</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
