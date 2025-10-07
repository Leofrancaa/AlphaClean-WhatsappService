import type { VercelRequest, VercelResponse } from '@vercel/node';
import whatsappService from '../../src/services/whatsappService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const success = await whatsappService.testMessage(phoneNumber);

    res.status(200).json({
      success,
      message: success ? "Test message sent successfully" : "Failed to send test message"
    });
  } catch (error) {
    console.error("Error sending test message:", error);
    res.status(500).json({ error: "Failed to send test message" });
  }
}
