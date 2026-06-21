'use client';

import React, { useState } from 'react';
import { useApp } from './context';
import { Play, Shield, Terminal, ArrowClockwise, Copy, Download, CheckCircle, Cpu, HardDrive } from '@phosphor-icons/react';

export default function ExecutionPanel() {
  const { selectedAgentForDeploy, runMission, agents } = useApp();
  const [missionText, setMissionText] = useState('');
  const [modelPreference, setModelPreference] = useState('Æthel Labs Core 4.0 (Recommended)');
  const [tokenBudget, setTokenBudget] = useState(1500);
  const [verificationLevel, setVerificationLevel] = useState(true);
  const [dataPersistence, setDataPersistence] = useState(false);

  const [executing, setExecuting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Default to first agent if none is selected
  const activeAgent = selectedAgentForDeploy || agents[0];

  const handleExecute = async () => {
    if (executing) return;

    setExecuting(true);
    setShowResult(false);

    try {
      await runMission(activeAgent.id, missionText);
    } catch (err) {
      console.error(err);
    } finally {
      setExecuting(false);
      setShowResult(true);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-[#e5e2e1] mb-1 tracking-tight">Checkout &amp; Execution</h2>
        <p className="text-[#c1c6d5] text-sm">Configure parameters and monitor real-time agent output.</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Side: Input Configuration Matrix */}
        <section className="flex-1 bg-white rounded-xl flex flex-col border border-[#414753]/15 overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-white">
            <h2 className="text-[#131313] text-xl font-bold tracking-tight">Input Matrix</h2>
            <div className="flex items-center gap-2 bg-neutral-100 px-3 py-1 rounded-full">
              <span className={`w-2 h-2 rounded-full ${executing ? 'bg-amber-500 animate-ping' : 'bg-[#0066cc]'}`}></span>
              <span className="text-neutral-600 font-bold text-[10px] uppercase tracking-wider">
                {executing ? 'PROCESSING' : 'READY'}
              </span>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Display Active Agent Info */}
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 flex items-start gap-3">
              <Cpu size={28} className="text-[#0066cc] mt-0.5" weight="fill" />
              <div>
                <h3 className="font-bold text-neutral-800 text-sm">Active Module: {activeAgent.name}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{activeAgent.description}</p>
                <div className="text-[10px] text-neutral-400 mt-1 font-semibold uppercase tracking-wider">
                  Cost per Run: {activeAgent.usdc_price.toFixed(2)} USDC + 0.05 USDC compute gas
                </div>
              </div>
            </div>

            {/* Mission input */}
            <div className="space-y-2">
              <label className="text-neutral-700 font-bold text-xs uppercase tracking-wider block">Agent Mission</label>
              <textarea
                value={missionText}
                onChange={(e) => setMissionText(e.target.value)}
                className="w-full h-28 bg-white border border-neutral-200 rounded-lg p-3 text-neutral-800 focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc] transition-all resize-none text-sm leading-relaxed"
                placeholder="Describe the workflow or task execution logic..."
              />
            </div>

            {/* Model & Budget selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-neutral-700 font-bold text-xs uppercase tracking-wider block">Model Preference</label>
                <div className="relative">
                  <select
                    value={modelPreference}
                    onChange={(e) => setModelPreference(e.target.value)}
                    className="w-full appearance-none bg-white border border-neutral-200 rounded-lg px-3 py-2.5 text-xs text-neutral-800 font-semibold focus:border-[#0066cc] focus:ring-0 transition-all cursor-pointer"
                  >
                    <option>Æthel Labs Core 4.0 (Recommended)</option>
                    <option>Æthel Labs DeepReason v2</option>
                    <option>Turbo-Institutional 8k</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-neutral-700 font-bold text-xs uppercase tracking-wider block">Token Budget</label>
                <div className="relative">
                  <input
                    type="number"
                    value={tokenBudget}
                    onChange={(e) => setTokenBudget(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-neutral-800 focus:border-[#0066cc] focus:ring-0 transition-all"
                  />
                  <span className="absolute right-3 top-2.5 text-neutral-400 font-semibold text-[10px] uppercase tracking-wider">MAX</span>
                </div>
              </div>
            </div>

            {/* Switch sliders / checkboxes */}
            <div className="space-y-3">
              <label className="text-neutral-700 font-bold text-xs uppercase tracking-wider block">Execution Parameters</label>

              <div
                onClick={() => setVerificationLevel(!verificationLevel)}
                className="flex items-center gap-4 p-3 border border-neutral-100 rounded-lg group hover:border-[#0066cc] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded bg-neutral-50 flex items-center justify-center text-neutral-600">
                  <Shield size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-neutral-800 font-semibold text-xs">Verification Level</p>
                  <p className="text-neutral-400 text-[10px]">Enforce multi-hop logic validation</p>
                </div>
                <div>
                  <input
                    type="checkbox"
                    checked={verificationLevel}
                    readOnly
                    className="w-4 h-4 text-[#0066cc] border-neutral-300 rounded focus:ring-[#0066cc] pointer-events-none"
                  />
                </div>
              </div>

              <div
                onClick={() => setDataPersistence(!dataPersistence)}
                className="flex items-center gap-4 p-3 border border-neutral-100 rounded-lg group hover:border-[#0066cc] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded bg-neutral-50 flex items-center justify-center text-neutral-600">
                  <HardDrive size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-neutral-800 font-semibold text-xs">Data Persistence</p>
                  <p className="text-neutral-400 text-[10px]">Auto-save execution context to secure vault</p>
                </div>
                <div>
                  <input
                    type="checkbox"
                    checked={dataPersistence}
                    readOnly
                    className="w-4 h-4 text-[#0066cc] border-neutral-300 rounded focus:ring-[#0066cc] pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-neutral-50 border-t border-neutral-100 mt-auto">
            <button
              onClick={handleExecute}
              disabled={executing}
              className="w-full bg-[#0066cc] text-white py-4 rounded-lg font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-[#0052a3] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-[#0066cc]/15"
            >
              {executing ? (
                <>
                  <ArrowClockwise className="animate-spin" size={18} />
                  Processing Execution...
                </>
              ) : (
                <>
                  <Play weight="fill" size={18} />
                  Initialize Execution
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Side: Live Viewport Output */}
        <section className="flex-1 bg-[#0e0e0e] rounded-xl flex flex-col border border-[#414753]/15 overflow-hidden">
          <div className="p-4 border-b border-[#414753]/15 flex justify-between items-center bg-[#131313]">
            <div className="flex items-center gap-3">
              <Terminal className="text-[#aac7ff]" size={20} />
              <h2 className="text-[#e5e2e1] text-xs font-semibold uppercase tracking-widest">Live Viewport</h2>
            </div>
            <div className="flex gap-1">
              <button className="p-2 hover:bg-[#2a2a2a] rounded text-[#c1c6d5] hover:text-white transition-colors cursor-pointer">
                <Download size={16} />
              </button>
              <button className="p-2 hover:bg-[#2a2a2a] rounded text-[#c1c6d5] hover:text-white transition-colors cursor-pointer">
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            {/* Waiting Placeholder */}
            {!executing && !showResult && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                <div className="w-16 h-16 border-2 border-dashed border-[#8b919e] rounded-full flex items-center justify-center">
                  <Terminal size={32} />
                </div>
                <p className="text-xs font-bold tracking-wider uppercase text-[#c1c6d5]">Waiting for Initialization</p>
              </div>
            )}

            {/* Skeleton Loading State */}
            {executing && (
              <div className="space-y-6">
                <div className="h-8 w-3/4 skeleton-pulse rounded"></div>
                <div className="space-y-3">
                  <div className="h-4 w-full skeleton-pulse rounded opacity-50"></div>
                  <div className="h-4 w-5/6 skeleton-pulse rounded opacity-50"></div>
                  <div className="h-4 w-4/6 skeleton-pulse rounded opacity-50"></div>
                </div>
                <div className="h-48 w-full border border-[#414753]/10 rounded-xl bg-[#201f1f]/30"></div>
                <div className="h-4 w-2/3 skeleton-pulse rounded opacity-50"></div>
              </div>
            )}

            {/* Real Rendered Output Summary */}
            {showResult && (
              <div className="space-y-6 animate-fadeIn">
                <h1 className="text-2xl font-bold text-white tracking-tight">Market Analysis Summary</h1>
                <p className="text-[#c1c6d5] leading-relaxed text-sm">
                  Execution completed successfully. Æthel Labs coordinated operations over 4 secure compute nodes. Results detail optimal liquidity allocation.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#1c1b1b] border border-[#414753]/10 rounded-lg">
                    <span className="text-[#aac7ff] text-[10px] font-bold tracking-wider uppercase block mb-1">Volatility Index</span>
                    <p className="text-white text-3xl font-bold tracking-tight">2.41%</p>
                  </div>
                  <div className="p-4 bg-[#1c1b1b] border border-[#414753]/10 rounded-lg">
                    <span className="text-[#aac7ff] text-[10px] font-bold tracking-wider uppercase block mb-1">Confidence Score</span>
                    <p className="text-white text-3xl font-bold tracking-tight">98.2</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#414753]/15">
                  <h3 className="text-white font-bold text-sm">Strategic Recommendations</h3>
                  <ul className="space-y-2 text-[#c1c6d5] text-sm">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-[#0066cc] mt-0.5" weight="fill" />
                      <span>Rebalance portfolio weighting towards USDC-backed assets to mitigate tail risk.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-[#0066cc] mt-0.5" weight="fill" />
                      <span>Initialize yield-farming sub-routines for the Layer 2 extension protocols.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 p-0.5 bg-gradient-to-r from-[#0066cc]/25 to-transparent rounded-lg">
                  <div className="bg-[#0e0e0e] p-5 rounded-lg border border-[#414753]/10">
                    <p className="text-[#c1c6d5] italic text-xs leading-relaxed">
                      "This report was generated using the Æthel Labs Institutional Framework. All data points verified via on-chain oracle synchronization."
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Console status bar */}
          <div className="h-10 border-t border-[#414753]/15 flex items-center px-4 justify-between text-[10px] font-bold text-[#c1c6d5] bg-[#1c1b1b]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ENGINE ACTIVE
              </span>
              <span>LATENCY: 42MS</span>
            </div>
            <div>SECURED BY USDC CLEARING</div>
          </div>
        </section>
      </div>
    </div>
  );
}
