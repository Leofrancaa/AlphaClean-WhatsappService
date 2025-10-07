import { Router } from 'express';
import whatsappService from '../services/whatsappService';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const status = whatsappService.getConnectionStatus();
    res.json({
      success: true,
      connected: status.connected,
      message: status.message
    });
  } catch (error) {
    console.error('❌ Erro ao verificar status WhatsApp:', error);
    res.status(500).json({
      success: false,
      connected: false,
      message: 'Erro ao verificar status do WhatsApp'
    });
  }
});

router.get('/qr', async (req, res) => {
  try {
    const qrCode = whatsappService.getCurrentQRCode();
    if (qrCode) {
      res.json({
        success: true,
        qrCode: qrCode,
        message: 'QR Code disponível'
      });
    } else {
      res.json({
        success: false,
        qrCode: null,
        message: 'QR Code não disponível. WhatsApp pode já estar conectado ou aguardando inicialização.'
      });
    }
  } catch (error) {
    console.error('❌ Erro ao obter QR code:', error);
    res.status(500).json({
      success: false,
      qrCode: null,
      message: 'Erro ao obter QR code'
    });
  }
});

router.post('/connect', async (req, res) => {
  try {
    await whatsappService.initialize();
    res.json({
      success: true,
      message: 'WhatsApp inicializando... Aguarde QR code ou conexão automática.'
    });
  } catch (error) {
    console.error('❌ Erro ao conectar WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao inicializar WhatsApp'
    });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao desconectar WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desconectar WhatsApp'
    });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        message: 'Número de telefone é obrigatório'
      });
      return;
    }

    const sent = await whatsappService.testMessage(phoneNumber);

    res.json({
      success: sent,
      message: sent
        ? 'Mensagem de teste enviada com sucesso!'
        : 'Falha ao enviar mensagem de teste. Verifique se o WhatsApp está conectado.'
    });
  } catch (error) {
    console.error('❌ Erro ao enviar teste:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

router.post('/send-completion', async (req, res) => {
  try {
    const { clientName, clientPhone, serviceName, vehicleModel, licensePlate } = req.body;

    if (!clientName || !clientPhone || !serviceName) {
      res.status(400).json({
        success: false,
        message: 'Nome do cliente, telefone e nome do serviço são obrigatórios'
      });
      return;
    }

    const sent = await whatsappService.sendServiceCompletedNotification(
      clientName,
      clientPhone,
      serviceName,
      vehicleModel,
      licensePlate
    );

    res.json({
      success: sent,
      message: sent
        ? 'Notificação de conclusão enviada com sucesso!'
        : 'Falha ao enviar notificação. Verifique se o WhatsApp está conectado.'
    });
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de conclusão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

router.post('/send-reminder', async (req, res) => {
  try {
    const { clientName, clientPhone, serviceName, date, time } = req.body;

    if (!clientName || !clientPhone || !serviceName || !date || !time) {
      res.status(400).json({
        success: false,
        message: 'Todos os campos são obrigatórios'
      });
      return;
    }

    const sent = await whatsappService.sendReminderNotification(
      clientName,
      clientPhone,
      serviceName,
      date,
      time
    );

    res.json({
      success: sent,
      message: sent
        ? 'Lembrete enviado com sucesso!'
        : 'Falha ao enviar lembrete. Verifique se o WhatsApp está conectado.'
    });
  } catch (error) {
    console.error('❌ Erro ao enviar lembrete:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

export default router;