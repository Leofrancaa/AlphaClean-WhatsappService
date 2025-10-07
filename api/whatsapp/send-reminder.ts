import type { VercelRequest, VercelResponse } from '@vercel/node';
import whatsappService from '../../src/services/whatsappService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientName, clientPhone, serviceName, date, time } = req.body;

    if (!clientName || !clientPhone || !serviceName || !date || !time) {
      return res.status(400).json({
        error: "Missing required fields: clientName, clientPhone, serviceName, date, time"
      });
    }

    const success = await whatsappService.sendReminderNotification(
      clientName,
      clientPhone,
      serviceName,
      date,
      time
    );

    res.status(200).json({
      success,
      message: success ? "Reminder sent successfully" : "Failed to send reminder"
    });
  } catch (error) {
    console.error("Error sending reminder:", error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
}
