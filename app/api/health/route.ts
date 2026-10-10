import { connection } from 'next/server';

// Liveness only. Dependency diagnostics belong to the private operator probe.
export async function GET() {
  await connection();
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
