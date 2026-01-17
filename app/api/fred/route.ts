import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FRED_CHARTS } from '@/data/fred-charts';

export interface FredDataPoint {
  date: string;
  value: number;
}

function parseCSV(content: string, valueColumn: string): FredDataPoint[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const valueIndex = headers.indexOf(valueColumn);

  if (valueIndex === -1) {
    console.error(`Column "${valueColumn}" not found in headers: ${headers.join(', ')}`);
    return [];
  }

  const data: FredDataPoint[] = [];
  const minDate = new Date('2015-01-01');

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const date = values[0];
    const value = parseFloat(values[valueIndex]);

    if (date && !isNaN(value)) {
      const dateObj = new Date(date);
      if (dateObj >= minDate) {
        data.push({ date, value });
      }
    }
  }

  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chartId = searchParams.get('chartId');

  if (!chartId) {
    return NextResponse.json({ error: 'chartId parameter required' }, { status: 400 });
  }

  const chartMeta = FRED_CHARTS[chartId];
  if (!chartMeta) {
    return NextResponse.json({ error: `Unknown chart: ${chartId}` }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'fred', chartMeta.file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = parseCSV(content, chartMeta.valueColumn);

    return NextResponse.json({
      chartId,
      meta: chartMeta,
      data,
    });
  } catch (error) {
    console.error(`Error loading FRED data for ${chartId}:`, error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
