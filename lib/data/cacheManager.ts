import fs from 'fs';
import path from 'path';
import { DataPoint, SeriesConfig, CacheMeta, SeriesCacheMeta, normalizeDate } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CACHE_META_PATH = path.join(DATA_DIR, 'cache-meta.json');

// In-memory cache (best-effort, may reset in serverless)
const memoryCache = new Map<string, { data: DataPoint[]; timestamp: number }>();
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes

class CacheManager {
  private cacheMeta: CacheMeta | null = null;

  // Load cache metadata from file
  private loadMeta(): CacheMeta {
    if (this.cacheMeta) return this.cacheMeta;

    try {
      if (fs.existsSync(CACHE_META_PATH)) {
        const content = fs.readFileSync(CACHE_META_PATH, 'utf-8');
        this.cacheMeta = JSON.parse(content);
        return this.cacheMeta!;
      }
    } catch (error) {
      console.warn('Failed to load cache meta:', error);
    }

    this.cacheMeta = {};
    return this.cacheMeta;
  }

  // Save cache metadata to file
  private saveMeta(): void {
    try {
      fs.writeFileSync(CACHE_META_PATH, JSON.stringify(this.cacheMeta, null, 2));
    } catch (error) {
      console.warn('Failed to save cache meta:', error);
    }
  }

  // Get metadata for a specific series
  getSeriesMeta(seriesId: string): SeriesCacheMeta | undefined {
    const meta = this.loadMeta();
    return meta[seriesId];
  }

  // Update metadata for a series
  updateMeta(seriesId: string, updates: Partial<SeriesCacheMeta>): void {
    const meta = this.loadMeta();
    meta[seriesId] = {
      ...meta[seriesId],
      ...updates,
    } as SeriesCacheMeta;
    this.saveMeta();
  }

  // Check if series needs refresh based on staleAfterHours
  needsRefresh(config: SeriesConfig): boolean {
    const meta = this.getSeriesMeta(config.id);
    if (!meta?.lastFetched) return true;

    const lastFetched = new Date(meta.lastFetched).getTime();
    const staleAfterMs = config.staleAfterHours * 60 * 60 * 1000;
    const now = Date.now();

    return (now - lastFetched) > staleAfterMs;
  }

  // Check if we should back off due to previous errors
  shouldBackoff(seriesId: string): boolean {
    const meta = this.getSeriesMeta(seriesId);
    if (!meta?.backoffUntil) return false;
    return new Date(meta.backoffUntil).getTime() > Date.now();
  }

  // Record an error and set exponential backoff
  recordError(seriesId: string, error: string): void {
    const meta = this.getSeriesMeta(seriesId);
    const previousBackoff = meta?.backoffUntil ?
      new Date(meta.backoffUntil).getTime() - Date.now() : 0;

    // Exponential backoff: 1min, 2min, 4min, 8min, max 1 hour
    const baseBackoffMs = 60 * 1000;
    const multiplier = previousBackoff > 0 ? 2 : 1;
    const newBackoffMs = Math.min(
      Math.max(baseBackoffMs, previousBackoff * multiplier),
      60 * 60 * 1000
    );

    this.updateMeta(seriesId, {
      lastError: error,
      backoffUntil: new Date(Date.now() + newBackoffMs).toISOString(),
    });
  }

  // Clear error state after successful refresh
  clearError(seriesId: string): void {
    const meta = this.loadMeta();
    if (meta[seriesId]) {
      delete meta[seriesId].lastError;
      delete meta[seriesId].backoffUntil;
      this.saveMeta();
    }
  }

  // Get last data date for incremental fetches
  getLastDataDate(seriesId: string): string | undefined {
    const meta = this.getSeriesMeta(seriesId);
    return meta?.lastDataDate;
  }

