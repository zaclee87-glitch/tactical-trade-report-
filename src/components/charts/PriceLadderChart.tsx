import React, { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { ParsedTradeReport } from '../../types/report';

interface PriceLadderChartProps {
  report: ParsedTradeReport;
}

interface PriceMarker {
  id: string;
  label: string;
  price: number;
  displayPrice: string;
  category: 'close' | 'sma' | 'support' | 'resistance' | 'bear' | 'base' | 'bull' | 'entry' | 'stop';
  color: string;
  detail: string;
}

export const PriceLadderChart: React.FC<PriceLadderChartProps> = ({ report }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { technicals, meta, tradePlan } = report;

  const markers: PriceMarker[] = [];

  if (technicals.lastCloseNum !== null) {
    markers.push({
      id: 'last-close',
      label: 'Last Close',
      price: technicals.lastCloseNum,
      displayPrice: `$${technicals.lastCloseNum.toFixed(2)}`,
      category: 'close',
      color: '#38BDF8',
      detail: `${meta.lastCloseDate || 'Latest'} close`,
    });
  }

  // Ideal Entry Zone(s) from Section 9b / Section 10
  tradePlan.idealEntries.forEach((entry, idx) => {
    markers.push({
      id: `entry-${idx}`,
      label: entry.label,
      price: entry.midpoint,
      displayPrice: entry.display,
      category: 'entry',
      color: '#A78BFA',
      detail: idx === 0 ? 'Primary ideal entry trigger' : 'Secondary washout entry trigger',
    });
  });

  if (tradePlan.stopLossNum !== null && tradePlan.verdict !== 'DO NOT ENTER') {
    markers.push({
      id: 'hard-stop',
      label: 'Hard Stop-Loss',
      price: tradePlan.stopLossNum,
      displayPrice: `$${tradePlan.stopLossNum.toFixed(2)}`,
      category: 'stop',
      color: '#FB7185',
      detail: 'Trade invalidation level',
    });
  }

  if (technicals.sma20Num !== null) {
    markers.push({
      id: 'sma-20',
      label: '20-Day SMA',
      price: technicals.sma20Num,
      displayPrice: `$${technicals.sma20Num.toFixed(2)}`,
      category: 'sma',
      color: '#94A3B8',
      detail: 'Short-term trend average',
    });
  }
  if (technicals.sma50Num !== null) {
    markers.push({
      id: 'sma-50',
      label: '50-Day SMA',
      price: technicals.sma50Num,
      displayPrice: `$${technicals.sma50Num.toFixed(2)}`,
      category: 'sma',
      color: '#64748B',
      detail: 'Medium-term trend average',
    });
  }
  if (technicals.sma200Num !== null) {
    markers.push({
      id: 'sma-200',
      label: '200-Day SMA',
      price: technicals.sma200Num,
      displayPrice: `$${technicals.sma200Num.toFixed(2)}`,
      category: 'sma',
      color: '#475569',
      detail: 'Long-term institutional trend',
    });
  }

  technicals.supportLevels.slice(0, 2).forEach((lvl, idx) => {
    markers.push({
      id: `support-${idx}`,
      label: idx === 0 ? 'Near Support' : 'Deep Support',
      price: lvl,
      displayPrice: `$${lvl.toFixed(2)}`,
      category: 'support',
      color: '#10B981',
      detail: 'Key downside floor',
    });
  });

  technicals.resistanceLevels.slice(0, 1).forEach((lvl, idx) => {
    markers.push({
      id: `resistance-${idx}`,
      label: 'Resistance',
      price: lvl,
      displayPrice: `$${lvl.toFixed(2)}`,
      category: 'resistance',
      color: '#F59E0B',
      detail: 'Overhead supply zone',
    });
  });

  technicals.scenarios.forEach((sc) => {
    if (sc.targetPriceNum === null) return;
    const cat = sc.scenario.toLowerCase().includes('bear')
      ? 'bear'
      : sc.scenario.toLowerCase().includes('bull')
        ? 'bull'
        : 'base';
    markers.push({
      id: `scen-${cat}`,
      label: `${sc.scenario} Target`,
      price: sc.targetPriceNum,
      displayPrice: `$${sc.targetPriceNum.toFixed(2)}`,
      category: cat,
      color: cat === 'bear' ? '#EF4444' : cat === 'bull' ? '#10B981' : '#38BDF8',
      detail: `${sc.pctMoveStr} · ${sc.multipleStr}`,
    });
  });

  // Sort high to low for a vertical price ladder (highest price at top)
  const sortedDesc = [...markers].sort((a, b) => b.price - a.price);
  const entryPrices = tradePlan.idealEntries.flatMap((e) => [e.low, e.high]);
  const allPrices = [...sortedDesc.map((m) => m.price), ...entryPrices];
  const minVal = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxVal = allPrices.length > 0 ? Math.max(...allPrices) : 100;
  const pad = Math.max((maxVal - minVal) * 0.08, 2);
  const axisMin = Math.max(0, minVal - pad);
  const axisMax = maxVal + pad;
  const span = axisMax - axisMin || 1;

  // Vertical SVG coordinate mapping (Top = axisMax, Bottom = axisMin)
  const svgHeight = Math.max(460, sortedDesc.length * 42 + 40);
  const topPad = 26;
  const bottomPad = 26;
  const plotH = svgHeight - topPad - bottomPad;

  const toY = (p: number) => topPad + ((axisMax - p) / span) * plotH;

  // Collision-free vertical label positioning (top-down minimum gap pass, then bottom-up clamp)
  const minGap = 32;
  const rawYs = sortedDesc.map((m) => toY(m.price));
  const labelYs = [...rawYs];
  for (let i = 1; i < labelYs.length; i++) {
    if (labelYs[i] - labelYs[i - 1] < minGap) {
      labelYs[i] = labelYs[i - 1] + minGap;
    }
  }
  const maxAllowedY = svgHeight - bottomPad;
  if (labelYs.length > 0 && labelYs[labelYs.length - 1] > maxAllowedY) {
    labelYs[labelYs.length - 1] = maxAllowedY;
    for (let i = labelYs.length - 2; i >= 0; i--) {
      if (labelYs[i + 1] - labelYs[i] < minGap) {
        labelYs[i] = labelYs[i + 1] - minGap;
      }
    }
  }

  // RSI value
  const rsi = technicals.rsi14Num;
  const rsiZone =
    rsi === null ? 'N/A' : rsi >= 70 ? 'Overheated (>70)' : rsi <= 30 ? 'Oversold (<30)' : 'Neutral (30–70)';
  const rsiColor = rsi === null ? '#64748B' : rsi >= 70 ? '#EF4444' : rsi <= 32 ? '#F59E0B' : '#38BDF8';

  const close = technicals.lastCloseNum;
  const atr = meta.atrDollarNum;

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Vertical Price Ladder, Ideal Entry &amp; 2–3 Month Scenarios
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            High-to-low price axis mapping ideal entry zones, moving averages, support/resistance, and scenario targets
          </p>
        </div>
        {close !== null && atr !== null && (
          <div className="text-xs font-mono tabular-nums text-slate-400">
            14D ATR Band:{' '}
            <span className="text-slate-200">
              ${(close - atr).toFixed(2)} – ${(close + atr).toFixed(2)}
            </span>{' '}
            ({meta.atrPercentStr})
          </div>
        )}
      </div>

      {sortedDesc.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded">
          No numeric price levels or scenario targets were detected in Section 8.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Vertical Calibrated Price Ladder SVG */}
          <div className="lg:col-span-6 bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4">
            <svg viewBox={`0 0 480 ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
              {/* Vertical Spine */}
              <line
                x1="78"
                y1={topPad}
                x2="78"
                y2={svgHeight - bottomPad}
                stroke="#1E293B"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Horizontal Grid Reference Ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const tickPrice = axisMin + frac * span;
                const y = toY(tickPrice);
                return (
                  <g key={frac}>
                    <line x1="64" y1={y} x2="86" y2={y} stroke="#334155" strokeWidth="1" />
                    <text
                      x="58"
                      y={y + 3}
                      textAnchor="end"
                      fill="#64748B"
                      className="font-mono text-[10px] tabular-nums"
                    >
                      ${tickPrice.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* 14-Day ATR Volatility Band around Last Close */}
              {close !== null && atr !== null && (
                <rect
                  x="68"
                  y={toY(Math.min(axisMax, close + atr))}
                  width="20"
                  height={Math.max(
                    6,
                    toY(Math.max(axisMin, close - atr)) - toY(Math.min(axisMax, close + atr))
                  )}
                  rx="3"
                  fill="#38BDF8"
                  fillOpacity="0.14"
                  stroke="#38BDF8"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                />
              )}

              {/* Ideal Entry Zone Band(s) */}
              {tradePlan.idealEntries.map((entry, idx) => {
                const yTop = toY(entry.high);
                const yBot = toY(entry.low);
                const bandH = Math.max(8, yBot - yTop);
                const bandY = entry.low === entry.high ? yTop - 4 : yTop;
                return (
                  <rect
                    key={`zone-${idx}`}
                    x="65"
                    y={bandY}
                    width="26"
                    height={bandH}
                    rx="3"
                    fill="#A78BFA"
                    fillOpacity={idx === 0 ? 0.24 : 0.14}
                    stroke="#A78BFA"
                    strokeOpacity="0.7"
                    strokeWidth="1.2"
                    strokeDasharray={idx === 0 ? undefined : '3 2'}
                  />
                );
              })}

              {/* Price Markers & Elbow Callout Rows */}
              {sortedDesc.map((m, idx) => {
                const exactY = toY(m.price);
                const labelY = labelYs[idx];
                const isHovered = hoveredId === m.id;
                const isEntry = m.category === 'entry';
                const isClose = m.category === 'close';
                const deltaPct =
                  close !== null && close > 0 && !isClose
                    ? ((m.price - close) / close) * 100
                    : null;

                return (
                  <g
                    key={m.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredId(m.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Elbow connector from exact price Y to collision-free label Y */}
                    <path
                      d={`M 78 ${exactY} L 104 ${exactY} L 122 ${labelY} L 138 ${labelY}`}
                      fill="none"
                      stroke={m.color}
                      strokeWidth={isHovered || isEntry || isClose ? 1.8 : 1.1}
                      strokeDasharray={m.category === 'sma' ? '3 3' : undefined}
                      opacity={isHovered ? 1 : 0.78}
                    />

                    {/* Spine Marker */}
                    {isEntry ? (
                      <polygon
                        points={`78,${exactY - 6} 84,${exactY} 78,${exactY + 6} 72,${exactY}`}
                        fill="#A78BFA"
                        stroke="#0B111E"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <circle
                        cx="78"
                        cy={exactY}
                        r={isHovered ? 6.5 : isClose ? 5.5 : 4.2}
                        fill={m.color}
                        stroke="#0B111E"
                        strokeWidth="2"
                      />
                    )}

                    {/* Label Row Background Highlight */}
                    <rect
                      x="140"
                      y={labelY - 12}
                      width="332"
                      height="24"
                      rx="4"
                      fill={isHovered ? '#1E293B' : isEntry ? 'rgba(167,139,250,0.08)' : isClose ? 'rgba(56,189,248,0.08)' : 'transparent'}
                      stroke={isEntry ? 'rgba(167,139,250,0.35)' : isClose ? 'rgba(56,189,248,0.3)' : 'transparent'}
                      strokeWidth="1"
                    />

                    {/* Price Value */}
                    <text
                      x="148"
                      y={labelY + 4}
                      fill={isHovered ? '#F8FAFC' : m.color}
                      className="font-mono text-[11px] font-semibold tabular-nums"
                    >
                      {m.displayPrice}
                    </text>

                    {/* Label Title */}
                    <text
                      x="252"
                      y={labelY + 4}
                      fill={isHovered || isEntry || isClose ? '#F1F5F9' : '#CBD5E1'}
                      className="text-[11px] font-medium"
                    >
                      {m.label}
                    </text>

                    {/* % Distance from Last Close */}
                    {deltaPct !== null && (
                      <text
                        x="464"
                        y={labelY + 4}
                        textAnchor="end"
                        fill={deltaPct >= 0 ? '#34D399' : '#FB7185'}
                        className="font-mono text-[10px] tabular-nums"
                      >
                        {deltaPct >= 0 ? '+' : ''}
                        {deltaPct.toFixed(1)}%
                      </text>
                    )}
                    {isClose && (
                      <text
                        x="464"
                        y={labelY + 4}
                        textAnchor="end"
                        fill="#38BDF8"
                        className="font-mono text-[10px]"
                      >
                        CURRENT
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right: Ideal Entry Panel, Interactive Level Details & RSI */}
          <div className="lg:col-span-6 space-y-4">
            {/* Ideal Entry Callout Box */}
            <div className="bg-[#0B111E]/80 border border-violet-500/35 rounded-md p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                  <Crosshair className="w-4 h-4" />
                  <span>Ideal Entry Price &amp; Trigger</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {tradePlan.verdict === 'DO NOT ENTER' ? 'Wait Trigger' : 'Active Entry'}
                </span>
              </div>

              {tradePlan.idealEntries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tradePlan.idealEntries.map((entry, idx) => {
                    const dist =
                      close !== null && close > 0 ? ((entry.midpoint - close) / close) * 100 : null;
                    return (
                      <div
                        key={idx}
                        className="bg-[#131C2E] border border-slate-800 rounded px-3 py-2"
                      >
                        <div className="text-[11px] text-slate-400">{entry.label}</div>
                        <div className="mt-0.5 flex items-baseline justify-between gap-2">
                          <span className="font-mono text-sm font-bold text-violet-300 tabular-nums">
                            {entry.display}
                          </span>
                          {dist !== null && (
                            <span
                              className={`font-mono text-[11px] tabular-nums ${
                                dist >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {dist >= 0 ? '+' : ''}
                              {dist.toFixed(1)}% vs close
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="font-mono text-sm font-semibold text-violet-300">
                  {tradePlan.entryRule || 'N/A'}
                </div>
              )}

              {tradePlan.entryRule && (
                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  {tradePlan.entryRule}
                </p>
              )}
            </div>

            {/* 14-Day RSI Momentum Gauge */}
            <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">14-Day RSI Momentum</span>
                <span className="font-mono tabular-nums font-semibold" style={{ color: rsiColor }}>
                  {rsi !== null ? rsi.toFixed(1) : 'N/A'} · {rsiZone}
                </span>
              </div>
              <div className="relative h-2.5 bg-slate-900 rounded overflow-hidden border border-slate-800">
                <div className="absolute inset-y-0 left-0 w-[30%] bg-emerald-500/15" />
                <div className="absolute inset-y-0 right-0 w-[30%] bg-rose-500/15" />
                {rsi !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-1.5 rounded-xs"
                    style={{
                      left: `calc(${Math.min(100, Math.max(0, rsi))}% - 3px)`,
                      backgroundColor: rsiColor,
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 tabular-nums">
                <span>0</span>
                <span>30 Oversold</span>
                <span>50</span>
                <span>70 Overheated</span>
                <span>100</span>
              </div>
            </div>

            {/* Chart Verdict */}
            <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">Chart Verdict</div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {technicals.chartVerdict || 'No chart verdict summary provided in report.'}
              </p>
            </div>

            {/* Hover Detail Ledger */}
            <div className="grid grid-cols-2 gap-2">
              {sortedDesc.map((m) => {
                const isActive = hoveredId === m.id;
                return (
                  <div
                    key={m.id}
                    onMouseEnter={() => setHoveredId(m.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`px-3 py-2 rounded border transition-colors cursor-default ${
                      isActive
                        ? 'bg-slate-800/80 border-slate-600'
                        : 'bg-[#0B111E]/60 border-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="truncate">{m.label}</span>
                      <span
                        className="w-2 h-2 rounded-xs shrink-0"
                        style={{ backgroundColor: m.color }}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-0.5 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-100 tabular-nums">
                        {m.displayPrice}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">{m.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Scenario Cards Table (8c) */}
      {technicals.scenarios.length > 0 && (
        <div className="pt-4 border-t border-slate-800/80">
          <h4 className="text-xs font-semibold text-slate-300 mb-3">2–3 Month Price Scenario Matrix</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3 font-medium">Scenario</th>
                  <th className="py-2 px-3 font-medium">Key Driver</th>
                  <th className="py-2 px-3 font-medium text-right">Sales Gr.</th>
                  <th className="py-2 px-3 font-medium text-right">Est. EPS</th>
                  <th className="py-2 px-3 font-medium text-right">Multiple</th>
                  <th className="py-2 px-3 font-medium text-right">Target</th>
                  <th className="py-2 px-3 font-medium text-right">% Move</th>
                  <th className="py-2 pl-3 font-medium">What Must Happen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {technicals.scenarios.map((s, idx) => {
                  const isBear = s.scenario.toLowerCase().includes('bear');
                  const isBull = s.scenario.toLowerCase().includes('bull');
                  const accentText = isBear
                    ? 'text-rose-400'
                    : isBull
                      ? 'text-emerald-400'
                      : 'text-sky-400';
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className={`py-2.5 pr-3 font-semibold whitespace-nowrap ${accentText}`}>
                        {s.scenario}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 min-w-[160px]">{s.driver}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {s.salesGrowthStr}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {s.epsStr}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {s.multipleStr}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-100 whitespace-nowrap">
                        {s.targetPriceStr}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${accentText}`}>
                        {s.pctMoveStr}
                      </td>
                      <td className="py-2.5 pl-3 text-slate-400 min-w-[220px]">{s.whatMustHappen}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
