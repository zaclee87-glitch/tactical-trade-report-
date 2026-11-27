import React, { useEffect, useMemo, useState } from 'react';
import {
  FilePlus2,
  Trash2,
  Code2,
  LayoutDashboard,
  RotateCcw,
  Copy,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { SAMPLE_ICHR_REPORT } from './data/sampleReport';
import { ParsedTradeReport, TradeVerdict } from './types/report';
import { parseTradeReport } from './utils/parseReport';
import { TradeCardHero } from './components/TradeCardHero';
import { PriceLadderChart } from './components/charts/PriceLadderChart';
import { PeerComparisonChart } from './components/charts/PeerComparisonChart';
import { ExpectationsCharts } from './components/charts/ExpectationsCharts';
import {
  OwnershipBreakdownCard,
  OptionsVolatilityGauge,
} from './components/charts/OwnershipAndOptionsCharts';
import {
  MacroSection,
  ValuationBenchmarkSection,
  BusinessHealthSection,
  NewsAndCatalystsSection,
  ExecutionPlanSection,
} from './components/ReportSections';
import { PasteReportModal } from './components/PasteReportModal';

type ViewTab = 'all' | 'trade' | 'valuation' | 'fundamentals' | 'execution';

const STORAGE_KEY = 'tactical_trade_reports_v1';
const ACTIVE_KEY = 'tactical_trade_active_id_v1';

const VIEW_TABS: Array<{ id: ViewTab; label: string }> = [
  { id: 'all', label: 'All Sections' },
  { id: 'trade', label: 'Trade & Chart' },
  { id: 'valuation', label: 'Valuation & Peers' },
  { id: 'fundamentals', label: 'Earnings & Health' },
  { id: 'execution', label: 'Catalysts & Plan' },
];

function verdictColorClass(verdict: TradeVerdict): string {
  if (verdict === 'LONG') return 'text-emerald-400';
  if (verdict === 'SHORT') return 'text-rose-400';
  if (verdict === 'DO NOT ENTER') return 'text-amber-400';
  return 'text-slate-400';
}

function loadInitialReports(): ParsedTradeReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Array<{ id: string; savedAt: string; rawMarkdown: string }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((entry) => {
          const rep = parseTradeReport(entry.rawMarkdown, entry.id);
          rep.savedAt = entry.savedAt;
          return rep;
        });
      }
    }
  } catch {
    // Fallback to sample
  }
  return [parseTradeReport(SAMPLE_ICHR_REPORT, 'ichr-sample')];
}