  // Read data from CSV file
  readFromFile(config: SeriesConfig): DataPoint[] {
    const filePath = path.join(DATA_DIR, config.cacheFile);

    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseCSV(content, config.valueColumn);
    } catch (error) {
      console.warn(`Failed to read cache file for ${config.id}:`, error);
      return [];
    }
  }

  // Parse CSV content into DataPoint array
  private parseCSV(content: string, valueColumn: string): DataPoint[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const valueIndex = headers.indexOf(valueColumn);

    if (valueIndex === -1) {
      console.error(`Column "${valueColumn}" not found in headers: ${headers.join(', ')}`);
      return [];
    }

    const data: DataPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const date = values[0]?.trim();
      const value = parseFloat(values[valueIndex]);

      if (date && !isNaN(value)) {
        data.push({ date: normalizeDate(date), value });
      }
    }

    return data.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Convert DataPoint array to CSV content
  private toCSV(data: DataPoint[], valueColumn: string): string {
    const lines = [`,${valueColumn}`]; // Header with empty first column (date index)
    for (const point of data) {
      lines.push(`${point.date},${point.value}`);
    }
    return lines.join('\n') + '\n';
  }

  // Merge existing and incoming data, dedupe by date
  mergeData(existing: DataPoint[], incoming: DataPoint[]): DataPoint[] {
    const dateMap = new Map<string, DataPoint>();

    // Add existing data first
    for (const point of existing) {
      dateMap.set(point.date, point);
    }

    // Incoming data overwrites existing for same dates
    for (const point of incoming) {
      dateMap.set(point.date, point);
    }

    // Convert back to array and sort
    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Append new data to file (with file locking)
  async appendToFile(config: SeriesConfig, newData: DataPoint[]): Promise<void> {
    const filePath = path.join(DATA_DIR, config.cacheFile);
    const lockPath = filePath + '.lock';

    await this.withLock(lockPath, async () => {
      const existing = this.readFromFile(config);
      const merged = this.mergeData(existing, newData);
      const content = this.toCSV(merged, config.valueColumn);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content);

      // Update metadata
      const lastPoint = merged[merged.length - 1];
      if (lastPoint) {
        this.updateMeta(config.id, {
          provider: config.provider,
          lastFetched: new Date().toISOString(),
          lastDataDate: lastPoint.date,
        });
        this.clearError(config.id);
      }
    });
  }

  // Rewrite entire file (for non-incremental providers)
  async rewriteFile(config: SeriesConfig, allData: DataPoint[]): Promise<void> {
    const filePath = path.join(DATA_DIR, config.cacheFile);
    const lockPath = filePath + '.lock';

    await this.withLock(lockPath, async () => {
      const sorted = [...allData].sort((a, b) => a.date.localeCompare(b.date));
      const content = this.toCSV(sorted, config.valueColumn);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content);

      // Update metadata
      const lastPoint = sorted[sorted.length - 1];
      if (lastPoint) {
        this.updateMeta(config.id, {
          provider: config.provider,
          lastFetched: new Date().toISOString(),
          lastDataDate: lastPoint.date,
        });
        this.clearError(config.id);
      }
    });
  }

  // Simple file locking using directory as lock
  private async withLock<T>(lockPath: string, fn: () => Promise<T>): Promise<T> {
    const maxWaitMs = 5000;
    const startTime = Date.now();

    // Try to acquire lock
    while (true) {
      try {
        fs.mkdirSync(lockPath);
        break; // Lock acquired
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          // Lock is held by another process
          if (Date.now() - startTime > maxWaitMs) {
            // Force remove stale lock
            try {
              fs.rmdirSync(lockPath);
            } catch {
              // Ignore
            }
            continue;
          }
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          throw error;
        }
      }
    }

    try {
      return await fn();
    } finally {
      try {
        fs.rmdirSync(lockPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  // In-memory cache operations (best-effort)
  getFromMemory(id: string): DataPoint[] | null {
    const cached = memoryCache.get(id);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > MEMORY_TTL_MS) {
      memoryCache.delete(id);
      return null;
    }

    return cached.data;
  }

  setInMemory(id: string, data: DataPoint[]): void {
    memoryCache.set(id, { data, timestamp: Date.now() });
  }
}

export const cacheManager = new CacheManager();
