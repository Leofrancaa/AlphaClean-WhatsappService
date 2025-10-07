import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    service: "AlphaClean WhatsApp Service",
    version: "1.0.0",
    status: "online",
    endpoints: {
      health: "/health",
      whatsapp: {
        status: "/whatsapp/status",
        qr: "/whatsapp/qr",
        connect: "POST /whatsapp/connect",
        disconnect: "POST /whatsapp/disconnect",
        sendCompletion: "POST /whatsapp/send-completion",
        sendReminder: "POST /whatsapp/send-reminder",
        test: "POST /whatsapp/test"
      }
    },
    documentation: "https://github.com/Leofrancaa/AlphaClean-WhatsappService",
    timestamp: new Date().toISOString()
  });
}
