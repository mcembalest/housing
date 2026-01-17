import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cacheManager } from '@/lib/data/cacheManager';
import { getSeriesConfig as getBuiltInSeriesConfig, SERIES_REGISTRY } from '@/lib/data/seriesRegistry';
import { getProvider } from '@/lib/data/providers';
import { DataPoint, SeriesConfig } from '@/lib/data/types';
import { isCustomSource, extractCustomUUID, CustomDataSourceRow } from '@/lib/types/customSource';

// Get series config for both built-in and custom sources
async function getSeriesConfig(seriesId: string): Promise<SeriesConfig | null> {
  // Built-in sources
  if (!isCustomSource(seriesId)) {
    return getBuiltInSeriesConfig(seriesId) || null;
  }

  // Custom sources
  const uuid = extractCustomUUID(seriesId);
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const result = await sql`
      SELECT * FROM custom_data_sources
      WHERE source_id = ${uuid}::uuid
      AND validation_status = 'valid'
    `;

    if (result.length === 0) return null;

    const source = result[0] as CustomDataSourceRow;
    return {
      id: `custom:${source.source_id}`,
      provider: source.provider,
      sourceId: source.provider_source_id,
      frequency: source.frequency as 'daily' | 'weekly' | 'monthly' | 'quarterly',
      staleAfterHours: source.stale_after_hours,
      cacheFile: `custom/${source.source_id}.csv`, // UUID as filename
      title: source.title,
      description: source.description || '',
      unit: source.unit,
      valueColumn: 'value',
    };
  } catch (error) {
    console.error('Error fetching custom source:', error);
    return null;
  }
}

// Track in-flight refreshes to avoid stampedes (per-process)
const refreshingSet = new Set<string>();

// Filter data to start from 2015-01-01 (matching existing behavior)
const MIN_DATE = '2015-01-01';

function filterByMinDate(data: DataPoint[]): DataPoint[] {
  return data.filter(d => d.date >= MIN_DATE);
}

// GET /api/data?series=mortgage_rates
// GET /api/data?series=mortgage_rates,vix,housing_starts (multiple series)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seriesParam = searchParams.get('series');

  if (!seriesParam) {
    // Return list of available series
    return NextResponse.json({
      series: Object.entries(SERIES_REGISTRY).map(([id, config]) => ({
        id,
        title: config.title,
        description: config.description,
        provider: config.provider,
        frequency: config.frequency,
      })),
    });
  }

  // Support single series or comma-separated list
  const seriesIds = seriesParam.split(',').map(s => s.trim());

  // Single series request
  if (seriesIds.length === 1) {
    const seriesId = seriesIds[0];
    const config = await getSeriesConfig(seriesId);

    if (!config) {
      return NextResponse.json(
        { error: `Unknown series: ${seriesId}` },
        { status: 404 }
      );
    }

    const result = await getSeriesData(config);
    return NextResponse.json(result);
  }

  // Multiple series request - fetch in parallel
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  await Promise.all(
    seriesIds.map(async (seriesId) => {
      const config = await getSeriesConfig(seriesId);
      if (!config) {
        errors.push(`Unknown series: ${seriesId}`);
        return;
      }
      results[seriesId] = await getSeriesData(config);
    })
  );

  return NextResponse.json({
    results,
    ...(errors.length > 0 && { errors }),
  });
}

async function getSeriesData(config: SeriesConfig) {
  // 1. Try in-memory cache first (best-effort)
  let data = cacheManager.getFromMemory(config.id);

  // 2. Fall back to file cache (source of truth)
  if (!data) {
    data = cacheManager.readFromFile(config);
    if (data.length > 0) {
      cacheManager.setInMemory(config.id, data);
    }
  }

  // 3. Trigger background refresh if stale (non-blocking)
  const shouldRefresh = cacheManager.needsRefresh(config)
    && !cacheManager.shouldBackoff(config.id)
    && !refreshingSet.has(config.id);

  if (shouldRefresh) {
    refreshingSet.add(config.id);
    refreshInBackground(config).finally(() => {
      refreshingSet.delete(config.id);
    });
  }

  // 4. Return data with metadata
  const filteredData = filterByMinDate(data);
  const meta = cacheManager.getSeriesMeta(config.id);

  return {
    series: config.id,
    meta: {
      id: config.id,
      title: config.title,
      description: config.description,
      unit: config.unit,
      provider: config.provider,
      frequency: config.frequency,
      lastFetched: meta?.lastFetched,
      lastDataDate: meta?.lastDataDate,
      isRefreshing: refreshingSet.has(config.id),
    },
    data: filteredData,
  };
}

async function refreshInBackground(config: SeriesConfig): Promise<void> {
  try {
    const provider = getProvider(config.provider);
    const lastDate = cacheManager.getLastDataDate(config.id);

    console.log(`[Data] Refreshing ${config.id} from ${config.provider}...`);

    // Fetch new data (incremental if supported and we have existing data)
    const newData = provider.supportsIncremental && lastDate
      ? await provider.fetchSeries(config.sourceId, lastDate)
      : await provider.fetchSeries(config.sourceId);

    if (newData.length > 0) {
      console.log(`[Data] Got ${newData.length} new points for ${config.id}`);

      if (provider.supportsIncremental) {
        await cacheManager.appendToFile(config, newData);
      } else {
        await cacheManager.rewriteFile(config, newData);
      }

      // Update in-memory cache with merged data
      const fullData = cacheManager.readFromFile(config);
      cacheManager.setInMemory(config.id, fullData);
    } else {
      console.log(`[Data] No new data for ${config.id}`);
      // Still update lastFetched even if no new data
      cacheManager.updateMeta(config.id, {
        provider: config.provider,
        lastFetched: new Date().toISOString(),
        lastDataDate: lastDate || '',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[Data] Refresh failed for ${config.id}:`, message);
    cacheManager.recordError(config.id, message);
  }
}
