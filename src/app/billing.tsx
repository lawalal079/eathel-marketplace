'use client';

import React, { useState } from 'react';
import { useApp } from './context';
import { Download, TrendUp, Receipt, MagnifyingGlass, Cpu, Database, Receipt as EmptyIcon } from '@phosphor-icons/react';

// ─── Ledger skeleton row ───────────────────────────────────────────────────────
const LedgerRowSkeleton = () => (
  <tr className="border-b border-[#2A2F35]">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg skeleton-pulse flex-shrink-0" />
        <div className="h-3 w-32 skeleton-pulse rounded" />
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-3 w-28 skeleton-pulse rounded" /></td>
    <td className="px-6 py-4"><div className="h-5 w-20 skeleton-pulse rounded-full" /></td>
    <td className="px-6 py-4 text-right"><div className="h-3 w-20 skeleton-pulse rounded ml-auto" /></td>
  </tr>
);

// USDC coin icon — official open ring design (matches reference exactly)
const USDCIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`${className} flex-shrink-0`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <g fill="white">
      {/* Dollar sign */}
      <path d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 00.427.303h.975a.416.416 0 00.427-.425v-.06a3.04 3.04 0 00-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.242-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.668 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.242-.244-.364-.427-.364h-1.036a.416.416 0 00-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.914v1.457c0 .242.183.425.487.485h.915c.243 0 .426-.182.487-.485V21.34c1.829-.303 3.047-1.578 3.047-3.217z" />
      {/* Outer open crescent rings */}
      <path d="M12.892 24.497c-4.754-1.7-7.192-6.98-5.424-11.653.914-2.55 2.925-4.491 5.424-5.402.244-.121.365-.303.365-.607v-.85c0-.242-.121-.424-.365-.485-.061 0-.183 0-.244.06a10.895 10.895 0 00-7.13 13.717c1.096 3.4 3.717 6.01 7.13 7.102.244.121.488 0 .548-.243.061-.06.061-.122.061-.243v-.85c0-.182-.182-.424-.365-.546zm6.46-18.936c-.244-.122-.488 0-.548.242-.061.061-.061.122-.061.243v.85c0 .243.182.485.365.607 4.754 1.7 7.192 6.98 5.424 11.653-.914 2.55-2.925 4.491-5.424 5.402-.244.121-.365.303-.365.607v.85c0 .242.121.424.365.485.061 0 .183 0 .244-.06a10.895 10.895 0 007.13-13.717c-1.096-3.46-3.778-6.07-7.13-7.162z" />
    </g>
  </svg>
);

