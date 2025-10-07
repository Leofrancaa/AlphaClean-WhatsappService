import type { VercelRequest, VercelResponse } from '@vercel/node';
import whatsappService from '../../src/services/whatsappService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const status = whatsappService.getConnectionStatus();
    res.status(200).json({
      success: true,
      connected: status.connected,
      message: status.message
    });
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error);
    res.status(500).json({
      success: false,
      connected: false,
      message: "Erro ao verificar status do WhatsApp"
    });
  }
}
