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
  try {
    const status = whatsappService.getConnectionStatus();
    res.json({
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
});

// Get QR Code
app.get("/whatsapp/qr", (req: Request, res: Response) => {
  try {
    const qrCode = whatsappService.getCurrentQRCode();

    if (qrCode) {
      res.json({
        success: true,
        qrCode: qrCode,
        message: "QR Code disponível para escaneamento"
      });
    } else {
      const status = whatsappService.getConnectionStatus();
      res.json({
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
});

// Connect WhatsApp
app.post("/whatsapp/connect", async (req: Request, res: Response) => {
  try {
    await whatsappService.initialize();
    res.json({
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

    res.json({
      success,
      message: success ? "Notification sent successfully" : "Failed to send notification",
      duration: `${duration}ms`
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error sending completion notification after ${duration}ms:`, error);
    res.status(500).json({ error: "Failed to send notification", duration: `${duration}ms` });
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

// Debug endpoint
app.get("/whatsapp/debug", (req: Request, res: Response) => {
  try {
    const status = whatsappService.getConnectionStatus();
    const qrCode = whatsappService.getCurrentQRCode();

    res.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        status: status,
        hasQRCode: !!qrCode,
        qrCodeLength: qrCode ? qrCode.length : 0,
        // Raw internal state (for debugging only)
        internal: {
          isConnected: (whatsappService as any).isConnected,
          isReady: (whatsappService as any).isReady,
          isInitializing: (whatsappService as any).isInitializing,
          hasClient: !!(whatsappService as any).client,
          qrTimestamp: (whatsappService as any).qrCodeTimestamp
        }
      }
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: "Debug failed" });
  }
});

// Force reconnect endpoint
app.post("/whatsapp/force-reconnect", async (req: Request, res: Response) => {
  try {
    console.log("🔄 Force reconnect requested");
    await whatsappService.disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    await whatsappService.initialize();

    res.json({
      success: true,
      message: "Force reconnect initiated"
    });
  } catch (error) {
    console.error("Force reconnect error:", error);
    res.status(500).json({ error: "Force reconnect failed" });
  }
});

// Keep service alive (prevent Render hibernation)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    fetch(`${process.env.RENDER_EXTERNAL_URL || 'https://alphaclean-whatsappservice.onrender.com'}/health`, {
      signal: AbortSignal.timeout(5000) // 5s timeout
    })
      .then(() => console.log('💓 Keep-alive ping sent'))
      .catch(() => console.log('❌ Keep-alive ping failed'));
  }, 10 * 60 * 1000); // Every 10 minutes (more frequent)
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AlphaClean WhatsApp Service running on port ${PORT}`);
  console.log(`🔗 Main API URL: ${process.env.MAIN_API_URL}`);
  console.log(`📱 WhatsApp service ready. Use /whatsapp/connect to initialize.`);

  // Initialize WhatsApp on startup in production
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      whatsappService.initialize().catch(err =>
        console.log('⚠️ Failed to auto-initialize WhatsApp:', err)
      );
    }, 5000); // Wait 5s after server start
  }
});

export default app;