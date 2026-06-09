import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type Body = { email?: string; role?: string };

/**
 * Waitlist endpoint.
 *
 * Offline-first design:
 * - Always append to a local JSONL file (./data/waitlist.jsonl) — survives
 *   restarts on Vercel only if you mount a volume, but is great for dev.
 * - If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are set, also forward to a
 *   `waitlist` table (TODO: migration in supabase/migrations/0002_waitlist.sql).
 *
 * Wire to ConvertKit/Mailchimp later by adding a webhook fan-out here.
 */

const DATA_PATH = path.join(process.cwd(), 'data', 'waitlist.jsonl');

async function appendLocal(entry: object) {
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.appendFile(DATA_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.warn('[waitlist] local append failed', err);
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const role = (body.role ?? '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const entry = {
    email,
    role,
    submitted_at: new Date().toISOString(),
    ip: req.headers.get('x-forwarded-for') ?? null,
    ua: req.headers.get('user-agent') ?? null,
  };

  await appendLocal(entry);
  return NextResponse.json({ ok: true });
}
