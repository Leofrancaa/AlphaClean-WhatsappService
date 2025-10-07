import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "ok",
    service: "AlphaClean WhatsApp Service",
    timestamp: new Date().toISOString(),
    vercel: true
  });
}
