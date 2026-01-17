import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { isCustomSource } from '@/lib/types/customSource';

interface RouteParams {
  params: Promise<{ sectionId: string }>;
}

interface DashboardSection {
  id: string;
  name: string;
  chartIds: string[];
}

interface DashboardConfig {
  sections: DashboardSection[];
}

// Validate custom chart ID format: "custom:{uuid}"
function isValidCustomChartId(chartId: string): boolean {
  if (!chartId.startsWith('custom:')) {
    return false;
  }
  const uuid = chartId.slice(7);
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// POST /api/config/sections/[sectionId]/sources - Add a source to a section
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { sectionId } = await params;
    const body = await request.json();
    const { chartId } = body;

    if (!chartId || typeof chartId !== 'string') {
      return NextResponse.json(
        { error: 'MISSING_CHART_ID', message: 'chartId is required' },
        { status: 400 }
      );
    }

    // Validate custom chart ID format
    if (isCustomSource(chartId) && !isValidCustomChartId(chartId)) {
      return NextResponse.json(
        { error: 'INVALID_CHART_ID', message: 'Invalid custom chart ID format. Expected "custom:{uuid}"' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Get current config
    const result = await sql`SELECT config FROM dashboard_config WHERE id = 1`;
    const config: DashboardConfig = result[0]?.config ?? { sections: [] };

    // Find the target section
    const sectionIndex = config.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      return NextResponse.json(
        { error: 'SECTION_NOT_FOUND', message: `Section not found: ${sectionId}` },
        { status: 404 }
      );
    }

    // Check if already exists
    if (config.sections[sectionIndex].chartIds.includes(chartId)) {
      return NextResponse.json(
        { error: 'ALREADY_EXISTS', message: 'Chart already exists in this section' },
        { status: 409 }
      );
    }

    // Add the chart ID
    config.sections[sectionIndex].chartIds.push(chartId);

    // Save updated config
    await sql`UPDATE dashboard_config SET config = ${JSON.stringify(config)}, updated_at = NOW() WHERE id = 1`;

    return NextResponse.json({
      success: true,
      section: {
        id: config.sections[sectionIndex].id,
        name: config.sections[sectionIndex].name,
        chartIds: config.sections[sectionIndex].chartIds,
      },
    });
  } catch (error) {
    console.error('Error adding source to section:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to add source to section' },
      { status: 500 }
    );
  }
}

// DELETE /api/config/sections/[sectionId]/sources?chartId=custom:{uuid}
// Removes a source from a section
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { sectionId } = await params;
    const { searchParams } = new URL(request.url);
    const chartId = searchParams.get('chartId');

    if (!chartId) {
      return NextResponse.json(
        { error: 'MISSING_CHART_ID', message: 'chartId query parameter is required' },
        { status: 400 }
      );
    }

    // Validate custom chart ID format if it's a custom source
    if (isCustomSource(chartId) && !isValidCustomChartId(chartId)) {
      return NextResponse.json(
        { error: 'INVALID_CHART_ID', message: 'Invalid custom chart ID format. Expected "custom:{uuid}"' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Get current config
    const result = await sql`SELECT config FROM dashboard_config WHERE id = 1`;
    const config: DashboardConfig = result[0]?.config ?? { sections: [] };

    // Find the target section
    const sectionIndex = config.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      // Section not found - return success (idempotent)
      return NextResponse.json({ success: true, removed: false });
    }

    // Remove the chart ID (idempotent - returns success even if not found)
    const chartIds = config.sections[sectionIndex].chartIds;
    const chartIndex = chartIds.indexOf(chartId);

    if (chartIndex === -1) {
      return NextResponse.json({ success: true, removed: false });
    }

    chartIds.splice(chartIndex, 1);

    // Save updated config
    await sql`UPDATE dashboard_config SET config = ${JSON.stringify(config)}, updated_at = NOW() WHERE id = 1`;

    return NextResponse.json({
      success: true,
      removed: true,
      section: {
        id: config.sections[sectionIndex].id,
        name: config.sections[sectionIndex].name,
        chartIds: config.sections[sectionIndex].chartIds,
      },
    });
  } catch (error) {
    console.error('Error removing source from section:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to remove source from section' },
      { status: 500 }
    );
  }
}
