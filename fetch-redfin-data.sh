#!/bin/bash
# Fetch real Redfin market data for the acceleration dashboard
# Run this locally: ./fetch-redfin-data.sh

set -e

echo "Fetching Redfin metro-level market data..."

# Metro-level data (best for high-income housing analysis)
curl -L "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/redfin_metro_market_tracker.tsv000.gz" \
  -o redfin_metro.tsv.gz

gunzip -f redfin_metro.tsv.gz

echo "Downloaded $(wc -l < redfin_metro.tsv) rows"
echo ""
echo "Columns available:"
head -1 redfin_metro.tsv | tr '\t' '\n' | head -20

echo ""
echo "Sample data for top metros:"
grep -E "(San Francisco|New York|Los Angeles|Miami|Austin|Seattle|Denver|Boston|Phoenix|Chicago)" redfin_metro.tsv | head -20

echo ""
echo "Done! Now run: node transform-to-dashboard.js"