export default function Billing() {
  const { currentUser, executionLogs, topUpBalance } = useApp();
  const [filterQuery, setFilterQuery] = useState('');  // Treat an empty executionLogs array on first render as "still loading"
  const isLoadingLogs = executionLogs === undefined || executionLogs === null;

  const filteredLogs = (executionLogs ?? []).filter((log) =>
    log.agent_name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight font-sans">Gas Tank Billing Hub</h2>
          <p className="text-[#8a8f98] text-sm">Manage your decentralized compute credits and escrow balances.</p>
        </div>
        <button
          onClick={() => alert('PDF Export functionality is coming soon!')}
          className="flex items-center gap-2 border border-[#2A2F35] text-white bg-[#1A1D20] hover:bg-[#4E8981]/10 hover:border-[#4E8981]/50 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
        >
          <Download size={16} />
          Export Statement
        </button>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main balance card */}
        <div className="lg:col-span-8 bg-[#1A1D20] rounded-xl p-8 flex flex-col justify-between border border-[#2A2F35]">
          <div>
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-2 px-3 py-1 bg-[#4E8981]/10 text-[#4E8981] rounded-full border border-[#4E8981]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4E8981] animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Escrow</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0B0B0C] p-1.5 rounded-lg border border-[#2A2F35]">
                <USDCIcon className="w-6 h-6" />
                <span className="text-white font-bold text-xs pr-1">USDC</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider">Available Balance</p>
            </div>
            <div className="flex items-end gap-4 mb-8">
              <h3 className="text-5xl md:text-6xl font-bold text-white tracking-tight font-sans">
                {currentUser.usdc_account_balance.toFixed(2)}
                <span className="text-2xl text-[#8a8f98] font-medium ml-2">USDC</span>
              </h3>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-[#2A2F35]">
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#1A1D20] rounded-xl p-6 border border-[#2A2F35] flex-1">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider">Consumption Rate</p>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2A2F35]/50 text-[#8a8f98]">Coming Soon</span>
            </div>
            <div className="space-y-4 opacity-40 grayscale pointer-events-none">
              <div className="flex justify-between items-end">
                <p className="text-white text-2xl font-bold tracking-tight">
                  $4.12<span className="text-xs font-medium text-[#8a8f98]">/day</span>
                </p>
                <span className="text-rose-400 text-xs font-bold flex items-center gap-0.5 bg-rose-950/30 border border-rose-900/30 px-2 py-0.5 rounded-full">
                  <TrendUp size={12} />
                  12%
                </span>
              </div>
              <div className="w-full bg-[#0B0B0C] h-2 rounded-full overflow-hidden">
                <div className="bg-[#4E8981] h-full rounded-full" style={{ width: '65%' }}></div>
              </div>
              <p className="text-[11px] text-[#8a8f98] leading-relaxed">
                Based on current agent throughput, your balance will deplete in approximately 78 days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Ledger table */}
      <div className="bg-[#1A1D20] rounded-xl overflow-hidden border border-[#2A2F35]">
        <div className="px-6 py-5 border-b border-[#2A2F35] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1A1D20]">
          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Transaction Ledger</h4>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8f98]" size={16} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-[#2A2F35] bg-[#0B0B0C] text-white rounded-xl text-xs w-full focus:outline-none focus:border-[#4E8981]"
              placeholder="Filter transactions..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B0B0C]/40 border-b border-[#2A2F35]">
                <th className="px-6 py-4 text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider">Agent / Action</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider">Tx Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#8a8f98] uppercase tracking-wider text-right">Amount (USDC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2F35]">
              {/* Skeleton state */}
              {isLoadingLogs && [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-[#2A2F35]">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg skeleton-pulse flex-shrink-0" /><div className="h-3 w-32 skeleton-pulse rounded" /></div></td>
                  <td className="px-6 py-4"><div className="h-3 w-20 skeleton-pulse rounded" /></td>
                  <td className="px-6 py-4"><div className="h-3 w-28 skeleton-pulse rounded" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-20 skeleton-pulse rounded-full" /></td>
                  <td className="px-6 py-4 text-right"><div className="h-3 w-20 skeleton-pulse rounded ml-auto" /></td>
                </tr>
              ))}

              {/* Empty state */}
              {!isLoadingLogs && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#8a8f98]">
                      <EmptyIcon size={32} className="opacity-30" />
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
                        {filterQuery ? 'No transactions match your filter' : 'No transactions yet'}
                      </p>
                      {filterQuery && (
                        <button
                          onClick={() => setFilterQuery('')}
                          className="text-[10px] text-[#4E8981] hover:underline cursor-pointer"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Real rows */}
              {!isLoadingLogs && filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#0B0B0C]/20 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        log.status === 'FAILURE'
                          ? 'bg-rose-950/30 border border-rose-900/30 text-rose-400'
                          : 'bg-[#4E8981]/10 border border-[#4E8981]/20 text-[#4E8981]'
                      }`}>
                        {log.status === 'FAILURE' ? <Database size={16} /> : <Cpu size={16} />}
                      </div>
                      <span className="text-xs text-white font-semibold">{log.agent_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      log.tx_type === 'Deployment'
                        ? 'bg-sky-950/30 border-sky-900/30 text-sky-400'
                        : log.tx_type === 'Nanopayment'
                        ? 'bg-violet-950/30 border-violet-900/30 text-violet-400'
                        : log.tx_type === 'Listing'
                        ? 'bg-amber-950/30 border-amber-900/30 text-amber-400'
                        : log.tx_type === 'Transfer In'
                        ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-400'
                        : 'bg-[#2A2F35]/50 border-[#2A2F35] text-[#8a8f98]'
                    }`}>
                      {log.tx_type ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-[#8a8f98]">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-950/30 border border-emerald-900/30 text-emerald-400'
                        : 'bg-rose-950/30 border border-rose-900/30 text-rose-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`} />
                      {log.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right text-xs font-bold ${
                    log.cost_usdc < 0 ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {log.cost_usdc < 0 ? '+' : log.cost_usdc === 0 ? '' : '-'}{Math.abs(log.cost_usdc).toFixed(4)} USDC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
