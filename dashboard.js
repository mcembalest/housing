/**
 * High-Income Housing Acceleration Dashboard
 *
 * Answers: Where will high-income housing transaction volume accelerate?
 *
 * Depends on:
 *   - React 18 (loaded via CDN)
 *   - housing_data.js (defines HOUSING_DATA array)
 */

(function() {
  'use strict';

  const { useState, useMemo } = React;
  const e = React.createElement;

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const CONFIG = {
    // Weights for acceleration score
    weights: {
      turnoverMomentum: 0.35,
      domCompression: 0.25,
      priceReductionDecline: 0.20,
      listingVelocity: 0.20
    },
    // Score thresholds
    thresholds: {
      accelerating: 10,
      building: 0
    }
  };

  // ============================================================================
  // ACCELERATION SCORING
  // ============================================================================

  function calculateAccelerationScore(regionData) {
    const sorted = [...regionData].sort((a, b) => a.period.localeCompare(b.period));
    if (sorted.length < 6) return { score: 0, signals: {}, timeseries: sorted };

    const recent = sorted.slice(-3);
    const prior = sorted.slice(-6, -3);

    const avg = (arr, key) => {
      const vals = arr.map(d => d[key]).filter(v => v > 0);
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

    const pctChange = (recent, prior) => prior ? ((recent - prior) / prior) * 100 : 0;

    const signals = {
      turnoverMomentum: { value: pctChange(recentTurnover, priorTurnover), recent: recentTurnover, prior: priorTurnover },
      domMomentum: { value: pctChange(priorDOM, recentDOM), recent: recentDOM, prior: priorDOM }, // Inverted
      priceReductionMomentum: { value: pctChange(priorPriceReduction, recentPriceReduction), recent: recentPriceReduction, prior: priorPriceReduction },
      listingVelocityMomentum: { value: pctChange(recentListingVel, priorListingVel), recent: recentListingVel * 100, prior: priorListingVel * 100 }
    };

    const score = (
      signals.turnoverMomentum.value * CONFIG.weights.turnoverMomentum +
      signals.domMomentum.value * CONFIG.weights.domCompression +
      signals.priceReductionMomentum.value * CONFIG.weights.priceReductionDecline +
      signals.listingVelocityMomentum.value * CONFIG.weights.listingVelocity
    );

    const timeseries = sorted.map(d => ({
      period: d.period,
      turnoverRate: (d.salesCount / (d.inventory || 1)) * 100,
      daysOnMarket: d.daysOnMarket
    }));

    return { score, signals, timeseries };
  }

  // ============================================================================
  // COMPONENTS
  // ============================================================================

  function Sparkline({ data, dataKey, width = 120, height = 32, color = "#10b981", showTrend = true }) {
    if (!data || data.length < 2) return null;

    const values = data.map(d => d[dataKey]).filter(v => v != null);
    if (values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    }).join(' ');

    const trend = values[values.length - 1] > values[0];
    const trendColor = showTrend ? (trend ? "#10b981" : "#ef4444") : color;

    const lastY = height - ((values[values.length - 1] - min) / range) * height * 0.8 - height * 0.1;

    return e('svg', { width, height, className: 'inline-block' },
      e('polyline', { points, stroke: trendColor, className: 'sparkline' }),
      e('circle', { cx: width, cy: lastY, r: 3, fill: trendColor })
    );
  }

  function SignalIndicator({ value, label }) {
    const isPositive = value > 0;
    const isNeutral = Math.abs(value) < 3;
    const color = isNeutral ? "text-gray-400" : isPositive ? "text-green-400" : "text-red-400";
    const bgColor = isNeutral ? "bg-gray-800" : isPositive ? "bg-green-900/30" : "bg-red-900/30";

    return e('div', { className: `${bgColor} rounded-lg p-3` },
      e('div', { className: 'text-xs text-gray-500 mb-1' }, label),
      e('div', { className: `text-lg font-bold ${color}` },
        (value > 0 ? "+" : "") + value.toFixed(1) + "%"
      )
    );
  }

  function RegionCard({ region, rank, score, signals, timeseries, isTop }) {
    const scoreColor = score > 10 ? "text-green-400" : score > 0 ? "text-yellow-400" : "text-red-400";
    const borderColor = isTop ? "border-green-500" : "border-gray-700";

    return e('div', { className: `bg-gray-800 rounded-xl p-5 border-2 ${borderColor} ${isTop ? 'ring-2 ring-green-500/20' : ''}` },
      e('div', { className: 'flex items-start justify-between mb-4' },
        e('div', null,
          e('div', { className: 'flex items-center gap-3' },
            e('span', { className: 'text-2xl font-bold text-gray-500' }, `#${rank}`),
            e('h3', { className: 'text-xl font-bold' }, region),
            isTop && e('span', { className: 'px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full' }, 'HIGH POTENTIAL')
          )
        ),
        e('div', { className: 'text-right' },
          e('div', { className: 'text-xs text-gray-500' }, 'Acceleration Score'),
          e('div', { className: `text-3xl font-bold ${scoreColor}` },
            (score > 0 ? "+" : "") + score.toFixed(1)
          )
        )
      ),
      e('div', { className: 'flex gap-6 mb-4 pb-4 border-b border-gray-700' },
        e('div', null,
          e('div', { className: 'text-xs text-gray-500 mb-1' }, 'Turnover Rate'),
          e(Sparkline, { data: timeseries, dataKey: 'turnoverRate', width: 100, height: 28 })
        ),
        e('div', null,
          e('div', { className: 'text-xs text-gray-500 mb-1' }, 'Days on Market'),
          e(Sparkline, { data: timeseries, dataKey: 'daysOnMarket', width: 100, height: 28, showTrend: false, color: "#60a5fa" })
        )
      ),
      e('div', { className: 'grid grid-cols-2 gap-2' },
        e(SignalIndicator, { value: signals.turnoverMomentum?.value || 0, label: 'Turnover Momentum' }),
        e(SignalIndicator, { value: signals.domMomentum?.value || 0, label: 'DOM Compression' }),
        e(SignalIndicator, { value: signals.priceReductionMomentum?.value || 0, label: 'Price Cut Decline' }),
        e(SignalIndicator, { value: signals.listingVelocityMomentum?.value || 0, label: 'Listing Velocity' })
      )
    );
  }

  function Methodology() {
    return e('div', { className: 'max-w-6xl mx-auto mt-12 p-6 bg-gray-800 rounded-xl' },
      e('h3', { className: 'text-lg font-semibold mb-3' }, 'Methodology'),
      e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400' },
        e('div', null,
          e('h4', { className: 'font-medium text-white mb-2' }, 'Acceleration Score'),
          e('ul', { className: 'space-y-1' },
            e('li', null, `• Turnover Momentum (${CONFIG.weights.turnoverMomentum * 100}%)`),
            e('li', null, `• DOM Compression (${CONFIG.weights.domCompression * 100}%)`),
            e('li', null, `• Price Cut Decline (${CONFIG.weights.priceReductionDecline * 100}%)`),
            e('li', null, `• Listing Velocity (${CONFIG.weights.listingVelocity * 100}%)`)
          )
        ),
        e('div', null,
          e('h4', { className: 'font-medium text-white mb-2' }, 'Data Sources'),
          e('ul', { className: 'space-y-1' },
            e('li', null, e('a', { href: 'https://www.redfin.com/news/data-center/', target: '_blank', className: 'text-blue-400 hover:underline' }, '• Redfin Data Center')),
            e('li', null, e('a', { href: 'https://www.zillow.com/research/data/', target: '_blank', className: 'text-blue-400 hover:underline' }, '• Zillow Research'))
          )
        )
      )
    );
  }

  // ============================================================================
  // MAIN DASHBOARD
  // ============================================================================

  function Dashboard() {
    const rankings = useMemo(() => {
      if (typeof HOUSING_DATA === 'undefined' || !HOUSING_DATA.length) {
        return [];
      }

      const regions = [...new Set(HOUSING_DATA.map(d => d.region))];

      return regions.map(region => {
        const regionData = HOUSING_DATA.filter(d => d.region === region);
        const { score, signals, timeseries } = calculateAccelerationScore(regionData);
        return { region, score, signals, timeseries };
      }).sort((a, b) => b.score - a.score);
    }, []);

    if (rankings.length === 0) {
      return e('div', { className: 'min-h-screen bg-gray-900 p-6 flex items-center justify-center' },
        e('div', { className: 'text-center' },
          e('h1', { className: 'text-2xl font-bold mb-4' }, 'No Data Loaded'),
          e('p', { className: 'text-gray-400 mb-4' }, 'Run the data pipeline to generate housing_data.js:'),
          e('pre', { className: 'bg-gray-800 p-4 rounded text-left text-sm' },
            './fetch-redfin-data.sh\nnode transform-to-dashboard.js'
          )
        )
      );
    }

    const topRegions = rankings.filter(r => r.score > CONFIG.thresholds.accelerating);
    const watchRegions = rankings.filter(r => r.score > CONFIG.thresholds.building && r.score <= CONFIG.thresholds.accelerating);
    const coolingRegions = rankings.filter(r => r.score <= CONFIG.thresholds.building);

    return e('div', { className: 'min-h-screen bg-gray-900 p-6' },
      // Header
      e('div', { className: 'max-w-6xl mx-auto mb-8' },
        e('h1', { className: 'text-3xl font-bold mb-2' }, 'Where Will High-Income Housing Volume Accelerate?'),
        e('p', { className: 'text-gray-400 text-lg' }, 'Ranked by acceleration signals: turnover momentum, DOM compression, price trends, listing velocity'),
        e('div', { className: 'flex gap-4 mt-4 text-sm' },
          e('div', { className: 'flex items-center gap-2' },
            e('div', { className: 'w-3 h-3 rounded-full bg-green-500' }),
            e('span', { className: 'text-gray-400' }, 'Accelerating')
          ),
          e('div', { className: 'flex items-center gap-2' },
            e('div', { className: 'w-3 h-3 rounded-full bg-yellow-500' }),
            e('span', { className: 'text-gray-400' }, 'Building')
          ),
          e('div', { className: 'flex items-center gap-2' },
            e('div', { className: 'w-3 h-3 rounded-full bg-red-500' }),
            e('span', { className: 'text-gray-400' }, 'Cooling')
          )
        )
      ),

      // Accelerating
      topRegions.length > 0 && e('div', { className: 'max-w-6xl mx-auto mb-8' },
        e('h2', { className: 'text-xl font-semibold text-green-400 mb-4 flex items-center gap-2' },
          e('span', { className: 'w-2 h-2 rounded-full bg-green-500 animate-pulse' }),
          'Accelerating Markets'
        ),
        e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
          topRegions.map((r, i) => e(RegionCard, { key: r.region, ...r, rank: i + 1, isTop: true }))
        )
      ),

      // Building
      watchRegions.length > 0 && e('div', { className: 'max-w-6xl mx-auto mb-8' },
        e('h2', { className: 'text-xl font-semibold text-yellow-400 mb-4' }, 'Building Momentum'),
        e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
          watchRegions.map((r, i) => e(RegionCard, { key: r.region, ...r, rank: topRegions.length + i + 1, isTop: false }))
        )
      ),

      // Cooling
      coolingRegions.length > 0 && e('div', { className: 'max-w-6xl mx-auto mb-8' },
        e('h2', { className: 'text-xl font-semibold text-red-400 mb-4' }, 'Cooling / Decelerating'),
        e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
          coolingRegions.map((r, i) => e(RegionCard, { key: r.region, ...r, rank: topRegions.length + watchRegions.length + i + 1, isTop: false }))
        )
      ),

      e(Methodology)
    );
  }

  // ============================================================================
  // INIT
  // ============================================================================

  ReactDOM.createRoot(document.getElementById('root')).render(e(Dashboard));

})();
