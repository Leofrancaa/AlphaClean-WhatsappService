import type { VercelRequest, VercelResponse } from '@vercel/node';
import whatsappService from '../../src/services/whatsappService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const qrCode = whatsappService.getCurrentQRCode();

    if (qrCode) {
      res.status(200).json({
        success: true,
        qrCode: qrCode,
        message: "QR Code disponível para escaneamento"
      });
    } else {
      const status = whatsappService.getConnectionStatus();
      res.status(200).json({
        success: false,
        qrCode: null,
        message: status.connected ? "WhatsApp já está conectado" : "QR Code não disponível. Tente conectar primeiro."
      });
    }
  } catch (error) {
    console.error("❌ Erro ao obter QR code:", error);
    res.status(500).json({
      success: false,
      qrCode: null,
      message: "Erro ao obter QR code"
    });
  }
}
