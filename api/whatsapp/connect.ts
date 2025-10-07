import type { VercelRequest, VercelResponse } from '@vercel/node';
import whatsappService from '../../src/services/whatsappService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await whatsappService.initialize();
    res.status(200).json({
      success: true,
      message: "WhatsApp inicializando... Aguarde QR code ou conexão automática."
    });
  } catch (error) {
    console.error("❌ Erro ao inicializar WhatsApp:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao inicializar WhatsApp"
    });
  }
}
