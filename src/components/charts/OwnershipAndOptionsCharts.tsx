import React from 'react';
import { ParsedTradeReport } from '../../types/report';

interface OwnershipChartProps {
  report: ParsedTradeReport;
}

export const OwnershipBreakdownCard: React.FC<OwnershipChartProps> = ({ report }) => {
  const { ownership } = report;
  const inst = ownership.institutionalPctNum ?? 0;
  const insider = ownership.insiderPctNum ?? 0;
  const other = Math.max(0, 100 - inst - insider);
  const shortPct = ownership.shortPctNum ?? 0;

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Ownership, Short Sellers &amp; Insider Activity
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Shareholder crowding and 90-day executive Form 4 activity
          </p>
        </div>
      </div>

      {/* Ownership Stacked Bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-medium">Shareholder Structure</span>
          <div className="flex items-center gap-4 font-mono tabular-nums text-[11px]">
            <span className="text-sky-300">Institutional: {ownership.institutionalPctStr}</span>
            <span className="text-amber-300">Insiders: {ownership.insiderPctStr}</span>
            <span className="text-slate-400">Public / Other: {other > 0 ? `${other.toFixed(1)}%` : 'N/A'}</span>
          </div>
        </div>
        <div className="h-3.5 w-full bg-[#0B111E] border border-slate-800 rounded overflow-hidden flex">
          {inst > 0 && (
            <div className="bg-sky-500/80 h-full" style={{ width: `${Math.min(100, inst)}%` }} />
          )}
          {insider > 0 && (
            <div className="bg-amber-400/90 h-full" style={{ width: `${Math.min(100, insider)}%` }} />
          )}
          {other > 0 && (
            <div className="bg-slate-700 h-full" style={{ width: `${other}%` }} />
          )}
        </div>
      </div>

      {/* Short Interest & Insider KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-3.5">
          <div className="text-xs text-slate-400">Short % of Float</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono text-lg font-semibold text-rose-400 tabular-nums">
              {shortPct > 0 ? `${shortPct.toFixed(2)}%` : 'N/A'}
            </span>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {ownership.daysToCoverStr} to cover
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-900 rounded overflow-hidden">
            <div
              className="h-full bg-rose-500/80"
              style={{ width: `${Math.min(100, Math.max(4, shortPct * 3))}%` }}
            />
          </div>
        </div>

        <div className="sm:col-span-2 bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
          <div className="text-xs text-slate-400">Insider Buying / Selling (Last 90 Days)</div>
          <div className="text-xs text-slate-200 leading-relaxed">
            {ownership.insiderActivitySummary}
          </div>
          {ownership.scheduledSales && (
            <div className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300">10b5-1 Scheduled:</strong> {ownership.scheduledSales}
            </div>
          )}
          {ownership.discretionarySales && (
            <div className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Discretionary:</strong> {ownership.discretionarySales}
            </div>
          )}
        </div>
      </div>

      {/* Crowding Takeaway */}
      {ownership.crowdingTakeaway && (
        <div className="pt-3 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-300 mb-1">Crowding Takeaway</div>
          <p className="text-sm text-slate-200 leading-relaxed">{ownership.crowdingTakeaway}</p>
        </div>
      )}
    </div>
  );
};

