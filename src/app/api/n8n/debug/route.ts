import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/n8n/debug
 * Debug endpoint to check API key configuration (temporary)
 */
export async function GET(request: NextRequest) {
  const N8N_API_KEY = process.env.N8N_API_KEY;
  const providedKey = request.headers.get('x-api-key');

  return NextResponse.json({
    server: {
      keyConfigured: !!N8N_API_KEY,
      keyLength: N8N_API_KEY?.length || 0,
      keyPrefix: N8N_API_KEY?.substring(0, 4) || 'not set',
    },
    request: {
      keyProvided: !!providedKey,
      keyLength: providedKey?.length || 0,
      keyPrefix: providedKey?.substring(0, 4) || 'not provided',
    },
    match: N8N_API_KEY === providedKey,
  });
}
