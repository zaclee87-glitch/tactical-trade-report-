import React from 'react';
import { TrendingUp, TrendingDown, PauseCircle, AlertTriangle, Calendar, ShieldAlert } from 'lucide-react';
import { ParsedTradeReport, TradeVerdict } from '../types/report';

interface TradeCardHeroProps {
  report: ParsedTradeReport;
}

function getVerdictTheme(verdict: TradeVerdict) {
  switch (verdict) {
    case 'LONG':
      return {
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/10',
        Icon: TrendingUp,
        label: 'LONG · Buy',
      };
    case 'SHORT':
      return {
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        bg: 'bg-rose-500/10',
        Icon: TrendingDown,
        label: 'SHORT · Bet Against',
      };
    case 'DO NOT ENTER':
    default:
      return {
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        bg: 'bg-amber-500/10',
        Icon: PauseCircle,
        label: verdict === 'DO NOT ENTER' ? 'DO NOT ENTER · Pass' : 'Review Report',
      };
  }
}

export const TradeCardHero: React.FC<TradeCardHeroProps> = ({ report }) => {
  const { meta, tradePlan, tradeCard } = report;
  const v = getVerdictTheme(tradePlan.verdict);
  const VerdictIcon = v.Icon;

  return (
    <section id="section-overview" className="space-y-4">
      {/* Main 10-Second Trade Card */}
      <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-6 space-y-5">
        {/* Top Metadata Line (Zero-Pill Unboxed Text) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-slate-300">{meta.exchange}</span>
            <span aria-hidden="true">·</span>
            <span>{meta.sectorIndustry}</span>
            {meta.reportDate && (
              <>
                <span aria-hidden="true">·</span>
                <span>Report Date: {meta.reportDate}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>Horizon: {meta.horizon}</span>
          </div>

          <div className="text-xs font-mono text-slate-400 tabular-nums">
            Sections Parsed: <span className="text-slate-200">{report.sectionCoverage}/10</span>
          </div>
        </div>

        {/* Title + Last Close + Verdict Anchor */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
                {meta.companyName}
              </h1>
              <span className="font-mono text-lg font-semibold text-sky-400">{meta.ticker}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3 text-sm">
              <span className="font-mono text-xl font-semibold text-slate-100 tabular-nums">
                {meta.lastCloseStr}
              </span>
              {meta.lastCloseDate && (
                <span className="text-xs text-slate-400">Last Close ({meta.lastCloseDate})</span>
              )}
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-xs text-slate-300">{tradePlan.setupStyle}</span>
            </div>
          </div>

          {/* Verdict Callout Box (Explicit Icon + Text Label, No Pills) */}
          <div className={`flex items-center gap-3.5 px-4 py-3 rounded-md border ${v.border} ${v.bg} shrink-0`}>
            <VerdictIcon className={`w-5 h-5 ${v.text} shrink-0`} />
            <div>
              <div className={`text-sm font-bold tracking-tight ${v.text}`}>{v.label}</div>
              <div className="text-xs font-mono text-slate-300 tabular-nums mt-0.5">
                R:R {tradePlan.riskRewardStr} · Size: {tradeCard.ticketSize}
              </div>
            </div>
          </div>
        </div>

        {/* Trade Ticket Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Action', value: tradeCard.ticketAction },
            { label: 'Entry Trigger', value: tradeCard.ticketEntry },
            { label: 'Hard Stop-Loss', value: tradeCard.ticketStop },
            { label: 'Target Price', value: tradeCard.ticketTarget },
            { label: 'Position Size', value: tradeCard.ticketSize },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-[#0B111E]/80 border border-slate-800/80 rounded-md px-3.5 py-2.5"
            >
              <div className="text-[11px] text-slate-400">{item.label}</div>
              <div className="mt-1 font-mono text-xs sm:text-sm font-semibold text-slate-100 tabular-nums leading-snug">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Why This Trade / Biggest Risk / Key Dates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
          <div className="bg-[#0B111E]/60 border border-slate-800/80 rounded-md p-4 space-y-1.5">
            <div className="text-xs font-semibold text-sky-300">Why This Trade</div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {tradeCard.whyThisTrade || 'See full trade rationale below.'}
            </p>
          </div>

          <div className="bg-[#0B111E]/60 border border-slate-800/80 rounded-md p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Biggest Risk</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {tradeCard.biggestRisk || 'See 90-day failure scenarios.'}
            </p>
          </div>

          <div className="bg-[#0B111E]/60 border border-slate-800/80 rounded-md p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Key Dates Ahead</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-mono tabular-nums">
              {tradeCard.keyDatesAhead || meta.nextEarnings}
            </p>
          </div>
        </div>

        {/* Elevator Pitch */}
        {tradeCard.elevatorPitch && (
          <div className="pt-3 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 mb-1">Elevator Pitch</div>
            <p className="text-sm text-slate-200 italic leading-relaxed">
              &ldquo;{tradeCard.elevatorPitch}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Snapshot KPI Strip + Company Description */}
      <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <div className="text-[11px] text-slate-400">Market Cap</div>
            <div className="mt-1 font-mono text-sm font-semibold text-slate-100 tabular-nums">
              {meta.marketCap}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Enterprise Value</div>
            <div className="mt-1 font-mono text-sm font-semibold text-slate-100 tabular-nums">
              {meta.enterpriseValue}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>Next Earnings</span>
              {meta.nextEarningsDte && (
                <span className="font-mono font-semibold text-sky-300 tabular-nums">
                  {meta.nextEarningsDte}
                </span>
              )}
            </div>
            <div className="mt-1 font-mono text-xs font-semibold text-amber-300 tabular-nums leading-snug">
              {meta.nextEarnings}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">3M Avg Volume</div>
            <div className="mt-1 font-mono text-xs font-semibold text-slate-200 tabular-nums leading-snug">
              {meta.avgVolume}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Beta (vs. S&amp;P 500)</div>
            <div className="mt-1 font-mono text-sm font-semibold text-slate-200 tabular-nums">
              {meta.beta}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">14-Day ATR Swing</div>
            <div className="mt-1 font-mono text-sm font-semibold text-rose-400 tabular-nums flex items-center gap-1">
              <span>{meta.atrDollarStr} ({meta.atrPercentStr})</span>
              {meta.atrPercentNum !== null && meta.atrPercentNum >= 6 && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
            </div>
          </div>
        </div>

        {meta.whatTheyDo && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-baseline gap-2 text-xs leading-relaxed">
            <span className="font-semibold text-slate-300 shrink-0">Business Summary:</span>
            <span className="text-slate-300">{meta.whatTheyDo}</span>
          </div>
        )}
      </div>
    </section>
  );
};
