import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export interface DashboardSection {
  id: string;
  name: string;
  chartIds: string[];
}

export interface DashboardConfig {
  sections: DashboardSection[];
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`SELECT config FROM dashboard_config WHERE id = 1`;
    return NextResponse.json(result[0]?.config ?? { sections: [] });
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

    const sql = neon(process.env.DATABASE_URL!);
    await sql`UPDATE dashboard_config SET config = ${JSON.stringify(config)}, updated_at = NOW() WHERE id = 1`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
