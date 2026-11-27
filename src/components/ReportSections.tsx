import React from 'react';
import { ParsedTradeReport } from '../types/report';
import { MarkdownText } from './MarkdownText';

interface SectionProps {
  report: ParsedTradeReport;
}

export const MacroSection: React.FC<SectionProps> = ({ report }) => {
  const { macro } = report;

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Macro Backdrop &amp; Sector Standing
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Economic baseline and institutional money flow for {macro.sectorIndustry}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-400">
            Flow: <strong className="text-slate-100">{macro.institutionalFlow}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400">
            Cycle: <strong className="text-slate-100">{macro.cycleStage}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'U.S. Real GDP', body: macro.gdp },
          { title: 'Inflation (CPI & PCE)', body: macro.inflation },
          { title: 'Treasury Yields', body: macro.yields },
          { title: 'High Yield OAS Spreads', body: macro.creditSpreads },
        ].map((item) => (
          <div key={item.title} className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
            <div className="text-xs font-semibold text-sky-300">{item.title}</div>
            <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>

      {macro.plainEnglishTakeaway && (
        <div className="pt-3 border-t border-slate-800/80 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <span className="font-semibold text-slate-100">Macro Takeaway: </span>
          {macro.plainEnglishTakeaway}
        </div>
      )}
    </div>
  );
};

export const ValuationBenchmarkSection: React.FC<SectionProps> = ({ report }) => {
  const { valuation } = report;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-3">
        <h3 className="text-base font-semibold text-slate-100">
          Price vs. Its Own 5-Year Average
        </h3>
        <div className="space-y-2.5 text-xs leading-relaxed">
          <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded p-3">
            <span className="font-semibold text-slate-200">Forward EV/Sales: </span>
            <span className="text-slate-300">{valuation.fiveYearForwardEvSales}</span>
          </div>
          <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded p-3">
            <span className="font-semibold text-slate-200">Forward P/E: </span>
            <span className="text-slate-300">{valuation.fiveYearForwardPe}</span>
          </div>
          {valuation.fiveYearTakeaway && (
            <p className="text-slate-300 pt-1">{valuation.fiveYearTakeaway}</p>
          )}
        </div>
      </div>

      <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-100">
            Stock vs. Sector ETF ({valuation.sectorEtf})
          </h3>
          <span
            className={`font-mono text-xs font-semibold ${
              /outperform/i.test(valuation.etfCall)
                ? 'text-emerald-400'
                : /underperform/i.test(valuation.etfCall)
                  ? 'text-rose-400'
                  : 'text-amber-400'
            }`}
          >
            2–3M Call: {valuation.etfCall}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {valuation.etfComparison || 'No sector ETF comparison provided.'}
        </p>
      </div>
    </div>
  );
};

