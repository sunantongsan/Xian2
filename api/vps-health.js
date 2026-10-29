// Fixed, public readiness probe. This endpoint cannot execute VPS commands.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ok: false});
  }
  try {
    const upstream = await fetch('https://game.guardscan.xyz/health', {
      signal: AbortSignal.timeout(5000),
      redirect: 'error'
    });
    const valid = upstream.ok && (await upstream.text()).trim() === 'Cockro internal test server';
    return res.status(valid ? 200 : 502).json({ok: valid, service: 'cockro-vps'});
  } catch {
    return res.status(503).json({ok: false, service: 'cockro-vps'});
  }
}
