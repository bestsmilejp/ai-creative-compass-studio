import { NextRequest } from 'next/server';

// n8n API Key from environment variable
const N8N_API_KEY = process.env.N8N_API_KEY;

export interface ApiAuthResult {
  authenticated: boolean;
  error?: string;
}

/**
 * Validate API key for n8n requests
 */
export function validateN8nApiKey(request: NextRequest): ApiAuthResult {
  // Check if API key is configured
  if (!N8N_API_KEY) {
    return {
      authenticated: false,
      error: 'N8N_API_KEY is not configured on server',
    };
  }

  // Get API key from header
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Missing x-api-key header',
    };
  }

  if (apiKey !== N8N_API_KEY) {
    return {
      authenticated: false,
      error: 'Invalid API key',
    };
  }

  return { authenticated: true };
}

/**
 * Generate a secure API key (for admin use)
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32;
  let result = 'n8n_';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