export const BusinessHealthSection: React.FC<SectionProps> = ({ report }) => {
  const { businessHealth } = report;

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-100">
          Business Health: Growth, Cash, Debt &amp; Key Drivers
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Recent quarterly momentum, balance sheet resilience, and operating metrics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-2.5">
          <div className="text-xs font-semibold text-sky-300">Growth &amp; Profit Momentum</div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            {businessHealth.growthBullets.map((item, idx) => (
              <li key={idx}>
                <strong className="text-slate-100">{item.label}: </strong>
                <MarkdownText text={item.value} />
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-2.5">
          <div className="text-xs font-semibold text-emerald-400">Financial Cushion &amp; Dilution</div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            {businessHealth.cushionBullets.map((item, idx) => (
              <li key={idx}>
                <strong className="text-slate-100">{item.label}: </strong>
                <MarkdownText text={item.value} />
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-4 space-y-2.5">
          <div className="text-xs font-semibold text-amber-300">Core Drivers &amp; KPIs</div>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
            {businessHealth.driversBullets.map((item, idx) => (
              <li key={idx}>
                <strong className="text-slate-100">{item.label}: </strong>
                <MarkdownText text={item.value} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {businessHealth.nearTermShifts && (
        <div className="pt-3 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <strong className="text-slate-100">Active Business Shifts / Near-Term AI Impact: </strong>
          {businessHealth.nearTermShifts}
        </div>
      )}
    </div>
  );
};

export const NewsAndCatalystsSection: React.FC<SectionProps> = ({ report }) => {
  const { newsAndTone, catalystsAndRisks } = report;

  return (
    <div className="space-y-5">
      {/* Section 6: News & Tone */}
      <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-100">
            Recent News, Management Tone &amp; Analyst Pushback
          </h3>
          {newsAndTone.managementTone && (
            <span className="text-xs text-sky-300 font-medium">
              Tone: {newsAndTone.managementTone.split('—')[0]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">Last 30–60 Days Headlines</div>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              {newsAndTone.headlines.map((h, i) => (
                <li key={i} className="bg-[#0B111E]/70 border border-slate-800/80 rounded p-3">
                  <strong className="text-slate-100">{h.label}: </strong>
                  <MarkdownText text={h.value} />
                </li>
              ))}
            </ul>
            {newsAndTone.toughQuestions && (
              <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded p-3 text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-300">Tough Analyst Questions: </strong>
                {newsAndTone.toughQuestions}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">Transcript Quotes &amp; Tone Assessment</div>
            {newsAndTone.managementTone && (
              <p className="text-xs text-slate-300 leading-relaxed">{newsAndTone.managementTone}</p>
            )}
            <div className="space-y-2">
              {newsAndTone.quotes.map((q, i) => (
                <blockquote
                  key={i}
                  className="bg-[#0B111E]/70 border border-slate-800/80 rounded p-3 text-xs text-slate-200 italic leading-relaxed"
                >
                  {q}
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: Catalysts & Pre-Mortem */}
      <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Next 4–12 Weeks: Catalysts &amp; 90-Day Pre-Mortem
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Upcoming dated triggers balanced against realistic failure scenarios
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0B111E]/70 border border-emerald-900/40 rounded-md p-4 space-y-2.5">
            <div className="text-xs font-semibold text-emerald-400">Upcoming Upside Triggers</div>
            <ol className="space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
              {catalystsAndRisks.upsideTriggers.map((t, i) => (
                <li key={i}>
                  <MarkdownText text={t} />
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-[#0B111E]/70 border border-rose-900/40 rounded-md p-4 space-y-2.5">
            <div className="text-xs font-semibold text-rose-400">90-Day Failure Scenarios (&ldquo;Pre-Mortem&rdquo;)</div>
            <ol className="space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
              {catalystsAndRisks.failureScenarios.map((f, i) => (
                <li key={i}>
                  <MarkdownText text={f} />
                </li>
              ))}
            </ol>
          </div>
        </div>

        {catalystsAndRisks.economyImpact && (
          <div className="pt-3 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Economy Impact: </strong>
            {catalystsAndRisks.economyImpact}
          </div>
        )}
      </div>
    </div>
  );
};

export const ExecutionPlanSection: React.FC<SectionProps> = ({ report }) => {
  const { tradePlan, technicals } = report;

  return (
    <div className="bg-[#131C2E] border border-slate-800 rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Trade Game Plan &amp; Stock Execution Checklist
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Entry discipline, stop-loss math, earnings reaction profile, and macro sizing
          </p>
        </div>
        <span className="font-mono text-xs text-slate-300 tabular-nums">
          Sizing: {tradePlan.positionSize}
        </span>
      </div>

      {/* Entry / Stop Rationale Bullets */}
      {tradePlan.rationaleBullets.length > 0 && (
        <ul className="space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {tradePlan.rationaleBullets.map((b, i) => (
            <li key={i} className="bg-[#0B111E]/70 border border-slate-800/80 rounded p-3">
              <MarkdownText text={b} />
            </li>
          ))}
        </ul>
      )}

      {/* Checklist Table (9c) & Earnings Reaction (8b) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {tradePlan.checklist.length > 0 && (
          <div className="lg:col-span-8 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3 font-medium">Execution Step</th>
                  <th className="py-2 pl-3 font-medium">Action Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tradePlan.checklist.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-slate-200 whitespace-nowrap">{row.step}</td>
                    <td className="py-2.5 pl-3 text-slate-300">{row.actionPlan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={`${tradePlan.checklist.length > 0 ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-3`}>
          <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
            <div className="text-xs font-semibold text-sky-300">Typical Earnings-Day Swings</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {technicals.avgEarningsMove || 'N/A'}
            </p>
            {technicals.postEarningsDrift && (
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                {technicals.postEarningsDrift}
              </p>
            )}
          </div>

          <div className="bg-[#0B111E]/70 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
            <div className="text-xs font-semibold text-amber-300">Big-Picture Fit &amp; Size</div>
            <p className="text-xs text-slate-300 leading-relaxed">{tradePlan.macroFit}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
