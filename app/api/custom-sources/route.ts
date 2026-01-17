import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import {
  CustomDataSourceRow,
  rowToCustomSource,
  CustomSourceCreateRequest,
} from '@/lib/types/customSource';

// GET /api/custom-sources - List all custom sources
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`
      SELECT * FROM custom_data_sources
      ORDER BY created_at DESC
    `;

    const sources = (result as CustomDataSourceRow[]).map(rowToCustomSource);
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Error listing custom sources:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to list custom sources' },
      { status: 500 }
    );
  }
}

// POST /api/custom-sources - Create a new custom source
export async function POST(request: Request) {
  try {
    const body: CustomSourceCreateRequest = await request.json();
    const { provider, providerSourceId, title, description, unit } = body;

    // Validate required fields
    if (!provider || !providerSourceId || !title || !unit) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Missing required fields: provider, providerSourceId, title, unit' },
        { status: 400 }
      );
    }

    // Currently only FRED is supported
    if (provider !== 'fred') {
      return NextResponse.json(
        { error: 'UNSUPPORTED_PROVIDER', message: 'Only FRED provider is currently supported' },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Check for duplicate
    const existing = await sql`
      SELECT source_id FROM custom_data_sources
      WHERE provider = ${provider} AND provider_source_id = ${providerSourceId}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'DUPLICATE_SOURCE', message: 'This series already exists' },
        { status: 409 }
      );
    }

    // Validate against FRED API before inserting
    const validation = await validateFredSeries(providerSourceId);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'SERIES_NOT_FOUND', message: `Series not found: ${providerSourceId}` },
        { status: 400 }
      );
    }

    // Insert the new source
    const result = await sql`
      INSERT INTO custom_data_sources (
        provider,
        provider_source_id,
        title,
        description,
        unit,
        provider_title,
        provider_units,
        provider_frequency,
        validation_status,
        last_validated_at,
        frequency,
        stale_after_hours
      ) VALUES (
        ${provider},
        ${providerSourceId},
        ${title},
        ${description || null},
        ${unit},
        ${validation.series?.title || null},
        ${validation.series?.units || null},
        ${validation.series?.frequency || null},
        'valid',
        NOW(),
        ${mapFrequency(validation.series?.frequency)},
        720
      )
      RETURNING *
    `;

    const source = rowToCustomSource(result[0] as CustomDataSourceRow);

    return NextResponse.json({
      success: true,
      source: {
        sourceId: source.sourceId,
        provider: source.provider,
        providerSourceId: source.providerSourceId,
        title: source.title,
        unit: source.unit,
        validationStatus: source.validationStatus,
      },
    });
  } catch (error) {
    console.error('Error creating custom source:', error);

    // Check for specific database errors
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'DUPLICATE_SOURCE', message: 'This series already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to create custom source' },
      { status: 500 }
    );
  }
}

// Helper to validate FRED series
async function validateFredSeries(seriesId: string): Promise<{
  isValid: boolean;
  series?: { title: string; frequency: string; units: string };
}> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    throw new Error('FRED_API_KEY environment variable is not set');
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
  });

  const url = `https://api.stlouisfed.org/fred/series?${params}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 400) {
        return { isValid: false };
      }
      throw new Error(`FRED API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.seriess || data.seriess.length === 0) {
      return { isValid: false };
    }

    const series = data.seriess[0];
    return {
      isValid: true,
      series: {
        title: series.title,
        frequency: series.frequency,
        units: series.units,
      },
    };
  } catch (error) {
    console.error('FRED validation error:', error);
    throw error;
  }
}

// Map FRED frequency to our frequency type
function mapFrequency(fredFrequency?: string): string {
  if (!fredFrequency) return 'monthly';

  const mapping: Record<string, string> = {
    'D': 'daily',
    'Daily': 'daily',
    'W': 'weekly',
    'Weekly': 'weekly',
    'M': 'monthly',
    'Monthly': 'monthly',
    'Q': 'quarterly',
    'Quarterly': 'quarterly',
    'A': 'quarterly', // Annual treated as quarterly for caching
    'Annual': 'quarterly',
  };

  return mapping[fredFrequency] || 'monthly';
}
