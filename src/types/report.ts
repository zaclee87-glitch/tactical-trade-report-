export type TradeVerdict = 'LONG' | 'SHORT' | 'DO NOT ENTER' | 'UNKNOWN';

export interface PeerRow {
  ticker: string;
  isTarget: boolean;
  marketCapStr: string;
  marketCapNum: number | null;
  evEbitdaStr: string;
  evEbitdaNum: number | null;
  peFwdStr: string;
  peFwdNum: number | null;
  evSalesStr: string;
  evSalesNum: number | null;
  salesGrowthStr: string;
  salesGrowthNum: number | null;
  epsGrowthStr: string;
  epsGrowthNum: number | null;
  ebitdaMarginStr: string;
  ebitdaMarginNum: number | null;
  grossMarginStr: string;
  grossMarginNum: number | null;
}

export interface ForwardConsensusRow {
  metric: string;
  currentFy: string;
  nextFy: string;
  twoYearsOut: string;
}

export interface EstimateRevisionRow {
  timeframe: string;
  estimateStr: string;
  estimateNum: number | null;
  dollarChangeStr: string;
  pctChangeStr: string;
  pctChangeNum: number | null;
}

export interface EarningsSurpriseRow {
  quarter: string;
  actualStr: string;
  actualNum: number | null;
  expectedStr: string;
  expectedNum: number | null;
  diffDollarStr: string;
  diffPctStr: string;
  diffPctNum: number | null;
  result: 'Beat' | 'Miss' | 'In-Line' | string;
}

export interface ScenarioTargetRow {
  scenario: 'Bear' | 'Base' | 'Bull' | string;
  driver: string;
  salesGrowthStr: string;
  epsStr: string;
  multipleStr: string;
  impliedCapStr: string;
  targetPriceStr: string;
  targetPriceNum: number | null;
  pctMoveStr: string;
  pctMoveNum: number | null;
  whatMustHappen: string;
}

export interface ChecklistRow {
  step: string;
  actionPlan: string;
}

export interface NamedMetricItem {
  label: string;
  value: string;
}

export interface ParsedTradeReport {
  id: string;
  savedAt: string;
  rawMarkdown: string;
  title: string;
  meta: {
    companyName: string;
    ticker: string;
    exchange: string;
    sectorIndustry: string;
    marketCap: string;
    enterpriseValue: string;
    lastCloseStr: string;
    lastCloseNum: number | null;
    lastCloseDate: string;
    reportDate: string;
    horizon: string;
    nextEarnings: string;
    nextEarningsDte: string;
    exDividend: string;
    avgVolume: string;
    beta: string;
    atrDollarStr: string;
    atrDollarNum: number | null;
    atrPercentStr: string;
    atrPercentNum: number | null;
    whatTheyDo: string;
  };
  macro: {
    gdp: string;
    inflation: string;
    yields: string;
    creditSpreads: string;
    plainEnglishTakeaway: string;
    sectorIndustry: string;
    institutionalFlow: string;
    cycleStage: string;
    rawBullets: string[];
  };
  ownership: {
    shortInterestStr: string;
    shortPctNum: number | null;
    daysToCoverStr: string;
    daysToCoverNum: number | null;
    institutionalPctStr: string;
    institutionalPctNum: number | null;
    insiderPctStr: string;
    insiderPctNum: number | null;
    insiderActivitySummary: string;
    scheduledSales: string;
    discretionarySales: string;
    crowdingTakeaway: string;
    rawBullets: string[];
  };
  valuation: {
    peers: PeerRow[];
    fiveYearForwardEvSales: string;
    fiveYearForwardPe: string;
    fiveYearTakeaway: string;
    sectorEtf: string;
    etfCall: 'Outperform' | 'Match' | 'Underperform' | string;
    etfComparison: string;
    rawBullets: string[];
  };
  expectations: {
    fiscalYearEnd: string;
    forwardConsensus: ForwardConsensusRow[];
    revisionPeriodLabel: string;
    estimateRevisions: EstimateRevisionRow[];
    revisionBreadth: string;
    earningsSurprises: EarningsSurpriseRow[];
    takeaway: string;
  };
  businessHealth: {
    growthBullets: NamedMetricItem[];
    cushionBullets: NamedMetricItem[];
    driversBullets: NamedMetricItem[];
    nearTermShifts: string;
    rawBullets: string[];
  };
  newsAndTone: {
    headlines: NamedMetricItem[];
    toughQuestions: string;
    managementTone: string;
    quotes: string[];
    rawBullets: string[];
  };
  catalystsAndRisks: {
    upsideTriggers: string[];
    failureScenarios: string[];
    economyImpact: string;
  };
  technicals: {
    lastCloseNum: number | null;
    lastCloseStr: string;
    sma20Num: number | null;
    sma20Str: string;
    sma50Num: number | null;
    sma50Str: string;
    sma200Num: number | null;
    sma200Str: string;
    rsi14Num: number | null;
    rsi14Str: string;
    supportStr: string;
    supportLevels: number[];
    resistanceStr: string;
    resistanceLevels: number[];
    chartVerdict: string;
    avgEarningsMove: string;
    postEarningsDrift: string;
    scenarios: ScenarioTargetRow[];
  };
  tradePlan: {
    verdict: TradeVerdict;
    verdictLabel: string;
    setupStyle: string;
    riskRewardStr: string;
    entryRule: string;
    idealEntries: Array<{
      label: string;
      low: number;
      high: number;
      midpoint: number;
      display: string;
    }>;
    stopLoss: string;
    stopLossNum: number | null;
    targetPrice: string;
    targetPriceNum: number | null;
    positionSize: string;
    rationaleBullets: string[];
    checklist: ChecklistRow[];
    optionsLiquidity: string;
    optionsLiquidityTier: 'Tight/Liquid' | 'Average' | 'Thin/Wide Spreads' | 'Unknown';
    optionsAvgVolNum: number | null;
    optionsLowVolNum: number | null;
    optionsOiLowNum: number | null;
    optionsOiHighNum: number | null;
    putCallRatioNum: number | null;
    optionsPricing: string;
    ivStr: string;
    ivNum: number | null;
    ivHighNum: number | null;
    ivMin52wNum: number | null;
    ivMax52wNum: number | null;
    hvStr: string;
    hvNum: number | null;
    hvHighNum: number | null;
    ivRankStr: string;
    ivRankNum: number | null;
    vehicleVerdict: string;
    macroFit: string;
  };
  tradeCard: {
    headline: string;
    whyThisTrade: string;
    tradeTicket: string;
    ticketAction: string;
    ticketEntry: string;
    ticketStop: string;
    ticketTarget: string;
    ticketSize: string;
    keyDatesAhead: string;
    biggestRisk: string;
    elevatorPitch: string;
  };
  sectionCoverage: number;
  rawSections: Array<{ heading: string; body: string }>;
}
