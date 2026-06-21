import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * POST /api/circle/w3s
 *
 * Server-side dispatcher for Circle W3S actions that require CIRCLE_API_KEY.
 * The API key must NEVER be exposed to the browser — all sensitive calls go
 * through this route.
 *
 * Supported actions:
 *  - createDeviceToken   → POST /v1/w3s/users/social/token
 */

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY ?? '';
const CIRCLE_BASE_URL =
  process.env.CIRCLE_BASE_URL ??
  (process.env.CIRCLE_ENV?.toLowerCase() === 'sandbox'
    ? 'https://api-sandbox.circle.com'
    : 'https://api.circle.com');

function circleHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${CIRCLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function circlePost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${CIRCLE_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: circleHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const raw = await res.text();

  let payload: { code?: number | string; data?: T; error?: string; message?: string };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`Circle returned non-JSON (${res.status}): ${raw.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = payload.error ?? payload.message ?? `Circle API error (${res.status})`;
    const err = new Error(msg) as Error & { code?: number | string; status?: number };
    err.code = payload.code;
    err.status = res.status;
    throw err;
  }

  return (payload.data ?? payload) as T;
}

// ─── Action handlers ──────────────────────────────────────────────────────────

async function handleCreateDeviceToken(
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const deviceId = typeof params.deviceId === 'string' ? params.deviceId.trim() : '';

  if (!deviceId) {
    throw new Error(
      'Missing required field: deviceId. ' +
        'Call sdk.getDeviceId() on the frontend before requesting a device token.',
    );
  }

  const data = await circlePost<{
    deviceToken?: string;
    deviceEncryptionKey?: string;
  }>('/v1/w3s/users/social/token', {
    deviceId,
    idempotencyKey: randomUUID(),
  });

  if (!data.deviceToken || !data.deviceEncryptionKey) {
    throw new Error(
      'Circle did not return deviceToken / deviceEncryptionKey. ' +
        'Verify CIRCLE_API_KEY and CIRCLE_APP_ID match the same app in Circle Console.',
    );
  }

  return {
    deviceToken: data.deviceToken,
    deviceEncryptionKey: data.deviceEncryptionKey,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!CIRCLE_API_KEY) {
    return NextResponse.json(
      {
        error:
          'CIRCLE_API_KEY is not configured on the server. ' +
          'Add it to .env.local and restart the dev server.',
      },
      { status: 500 },
    );
  }

  let body: { action?: string; params?: Record<string, unknown> };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, params = {} } = body;

  if (!action) {
    return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
  }

  try {
    let result: Record<string, unknown>;

    switch (action) {
      case 'createDeviceToken':
        result = await handleCreateDeviceToken(params);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code = (err as { code?: number | string }).code;
    const status = (err as { status?: number }).status ?? 500;

    return NextResponse.json({ error: message, code }, { status });
  }
}
