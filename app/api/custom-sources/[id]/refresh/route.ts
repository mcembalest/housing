import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { CustomDataSourceRow, rowToCustomSource } from '@/lib/types/customSource';
import * as fs from 'fs';
import * as path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/custom-sources/[id]/refresh - Re-validate and clear cache
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const sql = neon(process.env.DATABASE_URL!);

    // Support both UUID (sourceId) and numeric (id) lookups
    const isUUID = id.includes('-');
    const existing = isUUID
      ? await sql`SELECT * FROM custom_data_sources WHERE source_id = ${id}::uuid`
      : await sql`SELECT * FROM custom_data_sources WHERE id = ${parseInt(id, 10)}`;

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Custom source not found' },
        { status: 404 }
      );
    }

    const source = rowToCustomSource(existing[0] as CustomDataSourceRow);

    // Re-validate against FRED API
    const validation = await validateFredSeries(source.providerSourceId);

    let updateResult;
    if (validation.isValid) {
      // Update with fresh metadata
      updateResult = isUUID
        ? await sql`
            UPDATE custom_data_sources
            SET
              provider_title = ${validation.series?.title || null},
              provider_units = ${validation.series?.units || null},
              provider_frequency = ${validation.series?.frequency || null},
              validation_status = 'valid',
              last_validation_error = NULL,
              last_validated_at = NOW(),
              updated_at = NOW()
            WHERE source_id = ${id}::uuid
            RETURNING *
          `
        : await sql`
            UPDATE custom_data_sources
            SET
              provider_title = ${validation.series?.title || null},
              provider_units = ${validation.series?.units || null},
              provider_frequency = ${validation.series?.frequency || null},
              validation_status = 'valid',
              last_validation_error = NULL,
              last_validated_at = NOW(),
              updated_at = NOW()
            WHERE id = ${parseInt(id, 10)}
            RETURNING *
          `;
    } else {
      // Mark as invalid with error
      updateResult = isUUID
        ? await sql`
            UPDATE custom_data_sources
            SET
              validation_status = 'invalid',
              last_validation_error = ${validation.error || 'Validation failed'},
              last_validated_at = NOW(),
              updated_at = NOW()
            WHERE source_id = ${id}::uuid
            RETURNING *
          `
        : await sql`
            UPDATE custom_data_sources
            SET
              validation_status = 'invalid',
              last_validation_error = ${validation.error || 'Validation failed'},
              last_validated_at = NOW(),
              updated_at = NOW()
            WHERE id = ${parseInt(id, 10)}
            RETURNING *
          `;
    }

    const updatedSource = rowToCustomSource(updateResult[0] as CustomDataSourceRow);

    // Try to delete the cache file (best effort)
    try {
      const cacheFile = path.join(process.cwd(), 'data', 'custom', `${updatedSource.sourceId}.csv`);
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    } catch (cacheError) {
      // Non-critical, log and continue
      console.warn('Failed to delete cache file:', cacheError);
    }

    return NextResponse.json({
      success: true,
      source: {
        sourceId: updatedSource.sourceId,
        provider: updatedSource.provider,
        providerSourceId: updatedSource.providerSourceId,
        title: updatedSource.title,
        unit: updatedSource.unit,
        providerTitle: updatedSource.providerTitle,
        providerUnits: updatedSource.providerUnits,
        providerFrequency: updatedSource.providerFrequency,
        validationStatus: updatedSource.validationStatus,
        lastValidationError: updatedSource.lastValidationError,
        lastValidatedAt: updatedSource.lastValidatedAt,
      },
    });
  } catch (error) {
    console.error('Error refreshing custom source:', error);

    // Check for FRED API unavailability
    if (error instanceof Error && error.message.includes('FRED API')) {
      return NextResponse.json(
        { error: 'PROVIDER_UNAVAILABLE', message: 'FRED API unavailable, please try later' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to refresh custom source' },
      { status: 500 }
    );
  }
}

async function validateFredSeries(seriesId: string): Promise<{
  isValid: boolean;
  series?: { title: string; frequency: string; units: string };
  error?: string;
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
      if (res.status === 400 || res.status === 404) {
        return { isValid: false, error: `Series not found: ${seriesId}` };
      }
      if (res.status === 429) {
        throw new Error('FRED API rate limit exceeded');
      }
      throw new Error(`FRED API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.seriess || data.seriess.length === 0) {
      return { isValid: false, error: `Series not found: ${seriesId}` };
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
    if (error instanceof Error && error.message.includes('FRED API')) {
      throw error;
    }
    console.error('FRED validation error:', error);
    throw new Error('FRED API error');
  }
}