export const OptionsVolatilityGauge: React.FC<OwnershipChartProps> = ({ report }) => {
  const { tradePlan, meta } = report;
  const iv = tradePlan.ivNum;
  const ivHigh = tradePlan.ivHighNum ?? iv;
  const hv = tradePlan.hvNum;
  const hvHigh = tradePlan.hvHighNum ?? hv;
  const ivMin52 = tradePlan.ivMin52wNum;
  const ivMax52 = tradePlan.ivMax52wNum;
  const ivRank = tradePlan.ivRankNum;

  const calmFloor = 30; // Practical low-volatility baseline for equity options (<30% IV)
  const scaleMax = Math.max(140, ivMax52 ?? 0, hvHigh ?? 0, ivHigh ?? 0);

  const avgVol = tradePlan.optionsAvgVolNum;
  const minLiquidVol = 5000; // Minimum practical daily contract volume for tight monthly spreads
  const volGaugeMax = Math.max(15000, avgVol ?? 0);

  const oiHigh = tradePlan.optionsOiHighNum ?? tradePlan.optionsOiLowNum;
  const minLiquidOi = 25000; // Minimum total open interest benchmark for institutional-grade fills
  const oiGaugeMax = Math.max(50000, oiHigh ?? 0);

  const liqColor =
    tradePlan.optionsLiquidityTier === 'Tight/Liquid'
      ? 'text-emerald-400'
      : tradePlan.optionsLiquidityTier === 'Average'
        ? 'text-amber-400'
        : 'text-rose-400';

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Plain Stock vs. Regular Monthly Options Check
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            30–90 day standard monthly expiration liquidity benchmarks and volatility floor markers
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
          {meta.nextEarningsDte && (
            <span className="text-amber-300 font-semibold">
              Earnings: {meta.nextEarningsDte}
            </span>
          )}
          {meta.nextEarningsDte && <span className="text-slate-600">·</span>}
          <span className="font-semibold text-sky-300">
            IV Rank: {tradePlan.ivRankStr}
          </span>
        </div>
      </div>

      {/* 1. Volatility Spectrum with Minimal Volatility & 52W Range Markers */}
      {(iv !== null || hv !== null) && (
        <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-200">
              Volatility Spectrum &amp; Minimal Volatility Markers
            </span>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono tabular-nums">
              <span className="text-emerald-400">Calm Baseline: {calmFloor}%</span>
              {ivMin52 !== null && (
                <span className="text-sky-300">52W Min IV: {ivMin52}%</span>
              )}
              {ivMax52 !== null && (
                <span className="text-slate-400">52W Max IV: {ivMax52}%</span>
              )}
            </div>
          </div>

          {/* Unified Volatility Axis */}
          <div className="space-y-2">
            <div className="relative h-8 bg-slate-950 border border-slate-800 rounded overflow-visible">
              {/* Calm / Minimal Volatility Zone (0% - 30%) */}
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500/12 border-r border-dashed border-emerald-400/70"
                style={{ width: `${(calmFloor / scaleMax) * 100}%` }}
                title={`Minimal / Low-Vol Baseline (<= ${calmFloor}% IV)`}
              />

              {/* Stock's Own 52-Week IV Range Band */}
              {ivMin52 !== null && ivMax52 !== null && (
                <div
                  className="absolute top-1.5 bottom-1.5 bg-sky-500/15 border-x border-sky-400/70 rounded-xs"
                  style={{
                    left: `${(ivMin52 / scaleMax) * 100}%`,
                    width: `${Math.max(1, ((ivMax52 - ivMin52) / scaleMax) * 100)}%`,
                  }}
                  title={`52-Week IV Range: ${ivMin52}%–${ivMax52}%`}
                />
              )}

              {/* Current 30-Day IV Marker */}
              {iv !== null && (
                <div
                  className="absolute top-1 bottom-1 bg-amber-400/90 rounded-xs"
                  style={{
                    left: `${(iv / scaleMax) * 100}%`,
                    width: `${Math.max(4, (((ivHigh ?? iv) - iv) / scaleMax) * 100)}%`,
                    minWidth: '6px',
                  }}
                  title={`Current 30D IV: ${tradePlan.ivStr}`}
                />
              )}

              {/* Realized Historical Volatility (HV) Marker */}
              {hv !== null && (
                <div
                  className="absolute top-1 bottom-1 bg-rose-500/90 rounded-xs"
                  style={{
                    left: `${(hv / scaleMax) * 100}%`,
                    width: `${Math.max(4, (((hvHigh ?? hv) - hv) / scaleMax) * 100)}%`,
                    minWidth: '6px',
                  }}
                  title={`Realized HV: ${tradePlan.hvStr}`}
                />
              )}
            </div>

            {/* Scale Labels */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400 rounded-xs" />
                  Min Calm Floor ({calmFloor}%)
                </span>
                {ivMin52 !== null && (
                  <span className="inline-flex items-center gap-1.5 text-sky-300">
                    <span className="w-2 h-2 bg-sky-400 rounded-xs" />
                    52W Min IV ({ivMin52}%)
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-amber-300">
                  <span className="w-2 h-2 bg-amber-400 rounded-xs" />
                  30D IV ({tradePlan.ivStr})
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-400">
                  <span className="w-2 h-2 bg-rose-500 rounded-xs" />
                  Realized HV ({tradePlan.hvStr})
                </span>
              </div>
              <span>Scale Max: {scaleMax}%</span>
            </div>
          </div>

          {/* IV Rank Gauge with Cheap/Fair/Rich Markers */}
          {ivRank !== null && (
            <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">IV Rank (Where IV Sits vs. Past Year)</span>
                <span className="font-mono font-semibold text-sky-300 tabular-nums">
                  {tradePlan.ivRankStr} (
                  {ivRank < 25 ? 'Cheap vs. 1Y' : ivRank <= 50 ? 'Moderate / Fair' : 'Expensive / Crush Risk'})
                </span>
              </div>
              <div className="relative h-2.5 bg-slate-900 rounded border border-slate-800 overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-[25%] bg-emerald-500/15" />
                <div className="absolute inset-y-0 left-[25%] w-[25%] bg-sky-500/10" />
                <div className="absolute inset-y-0 left-[50%] w-[50%] bg-rose-500/15" />
                <div className="absolute inset-y-0 left-[25%] w-px bg-slate-600" />
                <div className="absolute inset-y-0 left-[50%] w-px bg-slate-600" />
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-sky-400 rounded-xs"
                  style={{ left: `calc(${Math.min(100, Math.max(0, ivRank))}% - 3px)` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 tabular-nums">
                <span>0% (Min IV)</span>
                <span>25% Cheap</span>
                <span>50% Fair</span>
                <span>75% Rich</span>
                <span>100% (Max IV)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Monthly Options Liquidity Benchmarks */}
      <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-200">
            Monthly Options Liquidity vs. Practical Minimum Thresholds
          </span>
          <span className={`font-mono text-xs font-semibold ${liqColor}`}>
            Tier: {tradePlan.optionsLiquidityTier}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Daily Options Volume Bar + Min 5,000 Marker */}
          <div className="bg-[#131C2E]/80 border border-slate-800 rounded p-3 space-y-2">
            <div className="text-[11px] text-slate-400">Avg Options Vol / Day</div>
            <div className="font-mono text-sm font-semibold text-slate-100 tabular-nums">
              {avgVol !== null ? avgVol.toLocaleString() : 'N/A'}
              {tradePlan.optionsLowVolNum !== null && (
                <span className="text-[11px] font-normal text-slate-400">
                  {' '}
                  (low {tradePlan.optionsLowVolNum.toLocaleString()})
                </span>
              )}
            </div>
            <div className="relative h-2 bg-slate-900 rounded overflow-visible">
              {avgVol !== null && (
                <div
                  className={`h-full rounded ${avgVol >= minLiquidVol ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(100, (avgVol / volGaugeMax) * 100)}%` }}
                />
              )}
              <div
                className="absolute -top-1 -bottom-1 w-0.5 bg-sky-400"
                style={{ left: `${(minLiquidVol / volGaugeMax) * 100}%` }}
                title="Min Practical Liquid Threshold: 5,000 contracts/day"
              />
            </div>
            <div className="text-[10px] font-mono text-sky-300 tabular-nums">
              Min Liquid Marker: {minLiquidVol.toLocaleString()}/day
            </div>
          </div>

          {/* Open Interest Bar + Min 25,000 Marker */}
          <div className="bg-[#131C2E]/80 border border-slate-800 rounded p-3 space-y-2">
            <div className="text-[11px] text-slate-400">Total Open Interest</div>
            <div className="font-mono text-sm font-semibold text-slate-100 tabular-nums">
              {tradePlan.optionsOiLowNum !== null
                ? tradePlan.optionsOiHighNum !== null
                  ? `${tradePlan.optionsOiLowNum.toLocaleString()}–${tradePlan.optionsOiHighNum.toLocaleString()}`
                  : tradePlan.optionsOiLowNum.toLocaleString()
                : 'N/A'}
            </div>
            <div className="relative h-2 bg-slate-900 rounded overflow-visible">
              {oiHigh !== null && (
                <div
                  className={`h-full rounded ${oiHigh >= minLiquidOi ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(100, (oiHigh / oiGaugeMax) * 100)}%` }}
                />
              )}
              <div
                className="absolute -top-1 -bottom-1 w-0.5 bg-sky-400"
                style={{ left: `${(minLiquidOi / oiGaugeMax) * 100}%` }}
                title="Min Practical Liquid OI: 25,000 contracts"
              />
            </div>
            <div className="text-[10px] font-mono text-sky-300 tabular-nums">
              Min Liquid Marker: {minLiquidOi.toLocaleString()} OI
            </div>
          </div>

          {/* Put/Call OI Ratio */}
          <div className="bg-[#131C2E]/80 border border-slate-800 rounded p-3 space-y-1">
            <div className="text-[11px] text-slate-400">Put / Call OI Ratio</div>
            <div className="font-mono text-sm font-semibold text-slate-100 tabular-nums">
              {tradePlan.putCallRatioNum !== null ? tradePlan.putCallRatioNum.toFixed(2) : 'N/A'}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              {tradePlan.putCallRatioNum !== null
                ? tradePlan.putCallRatioNum < 0.7
                  ? 'Call-skewed positioning'
                  : tradePlan.putCallRatioNum > 1.0
                    ? 'Heavy put hedging'
                    : 'Balanced OI skew'
                : 'See liquidity notes'}
            </div>
          </div>

          {/* Stock Share Liquidity Comparison */}
          <div className="bg-[#131C2E]/80 border border-slate-800 rounded p-3 space-y-1">
            <div className="text-[11px] text-slate-400">Plain Stock Liquidity</div>
            <div className="font-mono text-xs font-semibold text-emerald-400 tabular-nums leading-snug">
              {meta.avgVolume.split(',')[0]}
            </div>
            <div className="text-[11px] text-slate-400 pt-0.5">
              Compare vs. monthly option spread slippage
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Details & Vehicle Verdict */}
      <div className="space-y-3 text-xs leading-relaxed">
        <div>
          <span className="font-semibold text-slate-200">Monthly Options Liquidity: </span>
          <span className="text-slate-300">{tradePlan.optionsLiquidity}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-200">Option Pricing: </span>
          <span className="text-slate-300">{tradePlan.optionsPricing}</span>
        </div>
        <div className="p-3 bg-[#0B111E] border border-slate-800 rounded">
          <span className="font-semibold text-sky-300">Vehicle Verdict: </span>
          <span className="text-slate-100">{tradePlan.vehicleVerdict}</span>
        </div>
      </div>
    </div>
  );
};
