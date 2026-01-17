import { NextResponse } from 'next/server';

// In-memory cache for validation results (5 min TTL)
// Note: Will reset between serverless invocations
const validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory rate limiting (best-effort, resets between invocations)
const rateLimitState = {
  count: 0,
  windowStart: Date.now(),
};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window

interface ValidationResult {
  isValid: boolean;
  series?: {
    title: string;
    frequency: string;
    units: string;
    lastObservation?: string;
  };
  error?: string;
}

// POST /api/custom-sources/validate
// Validates a FRED series ID without creating a source
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seriesId } = body;

    if (!seriesId || typeof seriesId !== 'string') {
      return NextResponse.json(
        { error: 'MISSING_SERIES_ID', message: 'seriesId is required' },
        { status: 400 }
      );
    }

    const normalizedId = seriesId.trim().toUpperCase();

    // Check cache first
    const cached = validationCache.get(normalizedId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.result);
    }

    // Check rate limit
    const now = Date.now();
    if (now - rateLimitState.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitState.count = 0;
      rateLimitState.windowStart = now;
    }

    if (rateLimitState.count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many validation requests. Please wait 60 seconds before trying again. Note: Rate limiting may be reset between serverless invocations.',
        },
        { status: 429 }
      );
    }

    rateLimitState.count++;

    // Validate against FRED API
    const result = await validateFredSeries(normalizedId);

    // Cache the result
    validationCache.set(normalizedId, { result, timestamp: Date.now() });

    // Clean up old cache entries periodically
    if (validationCache.size > 100) {
      const cutoff = Date.now() - CACHE_TTL_MS;
      for (const [key, value] of validationCache) {
        if (value.timestamp < cutoff) {
          validationCache.delete(key);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Validation error:', error);

    // Check for FRED API unavailability
    if (error instanceof Error && error.message.includes('FRED API')) {
      return NextResponse.json(
        { error: 'PROVIDER_UNAVAILABLE', message: 'FRED API unavailable, please try later' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Validation failed' },
      { status: 500 }
    );
  }
}

async function validateFredSeries(seriesId: string): Promise<ValidationResult> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    throw new Error('FRED_API_KEY environment variable is not set');
  }

  // Fetch series metadata
  const seriesParams = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
  });

  const seriesUrl = `https://api.stlouisfed.org/fred/series?${seriesParams}`;

  try {
    const seriesRes = await fetch(seriesUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!seriesRes.ok) {
      if (seriesRes.status === 400 || seriesRes.status === 404) {
        return {
          isValid: false,
          error: `Series not found: ${seriesId}`,
        };
      }
      if (seriesRes.status === 429) {
        throw new Error('FRED API rate limit exceeded');
      }
      throw new Error(`FRED API error: ${seriesRes.status}`);
    }

    const seriesData = await seriesRes.json();

    if (!seriesData.seriess || seriesData.seriess.length === 0) {
      return {
        isValid: false,
        error: `Series not found: ${seriesId}`,
      };
    }

    const series = seriesData.seriess[0];

    // Optionally fetch the last observation
    let lastObservation: string | undefined;
    try {
      const obsParams = new URLSearchParams({
        series_id: seriesId,
        api_key: apiKey,
        file_type: 'json',
        sort_order: 'desc',
        limit: '1',
      });

      const obsUrl = `https://api.stlouisfed.org/fred/series/observations?${obsParams}`;
      const obsRes = await fetch(obsUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (obsRes.ok) {
        const obsData = await obsRes.json();
        if (obsData.observations && obsData.observations.length > 0) {
          const obs = obsData.observations[0];
          if (obs.value && obs.value !== '.') {
            lastObservation = obs.date;
          }
        }
      }
    } catch {
      // Non-critical, continue without last observation
    }

    return {
      isValid: true,
      series: {
        title: series.title,
        frequency: series.frequency,
        units: series.units,
        lastObservation,
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
