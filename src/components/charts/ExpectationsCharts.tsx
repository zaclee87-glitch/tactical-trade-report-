import React, { useState } from 'react';
import { ParsedTradeReport } from '../../types/report';

interface ExpectationsChartsProps {
  report: ParsedTradeReport;
}

export const ExpectationsCharts: React.FC<ExpectationsChartsProps> = ({ report }) => {
  const { expectations } = report;
  const [hoveredQuarter, setHoveredQuarter] = useState<number | null>(null);

  const surprises = expectations.earningsSurprises;
  const revisions = expectations.estimateRevisions;

  // Compute scale for surprises
  const epsVals = surprises.flatMap((s) => [s.actualNum ?? 0, s.expectedNum ?? 0]);
  const maxEps = Math.max(0.2, ...epsVals.map((v) => Math.abs(v)));
  const minEps = Math.min(0, ...epsVals);
  const epsRange = maxEps - minEps || 1;

  // Compute scale for revisions
  const revVals = revisions.map((r) => r.estimateNum).filter((v): v is number => v !== null);
  const revMin = revVals.length ? Math.min(...revVals) * 0.9 : 0;
  const revMax = revVals.length ? Math.max(...revVals) * 1.08 : 2;
  const revSpan = revMax - revMin || 1;

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Wall Street Expectations, Revisions &amp; Earnings Track Record
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Fiscal Year-End: {expectations.fiscalYearEnd}
          </p>
        </div>
      </div>

      {/* Dual Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Last 4 Quarters Actual vs Expected EPS */}
        <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200">
              Recent Earnings Surprises (Actual vs. Expected EPS)
            </h4>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-600 rounded-xs" /> Expected
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> Actual (Beat)
              </span>
            </div>
          </div>

          {surprises.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No quarterly earnings surprise data detected.
            </div>
          ) : (
            <div className="space-y-3">
              <svg viewBox="0 0 420 170" className="w-full h-44">
                {(() => {
                  const chartTop = 20;
                  const chartBottom = 135;
                  const chartH = chartBottom - chartTop;
                  const zeroY = chartTop + (maxEps / epsRange) * chartH;

                  return (
                    <>
                      {/* Zero Baseline */}
                      <line
                        x1="30"
                        y1={zeroY}
                        x2="405"
                        y2={zeroY}
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      {surprises.map((s, idx) => {
                        const groupX = 55 + idx * 88;
                        const expVal = s.expectedNum ?? 0;
                        const actVal = s.actualNum ?? 0;
                        const expH = (Math.abs(expVal) / epsRange) * chartH;
                        const actH = (Math.abs(actVal) / epsRange) * chartH;
                        const expY = expVal >= 0 ? zeroY - expH : zeroY;
                        const actY = actVal >= 0 ? zeroY - actH : zeroY;
                        const isBeat = s.result.toLowerCase().includes('beat');
                        const barColor = isBeat ? '#10B981' : '#EF4444';

                        return (
                          <g
                            key={idx}
                            onMouseEnter={() => setHoveredQuarter(idx)}
                            onMouseLeave={() => setHoveredQuarter(null)}
                            className="cursor-pointer"
                          >
                            {/* Expected Bar */}
                            <rect
                              x={groupX}
                              y={expY}
                              width="22"
                              height={Math.max(2, expH)}
                              rx="2"
                              fill="#475569"
                              opacity={hoveredQuarter === idx ? 1 : 0.85}
                            />
                            {/* Actual Bar */}
                            <rect
                              x={groupX + 26}
                              y={actY}
                              width="22"
                              height={Math.max(2, actH)}
                              rx="2"
                              fill={barColor}
                              opacity={hoveredQuarter === idx ? 1 : 0.9}
                            />
                            {/* Surprise Label */}
                            <text
                              x={groupX + 24}
                              y={13}
                              textAnchor="middle"
                              fill={barColor}
                              className="font-mono text-[10px] font-semibold tabular-nums"
                            >
                              {s.diffPctStr}
                            </text>
                            {/* Quarter Label */}
                            <text
                              x={groupX + 24}
                              y="158"
                              textAnchor="middle"
                              fill="#94A3B8"
                              className="font-mono text-[10px]"
                            >
                              {s.quarter}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>

              {/* Compact Surprise Table */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono tabular-nums">
                {surprises.map((s, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border ${
                      hoveredQuarter === idx
                        ? 'border-slate-600 bg-slate-800/50'
                        : 'border-slate-800/60 bg-[#131C2E]/60'
                    }`}
                  >
                    <div className="text-slate-400">{s.quarter}</div>
                    <div className="text-slate-100 font-semibold mt-0.5">
                      {s.actualStr} <span className="text-slate-500 font-normal">vs {s.expectedStr}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Estimate Revisions Trajectory */}
        <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200">
              FY EPS Estimate Revisions ({expectations.revisionPeriodLabel})
            </h4>
            <span className="font-mono text-[11px] text-sky-400">Consensus Shift</span>
          </div>

          {revisions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No estimate revision timeline detected.
            </div>
          ) : (
            <div className="space-y-3">
              <svg viewBox="0 0 420 170" className="w-full h-44">
                {(() => {
                  const pts = revisions
                    .map((r, i) => {
                      if (r.estimateNum === null) return null;
                      const x = 45 + (i / Math.max(1, revisions.length - 1)) * 330;
                      const y = 130 - ((r.estimateNum - revMin) / revSpan) * 95;
                      return { x, y, r };
                    })
                    .filter((p): p is { x: number; y: number; r: typeof revisions[0] } => p !== null);

                  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <>
                      <line x1="30" y1="130" x2="395" y2="130" stroke="#1E293B" strokeWidth="1" />
                      {pathD && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      {pts.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r="4.5" fill="#38BDF8" stroke="#0B111E" strokeWidth="2" />
                          <text
                            x={p.x}
                            y={p.y - 12}
                            textAnchor="middle"
                            fill="#F8FAFC"
                            className="font-mono text-[11px] font-semibold tabular-nums"
                          >
                            {p.r.estimateStr}
                          </text>
                          <text
                            x={p.x}
                            y="154"
                            textAnchor="middle"
                            fill="#94A3B8"
                            className="text-[10px]"
                          >
                            {p.r.timeframe.replace(/\(.*?\)/g, '').trim()}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              {expectations.revisionBreadth && (
                <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800/80">
                  {expectations.revisionBreadth}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Forward Consensus Table (4a) & Takeaway (4d) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-800/80">
        {expectations.forwardConsensus.length > 0 && (
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3 font-medium">Consensus Metric</th>
                  <th className="py-2 px-3 font-medium text-right">Current FY</th>
                  <th className="py-2 px-3 font-medium text-right">Next FY</th>
                  <th className="py-2 pl-3 font-medium text-right">2 Years Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expectations.forwardConsensus.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3 text-slate-200 font-medium">{row.metric}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-200">{row.currentFy}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-sky-300">{row.nextFy}</td>
                    <td className="py-2 pl-3 text-right font-mono tabular-nums text-slate-400">{row.twoYearsOut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={`${expectations.forwardConsensus.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'} flex flex-col justify-center bg-[#0B111E]/60 border border-slate-800/80 rounded-md p-4`}>
          <div className="text-xs font-semibold text-slate-300 mb-1.5">Expectations Takeaway</div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {expectations.takeaway || 'No expectations takeaway parsed.'}
          </p>
        </div>
      </div>
    </div>
  );
};
