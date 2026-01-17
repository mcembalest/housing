import { DataProvider } from '../types';
import { fredProvider } from './fred';

// Provider registry - add new providers here
const providers: Record<string, DataProvider> = {
  fred: fredProvider,
  // Future providers:
  // zillow: zillowProvider,
  // census: censusProvider,
};

export function getProvider(name: string): DataProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

export function getAllProviders(): DataProvider[] {
  return Object.values(providers);
}

export { fredProvider };
