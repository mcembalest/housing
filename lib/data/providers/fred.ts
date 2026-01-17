import { DataProvider, DataPoint, normalizeDate, addDays } from '../types';

interface FredObservation {
  date: string;
  value: string;
}

interface FredApiResponse {
  observations: FredObservation[];
}

export const fredProvider: DataProvider = {
  name: 'fred',
  supportsIncremental: true,

  async fetchSeries(sourceId: string, since?: string): Promise<DataPoint[]> {
    const apiKey = process.env.FRED_API_KEY;

    if (!apiKey) {
      throw new Error('FRED_API_KEY environment variable is not set');
    }

    // For incremental fetch, start from the day after the last known date
    // to avoid re-fetching the same data point
    const startDate = since ? addDays(since, 1) : '2015-01-01';

    const params = new URLSearchParams({
      series_id: sourceId,
      api_key: apiKey,
      file_type: 'json',
      observation_start: startDate,
    });

    const url = `https://api.stlouisfed.org/fred/series/observations?${params}`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Don't cache at the HTTP level since we manage our own cache
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('FRED API rate limit exceeded');
      }
      throw new Error(`FRED API error: ${res.status} ${res.statusText}`);
    }

    const data: FredApiResponse = await res.json();

    if (!data.observations) {
      return [];
    }

    // Filter out missing values (FRED uses '.' for missing data)
    return data.observations
      .filter(obs => obs.value !== '.' && obs.value !== '')
      .map(obs => ({
        date: normalizeDate(obs.date),
        value: parseFloat(obs.value),
      }))
      .filter(point => !isNaN(point.value));
  },
};
