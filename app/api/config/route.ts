import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface DashboardSection {
  id: string;
  name: string;
  chartIds: string[];
}

export interface DashboardConfig {
  sections: DashboardSection[];
}

const configPath = path.join(process.cwd(), 'data', 'dashboard-config.json');

export async function GET() {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config: DashboardConfig = JSON.parse(content);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error loading dashboard config:', error);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const config: DashboardConfig = await request.json();

    // Validate structure
    if (!config.sections || !Array.isArray(config.sections)) {
      return NextResponse.json({ error: 'Invalid config structure' }, { status: 400 });
    }

    for (const section of config.sections) {
      if (!section.id || !section.name || !Array.isArray(section.chartIds)) {
        return NextResponse.json({ error: 'Invalid section structure' }, { status: 400 });
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
