import { HousingRecord, RegionData, AccelerationSignals, TimeseriesPoint } from '@/lib/types';
import config from './config';
import { housingData } from './data';

// Weights for acceleration score
const WEIGHTS = {
  turnoverMomentum: 0.35,
  domCompression: 0.25,
  priceReductionDecline: 0.20,
  listingVelocity: 0.20,
};

function calculateAccelerationScore(regionData: HousingRecord[]): {
  score: number;
  signals: AccelerationSignals;
  timeseries: TimeseriesPoint[];
} {
  const sorted = [...regionData].sort((a, b) => a.period.localeCompare(b.period));

  if (sorted.length < 6) {
    return {
      score: 0,
      signals: {
        turnoverMomentum: { value: 0, recent: 0, prior: 0 },
        domMomentum: { value: 0, recent: 0, prior: 0 },
        priceReductionMomentum: { value: 0, recent: 0, prior: 0 },
        listingVelocityMomentum: { value: 0, recent: 0, prior: 0 },
      },
      timeseries: sorted.map(d => ({
        period: d.period,
        turnoverRate: (d.salesCount / (d.inventory || 1)) * 100,
        daysOnMarket: d.daysOnMarket,
      })),
    };
  }

  const recent = sorted.slice(-3);
  const prior = sorted.slice(-6, -3);

  const avg = (arr: HousingRecord[], key: keyof HousingRecord) => {
    const vals = arr.map(d => d[key] as number).filter(v => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  const recentTurnover = avg(recent, 'salesCount') / (avg(recent, 'inventory') || 1) * 100;
  const priorTurnover = avg(prior, 'salesCount') / (avg(prior, 'inventory') || 1) * 100;
  const recentDOM = avg(recent, 'daysOnMarket');
  const priorDOM = avg(prior, 'daysOnMarket');
  const recentPriceReduction = avg(recent, 'priceReductionPct');
  const priorPriceReduction = avg(prior, 'priceReductionPct');
  const recentListingVel = avg(recent, 'newListings') / (avg(recent, 'inventory') || 1);
  const priorListingVel = avg(prior, 'newListings') / (avg(prior, 'inventory') || 1);

  const pctChange = (recentVal: number, priorVal: number) =>
    priorVal ? ((recentVal - priorVal) / priorVal) * 100 : 0;

  const signals: AccelerationSignals = {
    turnoverMomentum: { value: pctChange(recentTurnover, priorTurnover), recent: recentTurnover, prior: priorTurnover },
    domMomentum: { value: pctChange(priorDOM, recentDOM), recent: recentDOM, prior: priorDOM }, // Inverted
    priceReductionMomentum: { value: pctChange(priorPriceReduction, recentPriceReduction), recent: recentPriceReduction, prior: priorPriceReduction },
    listingVelocityMomentum: { value: pctChange(recentListingVel, priorListingVel), recent: recentListingVel * 100, prior: priorListingVel * 100 },
  };

  const score =
    signals.turnoverMomentum.value * WEIGHTS.turnoverMomentum +
    signals.domMomentum.value * WEIGHTS.domCompression +
    signals.priceReductionMomentum.value * WEIGHTS.priceReductionDecline +
    signals.listingVelocityMomentum.value * WEIGHTS.listingVelocity;

  const timeseries: TimeseriesPoint[] = sorted.map(d => ({
    period: d.period,
    turnoverRate: (d.salesCount / (d.inventory || 1)) * 100,
    daysOnMarket: d.daysOnMarket,
  }));

  return { score, signals, timeseries };
}

export function loadHousingData(): RegionData[] {
  const regions = [...new Set(housingData.map(d => d.region))];

  return regions.map(region => {
    const regionRecords = housingData.filter(d => d.region === region);
    const { score, signals, timeseries } = calculateAccelerationScore(regionRecords);
    const coordinates = config.metros?.[region];

    return {
      region,
      score,
      signals,
      timeseries,
      coordinates,
    };
  }).sort((a, b) => b.score - a.score);
}

export { config };