export default function App() {
  const [reports, setReports] = useState<ParsedTradeReport[]>(loadInitialReports);
  const [activeId, setActiveId] = useState<string>(() => {
    const savedActive = localStorage.getItem(ACTIVE_KEY);
    return savedActive || 'ichr-sample';
  });
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const activeReport = useMemo(() => {
    return reports.find((r) => r.id === activeId) || reports[0] || null;
  }, [reports, activeId]);

  useEffect(() => {
    try {
      const minimal = reports.map((r) => ({
        id: r.id,
        savedAt: r.savedAt,
        rawMarkdown: r.rawMarkdown,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // Ignore quota issues
    }
  }, [reports]);

  useEffect(() => {
    if (activeReport) {
      localStorage.setItem(ACTIVE_KEY, activeReport.id);
    }
  }, [activeReport]);

  const handleApplyReport = (newReport: ParsedTradeReport, overwriteExisting: boolean) => {
    setReports((prev) => {
      if (overwriteExisting) {
        const existingIdx = prev.findIndex(
          (r) => r.meta.ticker.toUpperCase() === newReport.meta.ticker.toUpperCase()
        );
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = { ...newReport, id: prev[existingIdx].id };
          setActiveId(prev[existingIdx].id);
          return updated;
        }
      }
      setActiveId(newReport.id);
      return [newReport, ...prev];
    });
    setShowRawMarkdown(false);
    setActiveTab('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReports((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      if (remaining.length === 0) {
        const sample = parseTradeReport(SAMPLE_ICHR_REPORT, 'ichr-sample');
        setActiveId(sample.id);
        return [sample];
      }
      if (activeId === id) {
        setActiveId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleRestoreSample = () => {
    const sample = parseTradeReport(SAMPLE_ICHR_REPORT, 'ichr-sample');
    handleApplyReport(sample, true);
  };

  const handleCopyRaw = async () => {
    if (!activeReport) return;
    try {
      await navigator.clipboard.writeText(activeReport.rawMarkdown);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const existingTickers = useMemo(() => reports.map((r) => r.meta.ticker), [reports]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] border-r border-slate-800">
      <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
        <span className="font-display text-sm font-bold tracking-tight text-slate-100">
          Trade Report Desk
        </span>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Saved Reports Library */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        <div className="space-y-2">
          <div className="px-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Saved Reports ({reports.length})</span>
            <button
              type="button"
              onClick={handleRestoreSample}
              title="Restore sample ICHR report"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Sample</span>
            </button>
          </div>

          <div className="space-y-1">
            {reports.map((rep) => {
              const isSelected = activeReport?.id === rep.id;
              return (
                <div
                  key={rep.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveId(rep.id);
                    setIsSidebarOpen(false);
                    setShowRawMarkdown(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveId(rep.id);
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#131C2E] border-sky-500/40 text-slate-100'
                      : 'bg-transparent border-transparent hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-100">
                        {rep.meta.ticker}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {rep.meta.lastCloseStr}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {rep.meta.companyName}
                    </div>
                    <div
                      className={`font-mono text-[10px] font-semibold mt-0.5 ${verdictColorClass(
                        rep.tradePlan.verdict
                      )}`}
                    >
                      {rep.tradePlan.verdict}
                    </div>
                  </div>

                  {reports.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteReport(rep.id, e)}
                      aria-label={`Remove ${rep.meta.ticker} report`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Focus Navigation */}
        <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
          <div className="px-2 text-[11px] font-medium text-slate-400">Analysis Views</div>
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setShowRawMarkdown(false);
                setIsSidebarOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab.id && !showRawMarkdown
                  ? 'bg-sky-500/15 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Swap Action */}
      <div className="p-3 border-t border-slate-800">
        <button
          type="button"
          onClick={() => {
            setIsPasteModalOpen(true);
            setIsSidebarOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors cursor-pointer"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>Swap / Paste New Report</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B111E] text-slate-100 flex">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="w-64 h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/60"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar (Strict 3-Zone / Breadcrumb + Primary CTA) */}
        <header className="sticky top-0 z-30 bg-[#0B111E]/95 backdrop-blur-sm border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded border border-slate-800 cursor-pointer"
              aria-label="Open report library"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-400 hidden sm:inline">Reports</span>
              <span className="text-slate-600 hidden sm:inline">/</span>
              <span className="font-mono font-bold text-sky-400">
                {activeReport?.meta.ticker || '—'}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-medium text-slate-200 truncate">
                {activeReport?.meta.companyName || 'No Report Loaded'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>Paste Report</span>
          </button>
        </header>

        {/* Workspace Filter Toolbar */}
        <div className="border-b border-slate-800/80 bg-[#0F172A]/50 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowRawMarkdown(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id && !showRawMarkdown
                    ? 'bg-[#131C2E] text-sky-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowRawMarkdown((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showRawMarkdown
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                  : 'bg-[#131C2E] text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {showRawMarkdown ? (
                <>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Visual Dashboard</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Raw Markdown</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1360px] w-full mx-auto space-y-6">
          {!activeReport ? (
            <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-12 text-center space-y-4">
              <h2 className="text-lg font-semibold text-slate-100">No Report Selected</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Paste a Tactical Stock Trade Report output (such as ICHR or META) to visualize price targets, peer multiples, and trade setup parameters.
              </p>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md cursor-pointer"
              >
                Paste First Report
              </button>
            </div>
          ) : showRawMarkdown ? (
            <div className="bg-[#131C2E] border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300">
                  {activeReport.meta.ticker} · Raw Pasted Markdown Source
                </span>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B111E] border border-slate-700 hover:border-slate-500 rounded cursor-pointer"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRaw ? 'Copied' : 'Copy Markdown'}</span>
                </button>
              </div>
              <pre className="p-5 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {activeReport.rawMarkdown}
              </pre>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hero 10-Second Trade Card & Snapshot always shown on All or Trade tab */}
              {(activeTab === 'all' || activeTab === 'trade') && (
                <>
                  <TradeCardHero report={activeReport} />
                  <PriceLadderChart report={activeReport} />
                </>
              )}

              {(activeTab === 'all' || activeTab === 'trade') && (
                <MacroSection report={activeReport} />
              )}

              {(activeTab === 'all' || activeTab === 'valuation') && (
                <>
                  <PeerComparisonChart report={activeReport} />
                  <ValuationBenchmarkSection report={activeReport} />
                  <OwnershipBreakdownCard report={activeReport} />
                </>
              )}

              {(activeTab === 'all' || activeTab === 'fundamentals') && (
                <>
                  <ExpectationsCharts report={activeReport} />
                  <BusinessHealthSection report={activeReport} />
                </>
              )}

              {(activeTab === 'all' || activeTab === 'execution') && (
                <>
                  <NewsAndCatalystsSection report={activeReport} />
                  <ExecutionPlanSection report={activeReport} />
                  <OptionsVolatilityGauge report={activeReport} />
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Paste & Swap Report Drawer */}
      <PasteReportModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onApplyReport={handleApplyReport}
        existingTickers={existingTickers}
      />
    </div>
  );
}
