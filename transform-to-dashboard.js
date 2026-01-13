#!/usr/bin/env node
/**
 * Transform Redfin TSV data into dashboard-ready JSON
 *
 * Usage:
 *   ./fetch-redfin-data.sh      # Download fresh data
 *   node transform-to-dashboard.js   # Generate housing_data.js
 *
 * Then copy the output into high-income-acceleration-dashboard.html
 */

const fs = require('fs');

// Target metros for high-income analysis
const TARGET_METROS = [
  'San Francisco', 'New York', 'Los Angeles', 'Miami', 'Austin',
  'Seattle', 'Denver', 'Boston', 'Phoenix', 'Chicago'
];

function parseRedfinTSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.trim().split('\n');
  const rawHeaders = lines[0].split('\t');

  // Clean headers - remove quotes and normalize to lowercase
  const headers = rawHeaders.map(h => h.replace(/"/g, '').toLowerCase());

  console.log('Available columns:', headers.slice(0, 20).join(', '), '...\n');

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.replace(/"/g, ''));
    const row = {};
    headers.forEach((h, idx) => row[h] = values[idx]);

    // Get region name
    const region = row.region || row.region_name || '';

    // Check if this is a target metro
    const matchedMetro = TARGET_METROS.find(m =>
      region.toLowerCase().includes(m.toLowerCase())
    );

    if (!matchedMetro) continue;

    // Parse period (Redfin uses period_begin in YYYY-MM-DD format)
    const periodBegin = row.period_begin || '';
    if (!periodBegin) continue;

    const period = periodBegin.slice(0, 7); // YYYY-MM

    // Parse numeric values safely
    const parseNum = (val) => {
      if (!val || val === '' || val === 'NA') return 0;
      return parseFloat(val.replace(/,/g, '')) || 0;
    };

    // Map to our schema
    const record = {
      region: matchedMetro,
      period,
      salesCount: Math.round(parseNum(row.homes_sold)),
      inventory: Math.round(parseNum(row.inventory)),
      newListings: Math.round(parseNum(row.new_listings)),
      daysOnMarket: Math.round(parseNum(row.median_dom)),
      priceReductionPct: parseNum(row.price_drops) * 100, // Convert to percentage if decimal
      medianPrice: Math.round(parseNum(row.median_sale_price)),
      segment: 'all'
    };

    // Only include if we have meaningful data
    if (record.salesCount > 0 || record.inventory > 0) {
      data.push(record);
    }
  }

  return data;
}

function aggregateByPeriodAndRegion(data) {
  // Redfin may have multiple rows per metro (different property types, etc)
  // Aggregate to one row per region per period
  const grouped = {};

  data.forEach(d => {
    const key = `${d.region}|${d.period}`;
    if (!grouped[key]) {
      grouped[key] = { ...d, count: 1 };
    } else {
      grouped[key].salesCount += d.salesCount;
      grouped[key].inventory += d.inventory;
      grouped[key].newListings += d.newListings;
      grouped[key].daysOnMarket += d.daysOnMarket;
      grouped[key].priceReductionPct += d.priceReductionPct;
      grouped[key].medianPrice += d.medianPrice;
      grouped[key].count += 1;
    }
  });

  // Average the metrics that should be averaged
  return Object.values(grouped).map(d => ({
    region: d.region,
    period: d.period,
    salesCount: d.salesCount,
    inventory: Math.round(d.inventory / d.count),
    newListings: d.newListings,
    daysOnMarket: Math.round(d.daysOnMarket / d.count),
    priceReductionPct: Math.round(d.priceReductionPct / d.count * 10) / 10,
    medianPrice: Math.round(d.medianPrice / d.count),
    segment: 'all'
  }));
}

function generateOutput(data) {
  if (data.length === 0) {
    console.error('No data to output!');
    process.exit(1);
  }

  // Get last 12 months
  const periods = [...new Set(data.map(d => d.period))].sort().slice(-12);
  const filtered = data.filter(d => periods.includes(d.period));

  // Sort by region then period
  filtered.sort((a, b) => a.region.localeCompare(b.region) || a.period.localeCompare(b.period));

  console.log(`Periods: ${periods[0]} to ${periods[periods.length - 1]}`);
  console.log(`Records: ${filtered.length}`);
  console.log(`Regions: ${[...new Set(filtered.map(d => d.region))].join(', ')}`);

  // Sample output
  console.log('\nSample records:');
  filtered.slice(0, 3).forEach(r => console.log(` `, JSON.stringify(r)));

  // Generate JS code
  const output = `// Generated from Redfin data on ${new Date().toISOString().slice(0, 10)}
// Periods: ${periods[0]} to ${periods[periods.length - 1]}

const HOUSING_DATA = ${JSON.stringify(filtered, null, 2)};
`;

  fs.writeFileSync('housing_data.js', output);
  console.log('\n✓ Written to housing_data.js');
  console.log('→ Copy the HOUSING_DATA array into high-income-acceleration-dashboard.html');
}

// Main
const filepath = 'redfin_metro.tsv';
if (!fs.existsSync(filepath)) {
  console.error('Error: redfin_metro.tsv not found. Run ./fetch-redfin-data.sh first');
  process.exit(1);
}

console.log('Parsing Redfin data...\n');

const rawData = parseRedfinTSV(filepath);
console.log(`Parsed ${rawData.length} raw records for target metros\n`);

if (rawData.length === 0) {
  // Debug: show what regions ARE in the file
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split('\t').map(h => h.replace(/"/g, '').toLowerCase());
  const regionIdx = headers.indexOf('region');

  if (regionIdx >= 0) {
    const regions = new Set();
    for (let i = 1; i < Math.min(lines.length, 1000); i++) {
      const val = lines[i].split('\t')[regionIdx]?.replace(/"/g, '');
      if (val) regions.add(val);
    }
    console.log('Sample regions in file:', [...regions].slice(0, 20).join(', '));
  }

  console.error('\nNo matching metros found. Check region name format in the TSV.');
  process.exit(1);
}

const aggregated = aggregateByPeriodAndRegion(rawData);
console.log(`Aggregated to ${aggregated.length} region-period records\n`);

generateOutput(aggregated);
