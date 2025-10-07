import type { VercelRequest, VercelResponse } from '@vercel/node';
import whatsappService from '../../src/services/whatsappService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  try {
    console.log(`🚀 [${new Date().toISOString()}] WhatsApp completion request received`);
    const { clientName, clientPhone, serviceName, vehicleModel, licensePlate } = req.body;

    console.log(`📋 Request data: clientName=${clientName}, clientPhone=${clientPhone}, serviceName=${serviceName}`);

    if (!clientName || !clientPhone || !serviceName) {
      console.log(`❌ Missing required fields`);
      return res.status(400).json({
        error: "Missing required fields: clientName, clientPhone, serviceName"
      });
    }

    console.log(`📤 Starting WhatsApp notification send...`);
    const success = await whatsappService.sendServiceCompletedNotification(
      clientName,
      clientPhone,
      serviceName,
      vehicleModel,
      licensePlate
    );

    const duration = Date.now() - startTime;
    console.log(`✅ WhatsApp notification completed in ${duration}ms. Success: ${success}`);

    res.status(200).json({
      success,
      message: success ? "Notification sent successfully" : "Failed to send notification",
      duration: `${duration}ms`
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error sending completion notification after ${duration}ms:`, error);
    res.status(500).json({ error: "Failed to send notification", duration: `${duration}ms` });
  }
}
