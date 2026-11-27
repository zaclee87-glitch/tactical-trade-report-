import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ParsedTradeReport, PeerRow } from '../../types/report';

interface PeerComparisonChartProps {
  report: ParsedTradeReport;
}

type PeerMetricKey =
  | 'evEbitdaNum'
  | 'peFwdNum'
  | 'evSalesNum'
  | 'salesGrowthNum'
  | 'epsGrowthNum'
  | 'ebitdaMarginNum'
  | 'grossMarginNum';

const METRIC_OPTIONS: Array<{
  key: PeerMetricKey;
  label: string;
  unit: string;
  lowerIsCheaper?: boolean;
}> = [
  { key: 'evEbitdaNum', label: 'EV / EBITDA', unit: 'x', lowerIsCheaper: true },
  { key: 'peFwdNum', label: 'P/E (Fwd)', unit: 'x', lowerIsCheaper: true },
  { key: 'evSalesNum', label: 'EV / Sales', unit: 'x', lowerIsCheaper: true },
  { key: 'salesGrowthNum', label: 'Sales Growth', unit: '%' },
  { key: 'epsGrowthNum', label: 'EPS Growth', unit: '%' },
  { key: 'ebitdaMarginNum', label: 'EBITDA Margin', unit: '%' },
  { key: 'grossMarginNum', label: 'Gross Margin', unit: '%' },
];

export const PeerComparisonChart: React.FC<PeerComparisonChartProps> = ({ report }) => {
  const [activeMetric, setActiveMetric] = useState<PeerMetricKey>('peFwdNum');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [sortCol, setSortCol] = useState<keyof PeerRow>('marketCapNum');

  const { peers } = report.valuation;
  const currentMeta = METRIC_OPTIONS.find((m) => m.key === activeMetric)!;

  const medianRow = peers.find((p) => /median/i.test(p.ticker));
  const companyRows = peers.filter((p) => !/median/i.test(p.ticker));

  const chartRows = companyRows
    .map((row) => ({
      row,
      val: row[activeMetric],
    }))
    .filter((item): item is { row: PeerRow; val: number } => item.val !== null);

  const medianVal = medianRow ? medianRow[activeMetric] : null;
  const maxChartVal = Math.max(
    1,
    ...chartRows.map((c) => Math.abs(c.val)),
    medianVal !== null ? Math.abs(medianVal) : 0
  );

  const sortedTableRows = [...companyRows].sort((a, b) => {
    const av = (a[sortCol as keyof PeerRow] as number | null) ?? -Infinity;
    const bv = (b[sortCol as keyof PeerRow] as number | null) ?? -Infinity;
    return sortAsc ? av - bv : bv - av;
  });

  const handleSort = (col: keyof PeerRow) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Valuation &amp; Peer Comparison
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {report.meta.ticker} relative to closest public peers and Peer Median
          </p>
        </div>

        {/* Segmented Metric Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B111E] border border-slate-800 rounded-md">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setActiveMetric(opt.key)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeMetric === opt.key
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Bar Comparison SVG */}
      {chartRows.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded">
          No peer comparison table found for {currentMeta.label}.
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Metric: <strong className="text-slate-200">{currentMeta.label}</strong>
              {currentMeta.lowerIsCheaper ? ' (lower multiple = cheaper)' : ' (higher = stronger)'}
            </span>
            {medianVal !== null && (
              <span className="font-mono tabular-nums text-amber-400">
                Peer Median: {medianVal}
                {currentMeta.unit}
              </span>
            )}
          </div>

          <div className="relative space-y-2 pt-1">
            {chartRows.map(({ row, val }) => {
              const widthPct = Math.min(100, Math.max(3, (Math.abs(val) / maxChartVal) * 100));
              const medianPct =
                medianVal !== null ? Math.min(100, (Math.abs(medianVal) / maxChartVal) * 100) : null;

              return (
                <div key={row.ticker} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-between text-xs">
                    <span
                      className={`font-mono font-semibold ${
                        row.isTarget ? 'text-sky-300' : 'text-slate-300'
                      }`}
                    >
                      {row.ticker}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                      {row.marketCapStr}
                    </span>
                  </div>

                  <div className="col-span-6 sm:col-span-8 relative h-6 bg-[#0B111E] border border-slate-800/80 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        row.isTarget ? 'bg-sky-500/80' : 'bg-slate-600/70'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                    {medianPct !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-400/90"
                        style={{ left: `${medianPct}%` }}
                        title={`Peer Median: ${medianVal}${currentMeta.unit}`}
                      />
                    )}
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-right font-mono text-xs tabular-nums">
                    <span className={row.isTarget ? 'text-sky-300 font-semibold' : 'text-slate-200'}>
                      {val}
                      {currentMeta.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Peer Matrix Table */}
      {peers.length > 0 && (
        <div className="pt-4 border-t border-slate-800/80 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-medium">Ticker</th>
                {[
                  { label: 'Mkt Cap', key: 'marketCapNum' as keyof PeerRow },
                  { label: 'EV/EBITDA', key: 'evEbitdaNum' as keyof PeerRow },
                  { label: 'P/E (Fwd)', key: 'peFwdNum' as keyof PeerRow },
                  { label: 'EV/Sales', key: 'evSalesNum' as keyof PeerRow },
                  { label: 'Sales Gr.', key: 'salesGrowthNum' as keyof PeerRow },
                  { label: 'EPS Gr.', key: 'epsGrowthNum' as keyof PeerRow },
                  { label: 'EBITDA %', key: 'ebitdaMarginNum' as keyof PeerRow },
                  { label: 'Gross %', key: 'grossMarginNum' as keyof PeerRow },
                ].map((col) => (
                  <th key={col.key} className="py-2 px-2 font-medium text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-200 cursor-pointer"
                    >
                      <span>{col.label}</span>
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedTableRows.map((p) => (
                <tr
                  key={p.ticker}
                  className={p.isTarget ? 'bg-sky-500/10' : 'hover:bg-slate-800/30 transition-colors'}
                >
                  <td className={`py-2.5 pr-3 font-mono font-semibold ${p.isTarget ? 'text-sky-300' : 'text-slate-200'}`}>
                    {p.ticker}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{p.marketCapStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{p.evEbitdaStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">{p.peFwdStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{p.evSalesStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{p.salesGrowthStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{p.epsGrowthStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{p.ebitdaMarginStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">{p.grossMarginStr}</td>
                </tr>
              ))}
              {medianRow && (
                <tr className="bg-[#0B111E]/80 border-t border-slate-700 font-semibold">
                  <td className="py-2.5 pr-3 text-amber-400 whitespace-nowrap">{medianRow.ticker}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.marketCapStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.evEbitdaStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.peFwdStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.evSalesStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.salesGrowthStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.epsGrowthStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.ebitdaMarginStr}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-300 whitespace-nowrap">{medianRow.grossMarginStr}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
