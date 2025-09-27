import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

// Services
import whatsappService from "./services/whatsappService";

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(helmet());
app.use(cors({
  origin: [
    process.env.MAIN_API_URL || "http://localhost:3001",
    "https://alpha-clean-pearl.vercel.app",
    "http://localhost:3000"
  ],
  credentials: true
}));
app.use(morgan("combined"));
app.use(express.json());

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "AlphaClean WhatsApp Service",
    timestamp: new Date().toISOString()
  });
});

// WhatsApp status
app.get("/whatsapp/status", (req: Request, res: Response) => {
  const status = whatsappService.getConnectionStatus();
  res.json(status);
});

// Get QR Code
app.get("/whatsapp/qr", (req: Request, res: Response) => {
  const qrCode = whatsappService.getCurrentQRCode();

  if (qrCode) {
    res.json({
      success: true,
      qrCode: qrCode,
      message: "QR Code available for scanning"
    });
  } else {
    res.json({
      success: false,
      qrCode: null,
      message: "QR Code not available. Try connecting first."
    });
  }
});

// Connect WhatsApp
app.post("/whatsapp/connect", async (req: Request, res: Response) => {
  try {
    await whatsappService.initialize();
    res.json({ message: "WhatsApp initialization started" });
  } catch (error) {
    console.error("Error initializing WhatsApp:", error);
    res.status(500).json({ error: "Failed to initialize WhatsApp" });
  }
});

// Disconnect WhatsApp
app.post("/whatsapp/disconnect", async (req: Request, res: Response) => {
  try {
    await whatsappService.disconnect();
    res.json({ message: "WhatsApp disconnected" });
  } catch (error) {
    console.error("Error disconnecting WhatsApp:", error);
    res.status(500).json({ error: "Failed to disconnect WhatsApp" });
  }
});

// Send service completion notification
app.post("/whatsapp/send-completion", async (req: Request, res: Response) => {
  try {
    const { clientName, clientPhone, serviceName, vehicleModel, licensePlate } = req.body;

    if (!clientName || !clientPhone || !serviceName) {
      return res.status(400).json({
        error: "Missing required fields: clientName, clientPhone, serviceName"
      });
    }

    const success = await whatsappService.sendServiceCompletedNotification(
      clientName,
      clientPhone,
      serviceName,
      vehicleModel,
      licensePlate
    );

    res.json({
      success,
      message: success ? "Notification sent successfully" : "Failed to send notification"
    });
  } catch (error) {
    console.error("Error sending completion notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Send reminder notification
app.post("/whatsapp/send-reminder", async (req: Request, res: Response) => {
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

    res.json({
      success,
      message: success ? "Reminder sent successfully" : "Failed to send reminder"
    });
  } catch (error) {
    console.error("Error sending reminder:", error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});

// Send test message
app.post("/whatsapp/test", async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const success = await whatsappService.testMessage(phoneNumber);

    res.json({
      success,
      message: success ? "Test message sent successfully" : "Failed to send test message"
    });
  } catch (error) {
    console.error("Error sending test message:", error);
    res.status(500).json({ error: "Failed to send test message" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AlphaClean WhatsApp Service running on port ${PORT}`);
  console.log(`🔗 Main API URL: ${process.env.MAIN_API_URL}`);
  console.log(`📱 WhatsApp service ready. Use /whatsapp/connect to initialize.`);
});

export default app;