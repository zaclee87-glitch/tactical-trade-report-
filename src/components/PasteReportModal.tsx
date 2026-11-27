import React, { useMemo, useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { ParsedTradeReport } from '../types/report';
import { parseTradeReport } from '../utils/parseReport';

interface PasteReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyReport: (report: ParsedTradeReport, overwriteExisting: boolean) => void;
  existingTickers: string[];
}

export const PasteReportModal: React.FC<PasteReportModalProps> = ({
  isOpen,
  onClose,
  onApplyReport,
  existingTickers,
}) => {
  const [draftMarkdown, setDraftMarkdown] = useState('');
  const [overwriteIfMatch, setOverwriteIfMatch] = useState(true);
  const [fileError, setFileError] = useState('');

  const preview = useMemo(() => {
    if (!draftMarkdown.trim()) return null;
    try {
      return parseTradeReport(draftMarkdown);
    } catch {
      return null;
    }
  }, [draftMarkdown]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFileError('File exceeds 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      setDraftMarkdown(content);
    };
    reader.onerror = () => setFileError('Could not read file.');
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview || !draftMarkdown.trim()) return;
    onApplyReport(preview, overwriteIfMatch);
    setDraftMarkdown('');
    onClose();
  };

  const tickerExists = preview ? existingTickers.includes(preview.meta.ticker) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Paste Tactical Trade Report"
    >
      <div className="w-full max-w-2xl bg-[#0F172A] border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Paste &amp; Visualize Trade Report
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste the markdown output from your Tactical Trade Report prompt (e.g., META, NVDA, ICHR)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#131C2E] border border-slate-700 hover:border-slate-500 rounded-md cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Upload .md or .txt file</span>
              <input
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            {draftMarkdown && (
              <button
                type="button"
                onClick={() => setDraftMarkdown('')}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Clear input
              </button>
            )}
          </div>

          {fileError && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          <textarea
            value={draftMarkdown}
            onChange={(e) => setDraftMarkdown(e.target.value)}
            placeholder={`Paste full markdown report here...\n\nExample header:\n# Tactical Stock Trade Report: Meta Platforms, Inc. (META)\n**Horizon:** 2–3 Months | **Report Date:** ... | **Last Close:** $...`}
            className="flex-1 w-full bg-[#0B111E] border border-slate-800 focus:border-sky-500/60 focus:outline-none rounded-md p-4 font-mono text-xs text-slate-200 placeholder:text-slate-600 resize-none leading-relaxed"
          />

          {/* Live Parse Detection Preview */}
          {preview ? (
            <div className="bg-[#131C2E] border border-slate-800 rounded-md p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Report Structure Detected</span>
                </div>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {preview.sectionCoverage}/10 sections matched
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div>
                  <div className="text-slate-400 text-[11px]">Ticker</div>
                  <div className="font-mono font-semibold text-sky-300 mt-0.5">{preview.meta.ticker}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Company</div>
                  <div className="font-medium text-slate-100 mt-0.5 truncate">{preview.meta.companyName}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Last Close</div>
                  <div className="font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                    {preview.meta.lastCloseStr}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Verdict</div>
                  <div className="font-mono font-semibold text-slate-100 mt-0.5">{preview.tradePlan.verdict}</div>
                </div>
              </div>

              {tickerExists && (
                <label className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteIfMatch}
                    onChange={(e) => setOverwriteIfMatch(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500"
                  />
                  <span>Replace existing saved {preview.meta.ticker} report in library</span>
                </label>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 px-1">
              Paste a generated report above to preview detected ticker, verdict, tables, and price targets.
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-transparent border border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!preview || !draftMarkdown.trim()}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
            >
              Visualize Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
