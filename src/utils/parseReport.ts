import {
  ChecklistRow,
  EarningsSurpriseRow,
  EstimateRevisionRow,
  ForwardConsensusRow,
  NamedMetricItem,
  ParsedTradeReport,
  PeerRow,
  ScenarioTargetRow,
  TradeVerdict,
} from '../types/report';

function stripMd(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function stripSources(text: string): string {
  return text.replace(/\*?\(Sources?:[^)]+\)\*?/gi, '').replace(/\s+\./g, '.').trim();
}

export function extractFirstNumber(text: string): number | null {
  if (!text) return null;
  const cleaned = stripMd(text).replace(/,/g, '');
  if (/^n\/?a\b/i.test(cleaned.trim()) || cleaned.trim() === '—' || cleaned.trim() === '-') {
    return null;
  }
  // Ignore parenthetical year references like (FY27) or (FY26) when grabbing primary value if possible
  const withoutFy = cleaned.replace(/\(FY\d{2,4}E?\)/gi, '');
  const match = withoutFy.match(/([+-]?\$?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const raw = match[1].replace('$', '');
  const num = Number.parseFloat(raw);
  return Number.isFinite(num) ? num : null;
}

function extractNumberOrRangeMid(text: string): number | null {
  if (!text) return null;
  const cleaned = stripMd(text).replace(/,/g, '');
  if (/^n\/?a\b/i.test(cleaned.trim())) return null;
  const rangeMatch = cleaned.match(/([+-]?\$?\d+(?:\.\d+)?)\s*[–-]\s*([+-]?\$?\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    const a = Number.parseFloat(rangeMatch[1].replace('$', ''));
    const b = Number.parseFloat(rangeMatch[2].replace('$', ''));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Number(((a + b) / 2).toFixed(2));
    }
  }
  return extractFirstNumber(cleaned);
}

function extractMarketCapBillions(text: string): number | null {
  if (!text) return null;
  const cleaned = stripMd(text).replace(/,/g, '');
  const m = cleaned.match(/\$?(\d+(?:\.\d+)?)\s*([TBMtbm])?/);
  if (!m) return null;
  const val = Number.parseFloat(m[1]);
  if (!Number.isFinite(val)) return null;
  const unit = (m[2] || 'B').toUpperCase();
  if (unit === 'T') return Number((val * 1000).toFixed(2));
  if (unit === 'M') return Number((val / 1000).toFixed(3));
  return val;
}

function extractDollarPrices(text: string): number[] {
  const matches = stripMd(text).replace(/,/g, '').match(/\$\s*(\d+(?:\.\d+)?)/g);
  if (!matches) return [];
  return matches
    .map((m) => Number.parseFloat(m.replace('$', '').trim()))
    .filter((n) => Number.isFinite(n));
}

function parseSingleDateUtc(dateStr: string): number | null {
  const ts = Date.parse(dateStr);
  if (Number.isNaN(ts)) return null;
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function computeEarningsDte(nextEarningsStr: string, reportDateStr: string): string {
  if (!nextEarningsStr || /^n\/?a\b/i.test(nextEarningsStr.trim())) return '';

  // Match ranges like "February 8–9, 2027" or "Feb 8-9, 2027"
  const rangeMatch = nextEarningsStr.match(
    /\b([A-Za-z]{3,9})\s+(\d{1,2})\s*[–-]\s*(\d{1,2}),?\s+(\d{4})\b/
  );
  let targetStartUtc: number | null = null;
  let targetEndUtc: number | null = null;

  if (rangeMatch) {
    const [, month, d1, d2, year] = rangeMatch;
    targetStartUtc = parseSingleDateUtc(`${month} ${d1}, ${year}`);
    targetEndUtc = parseSingleDateUtc(`${month} ${d2}, ${year}`);
  } else {
    // Match single date like "February 8, 2027" or "Feb 8, 2027" or "2027-02-08"
    const singleMatch =
      nextEarningsStr.match(/\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/) ||
      nextEarningsStr.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (singleMatch) {
      targetStartUtc = parseSingleDateUtc(singleMatch[1]);
    }
  }

  if (targetStartUtc === null) return '';

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const reportUtc = reportDateStr ? parseSingleDateUtc(reportDateStr) : null;

  let refUtc = todayUtc;
  let suffix = 'DTE';
  if (targetStartUtc < todayUtc && reportUtc !== null && targetStartUtc >= reportUtc) {
    refUtc = reportUtc;
    suffix = 'DTE (at report)';
  }

  const dayMs = 86400000;
  const d1 = Math.round((targetStartUtc - refUtc) / dayMs);
  if (d1 < 0) return '';

  if (targetEndUtc !== null && targetEndUtc !== targetStartUtc) {
    const d2 = Math.round((targetEndUtc - refUtc) / dayMs);
    return `${d1}–${d2} ${suffix}`;
  }
  return `${d1} ${suffix}`;
}

function parseMarkdownTables(block: string): Array<{ headers: string[]; rows: string[][] }> {
  const lines = block.split(/\r?\n/);
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|/.test(lines[i + 1].trim())) {
      const parseRow = (rowLine: string) =>
        rowLine
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      const headers = parseRow(line);
      i += 2; // skip header & separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = parseRow(lines[i]);
        if (row.some((c) => c.length > 0)) {
          rows.push(row);
        }
        i++;
      }
      tables.push({ headers, rows });
    } else {
      i++;
    }
  }
  return tables;
}

function extractKeyValueBullets(block: string): NamedMetricItem[] {
  const items: NamedMetricItem[] = [];
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+\*\*([^*]+?):\*\*\s*(.+)$/) ||
              line.match(/^\s*[-*]\s+\*\*([^*]+?)\*\*:\s*(.+)$/) ||
              line.match(/^\s*\d+\.\s+\*\*([^*]+?):\*\*\s*(.+)$/);
    if (m) {
      items.push({
        label: stripMd(m[1]).replace(/:$/, '').trim(),
        value: m[2].trim(),
      });
    }
  }
  return items;
}

function extractLabeledValue(block: string, labelPattern: RegExp): string {
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(labelPattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

function splitSections(markdown: string): {
  preamble: string;
  sections: Map<string, string>;
  sectionHeadings: Map<string, string>;
  rawSections: Array<{ heading: string; body: string }>;
} {
  const lines = markdown.split(/\r?\n/);
  const preambleLines: string[] = [];
  const rawSections: Array<{ heading: string; body: string }> = [];
  const sections = new Map<string, string>();
  const sectionHeadings = new Map<string, string>();

  let currentKey = '';
  let currentHeading = '';
  let currentBody: string[] = [];

  const flush = () => {
    if (currentKey) {
      const bodyStr = currentBody.join('\n').trim();
      sections.set(currentKey, bodyStr);
      sectionHeadings.set(currentKey, currentHeading);
      rawSections.push({ heading: currentHeading, body: bodyStr });
    }
  };

  for (const line of lines) {
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const headingText = hMatch[2].trim();

      // Top-level report sections: Macro, 1..10, or 3a..9e
      const numSubMatch = headingText.match(/^(\d+[a-e]?)\.\s+/i);
      const isMacro = /macro backdrop/i.test(headingText);

      if (level <= 3 && (numSubMatch || isMacro)) {
        flush();
        currentKey = isMacro ? 'macro' : numSubMatch![1].toLowerCase();
        currentHeading = headingText;
        currentBody = [];
        continue;
      }

      if (level === 4 && numSubMatch) {
        // Keep subsection inside parent AND also index individually!
        currentBody.push(line);
        continue;
      }
    }

    if (!currentKey) {
      preambleLines.push(line);
    } else {
      currentBody.push(line);
    }
  }
  flush();

  // Also index #### subsections (3a, 3b, 3c, 4a, 4b, 4c, 4d, 8a, 8b, 8c, 9a..9e)
  for (const [, body] of sections.entries()) {
    const subLines = body.split(/\r?\n/);
    let subKey = '';
    let subHeading = '';
    let subBuf: string[] = [];
    for (const sl of subLines) {
      const sm = sl.match(/^#{3,4}\s+(\d+[a-e])\.\s+(.+)$/i);
      if (sm) {
        if (subKey) {
          sections.set(subKey, subBuf.join('\n').trim());
          sectionHeadings.set(subKey, subHeading);
        }
        subKey = sm[1].toLowerCase();
        subHeading = sm[2].trim();
        subBuf = [];
      } else if (subKey) {
        subBuf.push(sl);
      }
    }
    if (subKey) {
      sections.set(subKey, subBuf.join('\n').trim());
      sectionHeadings.set(subKey, subHeading);
    }
  }

  return {
    preamble: preambleLines.join('\n').trim(),
    sections,
    sectionHeadings,
    rawSections,
  };
}

function normalizeVerdict(text: string): TradeVerdict {
  const upper = stripMd(text).toUpperCase();
  if (upper.includes('DO NOT ENTER') || upper.includes('PASS')) return 'DO NOT ENTER';
  if (upper.includes('SHORT')) return 'SHORT';
  if (upper.includes('LONG')) return 'LONG';
  return 'UNKNOWN';
}

export function parseTradeReport(rawMarkdown: string, existingId?: string): ParsedTradeReport {
  const md = rawMarkdown.trim();
  const { preamble, sections, sectionHeadings, rawSections } = splitSections(md);

  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? stripMd(titleMatch[1]) : 'Tactical Stock Trade Report';

  const macroBlock = sections.get('macro') || '';
  const sec1 = sections.get('1') || '';
  const sec2 = sections.get('2') || '';
  const sec3 = sections.get('3') || '';
  const sec3a = sections.get('3a') || sec3;
  const sec3b = sections.get('3b') || '';
  const sec3c = sections.get('3c') || '';
  const sec4 = sections.get('4') || '';
  const sec4a = sections.get('4a') || sec4;
  const sec4b = sections.get('4b') || '';
  const sec4c = sections.get('4c') || '';
  const sec4d = sections.get('4d') || '';
  const sec5 = sections.get('5') || '';
  const sec6 = sections.get('6') || '';
  const sec7 = sections.get('7') || '';
  const sec8 = sections.get('8') || '';
  const sec8a = sections.get('8a') || sec8;
  const sec8b = sections.get('8b') || '';
  const sec8c = sections.get('8c') || sec8;
  const sec9 = sections.get('9') || '';
  const sec9a = sections.get('9a') || sec9;
  const sec9b = sections.get('9b') || sec9;
  const sec9c = sections.get('9c') || sec9;
  const sec9d = sections.get('9d') || sec9;
  const sec9e = sections.get('9e') || sec9;
  const sec10 = sections.get('10') || '';

  // Extract Ticker & Company Name from title, sec1, or sec10
  let ticker = '';
  let companyName = '';
  const titleTickerMatch = title.match(/:\s*(.+?)\s*\(([A-Z]{1,6}(?:\.[A-Z])?)\)/);
  if (titleTickerMatch) {
    companyName = titleTickerMatch[1].trim();
    ticker = titleTickerMatch[2].trim();
  }
  const sec10HeadLine = sec10.split(/\r?\n/).find((l) => l.includes('—') || l.includes('|')) || '';
  const sec10Match = stripMd(sec10HeadLine).match(/^([A-Z]{1,6}(?:\.[A-Z])?)\s*\(([^)]+)\)/);
  if (sec10Match) {
    if (!ticker) ticker = sec10Match[1].trim();
    if (!companyName) companyName = sec10Match[2].trim();
  }
  const basicsLine = extractLabeledValue(sec1, /\*\*Company Basics:\*\*\s*(.+)$/i);
  if (!ticker && basicsLine) {
    const bm = stripMd(basicsLine).match(/^(.+?)\s*\(([A-Z]{1,6})\)/);
    if (bm) {
      companyName = companyName || bm[1].trim();
      ticker = bm[2].trim();
    }
  }
  if (!ticker) {
    const anyTicker = md.match(/\(([A-Z]{2,5})\)/);
    ticker = anyTicker ? anyTicker[1] : 'STOCK';
  }
  if (!companyName) companyName = ticker;

  // Preamble metadata
  const horizonMatch = preamble.match(/\*\*Horizon:\*\*\s*([^|\n]+)/i);
  const reportDateMatch = preamble.match(/\*\*Report Date:\*\*\s*([^|\n]+)/i);
  const preambleCloseMatch = preamble.match(/\*\*Last Close:\*\*\s*([^\n]+)/i);

  // Section 1 fields
  const basicsClean = stripMd(basicsLine);
  const exchangeMatch = basicsClean.match(/Exchange:\s*([^|]+)/i);
  const sectorMatch = basicsClean.match(/Sector\/Industry:\s*([^|]+)/i);
  const mcapMatch = basicsClean.match(/Market Cap:\s*([^|]+)/i);
  const evMatch = basicsClean.match(/Enterprise Value[^:]*:\s*([^|]+)/i);
  const sec1CloseMatch = basicsClean.match(/Last Clos(?:e|ing Price):\s*([^|]+)/i);

  const lastCloseRaw = stripSources(
    stripMd(sec1CloseMatch?.[1] || preambleCloseMatch?.[1] || extractLabeledValue(sec8a, /\*\*Last Close[^:]*:\*\*\s*(.+)$/i) || '')
  );
  const lastCloseNum = extractFirstNumber(lastCloseRaw);
  const lastCloseDateMatch = lastCloseRaw.match(/(?:on\s+|\()([A-Za-z]+,?\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

  const reportDateParsed = reportDateMatch ? stripMd(reportDateMatch[1]).trim() : '';
  const nextEarnings = stripSources(stripMd(extractLabeledValue(sec1, /\*\*Next Earnings Date:\*\*\s*(.+)$/i)));
  const nextEarningsDte = computeEarningsDte(nextEarnings, reportDateParsed);
  const exDividend = stripSources(stripMd(extractLabeledValue(sec1, /\*\*Next Ex-Dividend Date:\*\*\s*(.+)$/i)));
  const avgVolume = stripSources(stripMd(extractLabeledValue(sec1, /\*\*3-Month Average Daily Volume:\*\*\s*(.+)$/i)));
  const beta = stripSources(stripMd(extractLabeledValue(sec1, /\*\*Beta[^:]*:\*\*\s*(.+)$/i)));
  const atrRaw = stripSources(stripMd(extractLabeledValue(sec1, /\*\*14-Day ATR[^:]*:\*\*\s*(.+)$/i)));
  const atrDollarMatch = atrRaw.match(/\$(\d+(?:\.\d+)?)/);
  const atrPctMatch = atrRaw.match(/~?(\d+(?:\.\d+)?)%/);
  const whatTheyDo = stripSources(stripMd(extractLabeledValue(sec1, /\*\*What They Do[^:]*:\*\*\s*(.+)$/i)));

  // Macro
  const gdp = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*U\.?S\.?\s*Real GDP[^:]*:\*\*\s*(.+)$/i)));
  const inflation = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*Inflation[^:]*:\*\*\s*(.+)$/i)));
  const yields = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*Treasury Yields[^:]*:\*\*\s*(.+)$/i)));
  const creditSpreads = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*High Yield Credit Spreads[^:]*:\*\*\s*(.+)$/i)));
  const macroTakeaway = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*Plain-English Takeaway:\*\*\s*(.+)$/i)));
  const macroSector = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*Sector\s*\/\s*Industry:\*\*\s*(.+)$/i)));
  const institutionalFlow = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*Institutional Flow:\*\*\s*(.+)$/i)));
  const cycleStage = stripSources(stripMd(extractLabeledValue(macroBlock, /\*\*Cycle Stage:\*\*\s*(.+)$/i)));

  // Section 2: Ownership & Short Interest
  const shortInterestStr = stripSources(stripMd(extractLabeledValue(sec2, /\*\*Bets Against the Stock[^:]*:\*\*\s*(.+)$/i)));
  const shortPctMatch = shortInterestStr.match(/(\d+(?:\.\d+)?)(?:%–\d+(?:\.\d+)?)?%\s*of/i) || shortInterestStr.match(/(\d+(?:\.\d+)?)%/);
  const dtcMatch = shortInterestStr.match(/(\d+(?:\.\d+)?)(?:–(\d+(?:\.\d+)?))?\s*Days to Cover/i);
  const ownershipLine = stripSources(stripMd(extractLabeledValue(sec2, /\*\*Big Money & Insider Ownership:\*\*\s*(.+)$/i)));
  const instMatch = ownershipLine.match(/Institutions\s*hold\s*(\d+(?:\.\d+)?)%/i) || ownershipLine.match(/(\d+(?:\.\d+)?)%\s*(?:owned by institutions|of shares)/i);
  const insiderMatch = ownershipLine.match(/insiders\s*own\s*(\d+(?:\.\d+)?)%/i) || ownershipLine.match(/(\d+(?:\.\d+)?)%\s*(?:owned by.*?insiders)/i);
  const insiderActivitySummary = stripSources(stripMd(extractLabeledValue(sec2, /\*\*Insider Buying\/Selling[^:]*:\*\*\s*(.+)$/i)));
  const scheduledSales = stripSources(stripMd(extractLabeledValue(sec2, /\*Scheduled[^:]*:\*\s*(.+)$/i)));
  const discretionarySales = stripSources(stripMd(extractLabeledValue(sec2, /\*Discretionary[^:]*:\*\s*(.+)$/i)));
  const crowdingTakeaway = stripSources(stripMd(extractLabeledValue(sec2, /\*\*Crowding Takeaway:\*\*\s*(.+)$/i)));

  // Section 3: Peers
  const sec3Tables = parseMarkdownTables(sec3a);
  const peers: PeerRow[] = [];
  if (sec3Tables.length > 0) {
    const t = sec3Tables[0];
    for (const row of t.rows) {
      if (row.length < 4) continue;
      const cellTicker = stripMd(row[0] || '');
      if (!cellTicker) continue;
      const isTarget =
        cellTicker.toUpperCase() === ticker.toUpperCase() ||
        cellTicker.toUpperCase().includes(ticker.toUpperCase());
      peers.push({
        ticker: cellTicker,
        isTarget,
        marketCapStr: stripMd(row[1] || 'N/A'),
        marketCapNum: extractMarketCapBillions(row[1] || ''),
        evEbitdaStr: stripMd(row[2] || 'N/A'),
        evEbitdaNum: extractFirstNumber(row[2] || ''),
        peFwdStr: stripMd(row[3] || 'N/A'),
        peFwdNum: extractFirstNumber(row[3] || ''),
        evSalesStr: stripMd(row[4] || 'N/A'),
        evSalesNum: extractFirstNumber(row[4] || ''),
        salesGrowthStr: stripMd(row[5] || 'N/A'),
        salesGrowthNum: extractFirstNumber(row[5] || ''),
        epsGrowthStr: stripMd(row[6] || 'N/A'),
        epsGrowthNum: extractFirstNumber(row[6] || ''),
        ebitdaMarginStr: stripMd(row[7] || 'N/A'),
        ebitdaMarginNum: extractFirstNumber(row[7] || ''),
        grossMarginStr: stripMd(row[8] || 'N/A'),
        grossMarginNum: extractFirstNumber(row[8] || ''),
      });
    }
  }

  const sec3bClean = stripSources(stripMd(sec3b)).replace(/\s+/g, ' ').trim();
  const labeledEvSales = stripSources(stripMd(extractLabeledValue(sec3b, /\*\*Forward EV\/Sales:\*\*\s*(.+)$/i)));
  const labeledPe = stripSources(stripMd(extractLabeledValue(sec3b, /\*\*Forward P\/E:\*\*\s*(.+)$/i)));
  const labeledTakeaway3b = stripSources(stripMd(extractLabeledValue(sec3b, /\*\*Takeaway:\*\*\s*(.+)$/i)));

  // Prose fallbacks for 3b (e.g. RBRK format without labeled bullets)
  const sentences3b = sec3bClean
    .split(/\.(?=\s+[A-Z]|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
  const evSentence = sentences3b.find((s) => /\bEV\/Sales\b/i.test(s)) || '';
  const peSentence = sentences3b.find((s) => /\bP\/E\b/i.test(s)) || '';

  let evFallback = '';
  let peFallback = '';
  if (evSentence && evSentence === peSentence) {
    const splitWhile = evSentence.split(/,\s*while\s+(?:its\s+)?/i);
    if (splitWhile.length >= 2) {
      evFallback = splitWhile[0].trim();
      peFallback = splitWhile.slice(1).join(', while ').trim();
    } else {
      evFallback = evSentence;
    }
  } else {
    evFallback = evSentence;
    peFallback = peSentence;
  }

  const remaining3b = sentences3b
    .filter((s) => s !== evSentence && s !== peSentence)
    .join('. ');

  const fiveYearForwardEvSales = labeledEvSales || evFallback;
  const fiveYearForwardPe = labeledPe || peFallback;
  const fiveYearTakeaway = labeledTakeaway3b || (remaining3b ? `${remaining3b}.` : sec3bClean);

  const sec3cHeading = stripMd(sectionHeadings.get('3c') || '');
  const sec3cClean = stripSources(stripMd(sec3c)).replace(/\s+/g, ' ').trim();
  const labeledSectorEtf = stripSources(stripMd(extractLabeledValue(sec3c, /\*\*Sector ETF:\*\*\s*(.+)$/i)));
  const etfFromHeading = sec3cHeading.match(/\(([A-Z]{2,5})\)/)?.[1];
  const etfFromBody =
    sec3cClean.match(/(?:Compared to\s+(?:the\s+)?|vs\.?\s+(?:the\s+)?)([A-Z][A-Za-z0-9&\s-]{2,60}?ETF\s*\([A-Z]{2,5}\))/i)?.[1] ||
    sec3cClean.match(/\(([A-Z]{2,5})\)/)?.[1];
  const sectorEtf = labeledSectorEtf || etfFromBody || etfFromHeading || '';

  const labeledEtfComparison = stripSources(stripMd(extractLabeledValue(sec3c, /\*\*Comparison & Call:\*\*\s*(.+)$/i)));
  const etfComparison = labeledEtfComparison || sec3cClean;

  const etfCallMatch = (sec3c.match(/\*\*2–3 Month Call[^:]*:\s*([^*\n]+)\*\*/i) ||
    sec3c.match(/2–3 Month Call[^:]*:\s*(Outperform|Underperform|Match)/i) ||
    sec3c.match(/\b(Outperform|Underperform|Match)\b/i));
  const etfCall = etfCallMatch ? stripMd(etfCallMatch[1]) : 'Neutral';

  // Section 4: Expectations
  const fiscalYearEndMatch = sec4a.match(/\*Fiscal Year-End Month:\*\s*([^\n]+)/i);
  const fiscalYearEnd = fiscalYearEndMatch ? stripSources(stripMd(fiscalYearEndMatch[1])) : '';

  const sec4aTables = parseMarkdownTables(sec4a);
  const forwardConsensus: ForwardConsensusRow[] = [];
  if (sec4aTables.length > 0) {
    for (const row of sec4aTables[0].rows) {
      forwardConsensus.push({
        metric: stripMd(row[0] || ''),
        currentFy: stripMd(row[1] || 'N/A'),
        nextFy: stripMd(row[2] || 'N/A'),
        twoYearsOut: stripMd(row[3] || 'N/A'),
      });
    }
  }

  const sec4bTables = parseMarkdownTables(sec4b);
  const estimateRevisions: EstimateRevisionRow[] = [];
  if (sec4bTables.length > 0) {
    for (const row of sec4bTables[0].rows) {
      const timeframe = stripMd(row[0] || '');
      if (/total/i.test(timeframe)) continue;
      estimateRevisions.push({
        timeframe,
        estimateStr: stripMd(row[1] || 'N/A'),
        estimateNum: extractNumberOrRangeMid(row[1] || ''),
        dollarChangeStr: stripMd(row[2] || '—'),
        pctChangeStr: stripMd(row[3] || '—'),
        pctChangeNum: extractFirstNumber(row[3] || ''),
      });
    }
  }
  const revisionBreadth = stripSources(
    stripMd(extractLabeledValue(sec4b, /\*\*Analyst Revision Breadth:\*\*\s*(.+)$/i))
  );

  const sec4cTables = parseMarkdownTables(sec4c);
  const earningsSurprises: EarningsSurpriseRow[] = [];
  if (sec4cTables.length > 0) {
    for (const row of sec4cTables[0].rows) {
      const qRaw = stripMd(row[0] || '');
      const qShort = qRaw.match(/(Q\d\s+\d{4})/)?.[1] || qRaw;
      const resultText = stripMd(row[5] || '');
      earningsSurprises.push({
        quarter: qShort,
        actualStr: stripMd(row[1] || 'N/A'),
        actualNum: extractFirstNumber(row[1] || ''),
        expectedStr: stripMd(row[2] || 'N/A'),
        expectedNum: extractFirstNumber(row[2] || ''),
        diffDollarStr: stripMd(row[3] || 'N/A'),
        diffPctStr: stripMd(row[4] || 'N/A'),
        diffPctNum: extractFirstNumber(row[4] || ''),
        result: /beat/i.test(resultText) ? 'Beat' : /miss/i.test(resultText) ? 'Miss' : resultText,
      });
    }
  }
  const expectationsTakeaway = stripSources(
    stripMd(sec4d.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).join(' '))
  );

  // Section 5: Business Health
  const sec5Items = extractKeyValueBullets(sec5);
  const growthLabels = ['Revenue', 'Gross Margin', 'Operating Margin', 'Free Cash Flow'];
  const cushionLabels = ['Cash vs. Debt', 'Cash vs. Total Debt', 'Net Debt', 'Stock-Based Pay'];
  const growthBullets = sec5Items.filter((i) => growthLabels.some((g) => i.label.toLowerCase().includes(g.toLowerCase())));
  const cushionBullets = sec5Items.filter((i) => cushionLabels.some((c) => i.label.toLowerCase().includes(c.toLowerCase())));
  const driversBullets = sec5Items.filter(
    (i) =>
      !growthBullets.includes(i) &&
      !cushionBullets.includes(i) &&
      !i.label.toLowerCase().includes('active business') &&
      !i.label.toLowerCase().includes('growth & profit') &&
      !i.label.toLowerCase().includes('financial cushion') &&
      !i.label.toLowerCase().includes('core business')
  );
  const nearTermShifts = stripSources(
    stripMd(extractLabeledValue(sec5, /\*\*Active Business Shifts[^:]*:\*\*\s*(.+)$/i))
  );

  // Section 6: News & Tone
  const sec6Items = extractKeyValueBullets(sec6);
  const headlines = sec6Items.filter(
    (i) =>
      !i.label.toLowerCase().includes('last 30') &&
      !i.label.toLowerCase().includes('earnings call') &&
      !i.label.toLowerCase().includes('tough analyst') &&
      !i.label.toLowerCase().includes('tone') &&
      !i.label.toLowerCase().includes('exact quotes')
  );
  const toughQuestions = stripSources(
    stripMd(extractLabeledValue(sec6, /\*\*Tough Analyst Questions:\*\*\s*(.+)$/i))
  );
  const managementTone = stripSources(
    stripMd(extractLabeledValue(sec6, /\*\*Tone:\*\*\s*(.+)$/i))
  );
  const quotes: string[] = [];
  for (const line of sec6.split(/\r?\n/)) {
    if (line.trim().startsWith('-') && line.includes('*"')) {
      quotes.push(stripSources(stripMd(line.replace(/^\s*-\s*/, ''))));
    }
  }

  // Section 7: Catalysts & Risks
  const upsideTriggers: string[] = [];
  const failureScenarios: string[] = [];
  let currentCatGroup: 'none' | 'upside' | 'failure' = 'none';
  for (const line of sec7.split(/\r?\n/)) {
    if (/upcoming upside triggers/i.test(line)) {
      currentCatGroup = 'upside';
      continue;
    }
    if (/failure scenarios|pre-mortem/i.test(line)) {
      currentCatGroup = 'failure';
      continue;
    }
    if (/economy impact/i.test(line)) {
      currentCatGroup = 'none';
      continue;
    }
    const numMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numMatch) {
      if (currentCatGroup === 'upside') upsideTriggers.push(numMatch[1].trim());
      if (currentCatGroup === 'failure') failureScenarios.push(numMatch[1].trim());
    }
  }
  const economyImpact = stripSources(stripMd(extractLabeledValue(sec7, /\*\*Economy Impact:\*\*\s*(.+)$/i)));

  // Section 8: Technicals & Targets
  const sma20Str = stripMd(extractLabeledValue(sec8a, /\*\*20-Day SMA[^:]*:\*\*\s*(.+)$/i));
  const sma50Str = stripMd(extractLabeledValue(sec8a, /\*\*50-Day SMA[^:]*:\*\*\s*(.+)$/i));
  const sma200Str = stripMd(extractLabeledValue(sec8a, /\*\*200-Day SMA[^:]*:\*\*\s*(.+)$/i));
  const rsi14Str = stripMd(extractLabeledValue(sec8a, /\*\*14-Day RSI[^:]*:\*\*\s*(.+)$/i));
  const supportStr = stripMd(extractLabeledValue(sec8a, /\*\*Key Support[^:]*:\*\*\s*(.+)$/i));
  const resistanceStr = stripMd(extractLabeledValue(sec8a, /\*\*Key Resistance[^:]*:\*\*\s*(.+)$/i));
  const chartVerdict = stripSources(stripMd(extractLabeledValue(sec8a, /\*\*Chart Verdict:\*\*\s*(.+)$/i)));

  const avgEarningsMove =
    stripSources(stripMd(extractLabeledValue(sec8b, /\*\*Average Earnings Move[^:]*:\*\*\s*(.+)$/i))) ||
    stripSources(stripMd(sec8b)).replace(/\s+/g, ' ').trim();
  const postEarningsDrift = stripSources(stripMd(extractLabeledValue(sec8b, /\*\*Post-Earnings Drift:\*\*\s*(.+)$/i)));

  const sec8cTables = parseMarkdownTables(sec8c);
  const scenarios: ScenarioTargetRow[] = [];
  if (sec8cTables.length > 0) {
    for (const row of sec8cTables[0].rows) {
      const scenRaw = stripMd(row[0] || '');
      const scenName = /bear/i.test(scenRaw)
        ? 'Bear'
        : /bull/i.test(scenRaw)
          ? 'Bull'
          : /base/i.test(scenRaw)
            ? 'Base'
            : scenRaw;
      scenarios.push({
        scenario: scenName,
        driver: stripMd(row[1] || ''),
        salesGrowthStr: stripMd(row[2] || 'N/A'),
        epsStr: stripMd(row[3] || 'N/A'),
        multipleStr: stripMd(row[4] || 'N/A'),
        impliedCapStr: stripMd(row[5] || 'N/A'),
        targetPriceStr: stripMd(row[6] || 'N/A'),
        targetPriceNum: extractFirstNumber(row[6] || ''),
        pctMoveStr: stripMd(row[7] || 'N/A'),
        pctMoveNum: extractFirstNumber(row[7] || ''),
        whatMustHappen: stripMd(row[8] || ''),
      });
    }
  }

  // Section 9: Trade Game Plan
  const verdictLine = extractLabeledValue(sec9a, /\*\*Verdict:\*\*\s*(.+)$/i) || sec10HeadLine;
  const verdict = normalizeVerdict(verdictLine);
  const verdictLabel = stripMd(verdictLine) || (verdict === 'UNKNOWN' ? 'Review Report' : verdict);
  const setupStyle = stripMd(extractLabeledValue(sec9a, /\*\*Setup Style:\*\*\s*(.+)$/i));

  const sec9bBullets = sec9b
    .split(/\r?\n/)
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim());

  const sec9cTables = parseMarkdownTables(sec9c);
  const checklist: ChecklistRow[] = [];
  if (sec9cTables.length > 0) {
    for (const row of sec9cTables[0].rows) {
      checklist.push({
        step: stripMd(row[0] || ''),
        actionPlan: stripMd(row[1] || ''),
      });
    }
  }

  const optionsLiquidity = stripSources(stripMd(extractLabeledValue(sec9d, /\*\*Monthly Options Liquidity:\*\*\s*(.+)$/i)));
  const optionsPricing = stripSources(stripMd(extractLabeledValue(sec9d, /\*\*Option Pricing[^:]*:\*\*\s*(.+)$/i)));
  const vehicleVerdict = stripSources(stripMd(extractLabeledValue(sec9d, /\*\*Vehicle Verdict:\*\*\s*(.+)$/i)));

  const ivMatch = optionsPricing.match(/Implied Volatility \(IV\)[^0-9]*(\d+(?:\.\d+)?)%(?:–(\d+(?:\.\d+)?)%)?/i);
  const hvMatch = optionsPricing.match(/Historical Volatility \(HV\)[^0-9]*(\d+(?:\.\d+)?)%(?:–(\d+(?:\.\d+)?)%)?/i);
  const ivRankMatch = optionsPricing.match(/IV Rank[^0-9]*~?(\d+(?:\.\d+)?)%/i);
  const iv52wMatch = optionsPricing.match(/(\d+(?:\.\d+)?)%\s*[–-]\s*(\d+(?:\.\d+)?)%\s*52-week IV range/i);

  const optionsAvgVolMatch = optionsLiquidity.match(/averages?\s*([\d,]+)\s*contracts/i);
  const optionsLowVolMatch = optionsLiquidity.match(/(?:dropping to|just)\s*([\d,]+)\s*contracts/i);
  const optionsOiMatch = optionsLiquidity.match(/([\d,]+)(?:\s*[–-]\s*([\d,]+))?\s*(?:total\s*)?open interest/i);
  const putCallMatch = optionsLiquidity.match(/Put\/Call[^0-9]*(\d+(?:\.\d+)?)/i);

  const liqLower = optionsLiquidity.toLowerCase();
  const optionsLiquidityTier: 'Tight/Liquid' | 'Average' | 'Thin/Wide Spreads' | 'Unknown' =
    /thin|wide|slippage|poor/i.test(liqLower)
      ? 'Thin/Wide Spreads'
      : /tight|liquid/i.test(liqLower) && !/not\s+liquid/i.test(liqLower)
        ? 'Tight/Liquid'
        : /average|moderate/i.test(liqLower)
          ? 'Average'
          : 'Unknown';

  const macroFit =
    stripSources(stripMd(extractLabeledValue(sec9e, /\*\*Macro Fit:\*\*\s*(.+)$/i))) ||
    stripSources(stripMd(sec9e)).replace(/\s+/g, ' ').trim();
  const positionSize = stripSources(stripMd(extractLabeledValue(sec9e, /\*\*Position Size:\*\*\s*(.+)$/i)));

  // Section 10: Trade Card
  const whyThisTrade = stripMd(extractLabeledValue(sec10, /\*\*Why This Trade:\*\*\s*(.+)$/i));
  const tradeTicket = stripMd(extractLabeledValue(sec10, /\*\*Trade Ticket:\*\*\s*(.+)$/i));
  const keyDatesAhead = stripMd(extractLabeledValue(sec10, /\*\*Key Dates Ahead:\*\*\s*(.+)$/i));
  const biggestRisk = stripMd(extractLabeledValue(sec10, /\*\*Biggest Risk:\*\*\s*(.+)$/i));
  const elevatorPitch = stripMd(extractLabeledValue(sec10, /\*\*Elevator Pitch:\*\*\s*(.+)$/i)).replace(/^"|"$/g, '');

  const rrFromCard = stripMd(sec10HeadLine).match(/R:R\s*([^|]+)/i)?.[1]?.trim() || 'N/A';
  const ticketAction = tradeTicket.match(/Action\s+([^|]+)/i)?.[1]?.trim() || verdict;
  const ticketEntry = tradeTicket.match(/Entry\s+([^|]+)/i)?.[1]?.trim() || 'N/A';
  const ticketStop = tradeTicket.match(/Stop\s+([^|]+)/i)?.[1]?.trim() || 'N/A';
  const ticketTarget = tradeTicket.match(/Target\s+([^|]+)/i)?.[1]?.trim() || 'N/A';
  const ticketSize = tradeTicket.match(/Size\s+([^|.]+)/i)?.[1]?.trim() || positionSize || 'N/A';

  // Extract Ideal Entry price / zone from Section 9b ("When to Enter" or "Re-Entry Trigger") & Section 10 Entry
  const whenToEnterRaw = stripMd(
    extractLabeledValue(sec9b, /\*\*(?:When to Enter|Re-Entry Trigger[^:]*):\*\*\s*(.+)$/i) || ticketEntry
  );
  const idealEntries: Array<{
    label: string;
    low: number;
    high: number;
    midpoint: number;
    display: string;
  }> = [];

  // Match explicit dollar ranges like $29.00–$30.50 or single prices like $29.00
  const entryRangeRegex = /\$(\d+(?:\.\d+)?)\s*[–-]\s*\$?(\d+(?:\.\d+)?)/g;
  let rm: RegExpExecArray | null;
  while ((rm = entryRangeRegex.exec(whenToEnterRaw)) !== null) {
    const low = Number.parseFloat(rm[1]);
    const high = Number.parseFloat(rm[2]);
    if (Number.isFinite(low) && Number.isFinite(high)) {
      const ctx = whenToEnterRaw.slice(Math.max(0, rm.index - 40), rm.index).toLowerCase();
      const label = /washout|capitulation|deep|52-week/i.test(ctx)
        ? 'Washout Entry Zone'
        : /reclaim|breakout|trigger/i.test(ctx)
          ? 'Ideal Entry (Reclaim)'
          : idealEntries.length === 0
            ? 'Ideal Entry Zone'
            : 'Alt. Entry Zone';
      idealEntries.push({
        label,
        low: Math.min(low, high),
        high: Math.max(low, high),
        midpoint: Number(((low + high) / 2).toFixed(2)),
        display: `$${Math.min(low, high).toFixed(2)}–$${Math.max(low, high).toFixed(2)}`,
      });
    }
  }

  // Fallback to single ideal entry price if no range matched (e.g., "Buy on dip to 20-day average ($542.00)")
  if (idealEntries.length === 0) {
    const singleMatch = whenToEnterRaw.match(/\$(\d+(?:\.\d+)?)/);
    if (singleMatch) {
      const p = Number.parseFloat(singleMatch[1]);
      if (Number.isFinite(p)) {
        idealEntries.push({
          label: 'Ideal Entry',
          low: p,
          high: p,
          midpoint: p,
          display: `$${p.toFixed(2)}`,
        });
      }
    } else if (/buy now|market|current price/i.test(whenToEnterRaw) && lastCloseNum !== null) {
      idealEntries.push({
        label: 'Ideal Entry (Market)',
        low: lastCloseNum,
        high: lastCloseNum,
        midpoint: lastCloseNum,
        display: `$${lastCloseNum.toFixed(2)}`,
      });
    }
  }

  // Stop-loss numeric extraction fallback from sec9b if ticketStop is N/A
  const sec9bStopText = stripMd(extractLabeledValue(sec9b, /\*\*(?:Hard Stop-Loss|Stop-Loss)[^:]*:\*\*\s*(.+)$/i));
  const parsedStopNum = extractFirstNumber(ticketStop) ?? extractFirstNumber(sec9bStopText);

  const sectionCount = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].filter((k) => sections.has(k)).length;

  return {
    id: existingId || `${ticker.toLowerCase()}-${Date.now()}`,
    savedAt: new Date().toISOString(),
    rawMarkdown: md,
    title,
    meta: {
      companyName,
      ticker,
      exchange: exchangeMatch ? exchangeMatch[1].trim() : 'N/A',
      sectorIndustry: sectorMatch ? sectorMatch[1].trim() : macroSector || 'N/A',
      marketCap: mcapMatch ? mcapMatch[1].trim() : 'N/A',
      enterpriseValue: evMatch ? stripSources(evMatch[1].trim()) : 'N/A',
      lastCloseStr: lastCloseNum !== null ? `$${lastCloseNum.toFixed(2)}` : lastCloseRaw || 'N/A',
      lastCloseNum,
      lastCloseDate: lastCloseDateMatch ? lastCloseDateMatch[1].trim() : '',
      reportDate: reportDateParsed,
      horizon: horizonMatch ? stripMd(horizonMatch[1]).trim() : '2–3 Months',
      nextEarnings: nextEarnings || 'N/A',
      nextEarningsDte,
      exDividend: exDividend || 'N/A',
      avgVolume: avgVolume || 'N/A',
      beta: beta || 'N/A',
      atrDollarStr: atrDollarMatch ? `$${atrDollarMatch[1]}` : 'N/A',
      atrDollarNum: atrDollarMatch ? Number.parseFloat(atrDollarMatch[1]) : null,
      atrPercentStr: atrPctMatch ? `${atrPctMatch[1]}%` : 'N/A',
      atrPercentNum: atrPctMatch ? Number.parseFloat(atrPctMatch[1]) : null,
      whatTheyDo: whatTheyDo || '',
    },
    macro: {
      gdp: gdp || 'N/A',
      inflation: inflation || 'N/A',
      yields: yields || 'N/A',
      creditSpreads: creditSpreads || 'N/A',
      plainEnglishTakeaway: macroTakeaway || '',
      sectorIndustry: macroSector || sectorMatch?.[1]?.trim() || 'N/A',
      institutionalFlow: institutionalFlow || 'N/A',
      cycleStage: cycleStage || 'N/A',
      rawBullets: macroBlock.split(/\r?\n/).filter((l) => l.trim().startsWith('-')),
    },
    ownership: {
      shortInterestStr: shortInterestStr || 'N/A',
      shortPctNum: shortPctMatch ? Number.parseFloat(shortPctMatch[1]) : null,
      daysToCoverStr: dtcMatch ? (dtcMatch[2] ? `${dtcMatch[1]}–${dtcMatch[2]}d` : `${dtcMatch[1]}d`) : 'N/A',
      daysToCoverNum: dtcMatch ? Number.parseFloat(dtcMatch[1]) : null,
      institutionalPctStr: instMatch ? `${instMatch[1]}%` : 'N/A',
      institutionalPctNum: instMatch ? Number.parseFloat(instMatch[1]) : null,
      insiderPctStr: insiderMatch ? `${insiderMatch[1]}%` : 'N/A',
      insiderPctNum: insiderMatch ? Number.parseFloat(insiderMatch[1]) : null,
      insiderActivitySummary: insiderActivitySummary || 'N/A',
      scheduledSales: scheduledSales || '',
      discretionarySales: discretionarySales || '',
      crowdingTakeaway: crowdingTakeaway || '',
      rawBullets: sec2.split(/\r?\n/).filter((l) => /^\s*\*/.test(l)),
    },
    valuation: {
      peers,
      fiveYearForwardEvSales: fiveYearForwardEvSales || 'N/A',
      fiveYearForwardPe: fiveYearForwardPe || 'N/A',
      fiveYearTakeaway: fiveYearTakeaway || '',
      sectorEtf: sectorEtf || 'N/A',
      etfCall,
      etfComparison: etfComparison || '',
      rawBullets: [],
    },
    expectations: {
      fiscalYearEnd: fiscalYearEnd || 'N/A',
      forwardConsensus,
      revisionPeriodLabel: sec4b.match(/\(([^)]+)\)/)?.[1] || 'Recent Period',
      estimateRevisions,
      revisionBreadth: revisionBreadth || '',
      earningsSurprises,
      takeaway: expectationsTakeaway || '',
    },
    businessHealth: {
      growthBullets,
      cushionBullets,
      driversBullets,
      nearTermShifts,
      rawBullets: sec5.split(/\r?\n/).filter((l) => /^\s*[-*]/.test(l)),
    },
    newsAndTone: {
      headlines,
      toughQuestions,
      managementTone,
      quotes,
      rawBullets: sec6.split(/\r?\n/).filter((l) => /^\s*[-*]/.test(l)),
    },
    catalystsAndRisks: {
      upsideTriggers,
      failureScenarios,
      economyImpact,
    },
    technicals: {
      lastCloseNum,
      lastCloseStr: lastCloseNum !== null ? `$${lastCloseNum.toFixed(2)}` : 'N/A',
      sma20Num: extractFirstNumber(sma20Str),
      sma20Str: sma20Str || 'N/A',
      sma50Num: extractFirstNumber(sma50Str),
      sma50Str: sma50Str || 'N/A',
      sma200Num: extractFirstNumber(sma200Str),
      sma200Str: sma200Str || 'N/A',
      rsi14Num: extractNumberOrRangeMid(rsi14Str),
      rsi14Str: rsi14Str || 'N/A',
      supportStr: supportStr || 'N/A',
      supportLevels: extractDollarPrices(supportStr),
      resistanceStr: resistanceStr || 'N/A',
      resistanceLevels: extractDollarPrices(resistanceStr),
      chartVerdict,
      avgEarningsMove,
      postEarningsDrift,
      scenarios,
    },
    tradePlan: {
      verdict,
      verdictLabel,
      setupStyle: setupStyle || 'Tactical Setup',
      riskRewardStr: rrFromCard,
      entryRule: whenToEnterRaw || ticketEntry,
      idealEntries,
      stopLoss: ticketStop,
      stopLossNum: parsedStopNum,
      targetPrice: ticketTarget,
      targetPriceNum: extractFirstNumber(ticketTarget),
      positionSize: positionSize || ticketSize,
      rationaleBullets: sec9bBullets,
      checklist,
      optionsLiquidity: optionsLiquidity || 'N/A',
      optionsLiquidityTier,
      optionsAvgVolNum: optionsAvgVolMatch ? Number.parseInt(optionsAvgVolMatch[1].replace(/,/g, ''), 10) : null,
      optionsLowVolNum: optionsLowVolMatch ? Number.parseInt(optionsLowVolMatch[1].replace(/,/g, ''), 10) : null,
      optionsOiLowNum: optionsOiMatch ? Number.parseInt(optionsOiMatch[1].replace(/,/g, ''), 10) : null,
      optionsOiHighNum: optionsOiMatch?.[2] ? Number.parseInt(optionsOiMatch[2].replace(/,/g, ''), 10) : null,
      putCallRatioNum: putCallMatch ? Number.parseFloat(putCallMatch[1]) : null,
      optionsPricing: optionsPricing || 'N/A',
      ivStr: ivMatch ? (ivMatch[2] ? `${ivMatch[1]}%–${ivMatch[2]}%` : `${ivMatch[1]}%`) : 'N/A',
      ivNum: ivMatch ? Number.parseFloat(ivMatch[1]) : null,
      ivHighNum: ivMatch?.[2] ? Number.parseFloat(ivMatch[2]) : ivMatch ? Number.parseFloat(ivMatch[1]) : null,
      ivMin52wNum: iv52wMatch ? Number.parseFloat(iv52wMatch[1]) : null,
      ivMax52wNum: iv52wMatch ? Number.parseFloat(iv52wMatch[2]) : null,
      hvStr: hvMatch ? (hvMatch[2] ? `${hvMatch[1]}%–${hvMatch[2]}%` : `${hvMatch[1]}%`) : 'N/A',
      hvNum: hvMatch ? Number.parseFloat(hvMatch[1]) : null,
      hvHighNum: hvMatch?.[2] ? Number.parseFloat(hvMatch[2]) : hvMatch ? Number.parseFloat(hvMatch[1]) : null,
      ivRankStr: ivRankMatch ? `~${ivRankMatch[1]}%` : 'N/A',
      ivRankNum: ivRankMatch ? Number.parseFloat(ivRankMatch[1]) : null,
      vehicleVerdict: vehicleVerdict || 'N/A',
      macroFit: macroFit || 'N/A',
    },
    tradeCard: {
      headline: stripMd(sec10HeadLine),
      whyThisTrade,
      tradeTicket,
      ticketAction,
      ticketEntry,
      ticketStop,
      ticketTarget,
      ticketSize,
      keyDatesAhead,
      biggestRisk,
      elevatorPitch,
    },
    sectionCoverage: sectionCount,
    rawSections,
  };
}
