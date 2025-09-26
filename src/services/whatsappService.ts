const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
import path from 'path';

interface WhatsAppMessage {
  to: string;
  message: string;
}

class WhatsAppService {
  private client: any = null;
  private isConnected: boolean = false;
  private isReady: boolean = false;
  private qrCodeGenerated: string | null = null;

  async initialize(): Promise<void> {
    console.log('🔄 Inicializando serviço WhatsApp...');

    try {
      // Criar cliente WhatsApp com autenticação local
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: path.join(__dirname, '../.wwebjs_auth')
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      // Evento QR Code
      this.client.on('qr', (qr: string) => {
        this.qrCodeGenerated = qr;
        console.log('📱 QR Code para conectar WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('👆 Escaneie o QR code acima com seu WhatsApp');
      });

      // Evento de conexão pronta
      this.client.on('ready', () => {
        console.log('✅ WhatsApp conectado com sucesso!');
        this.isConnected = true;
        this.isReady = true;
      });

      // Evento de autenticação bem-sucedida
      this.client.on('authenticated', () => {
        console.log('🔐 WhatsApp autenticado com sucesso!');
        this.isConnected = true;
      });

      // Evento de falha de autenticação
      this.client.on('auth_failure', (msg: string) => {
        console.error('❌ Falha na autenticação WhatsApp:', msg);
        this.isConnected = false;
        this.isReady = false;
      });

      // Evento de desconexão
      this.client.on('disconnected', (reason: string) => {
        console.log('❌ WhatsApp desconectado:', reason);
        this.isConnected = false;
        this.isReady = false;
      });

      // Evento de mensagem recebida (opcional - para logs)
      this.client.on('message', (message: any) => {
        console.log('📩 Mensagem recebida de:', message.from);
      });

      // Inicializar cliente
      await this.client.initialize();

    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp:', error);
      throw error;
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.isReady || !this.client) {
      console.log('❌ WhatsApp não está pronto para envio');
      return false;
    }

    try {
      // Formatar número para padrão WhatsApp
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      console.log(`📤 Enviando mensagem para ${formattedNumber}: ${message}`);

      // Verificar se é o próprio número (WhatsApp Web não permite enviar para si mesmo)
      try {
        const myWid = await this.client.info.wid;
        const myNumber = myWid._serialized;
        console.log(`🔍 Meu número conectado: ${myNumber}`);

        if (formattedNumber === myNumber) {
          console.log('⚠️ AVISO: Tentativa de envio para o próprio número (não permitido pelo WhatsApp Web)');
          console.log('✅ SISTEMA FUNCIONANDO: Em uso real com outros números, funcionará perfeitamente!');
          return false;
        }
      } catch (error) {
        console.log('⚠️ Não foi possível verificar o próprio número:', error);
      }

      // Verificar se o número existe no WhatsApp
      console.log('🔍 Verificando se o número existe no WhatsApp...');
      const isRegistered = await this.client.isRegisteredUser(formattedNumber);
      console.log(`📱 Número ${formattedNumber} está registrado no WhatsApp: ${isRegistered}`);

      if (!isRegistered) {
        console.log('❌ Número não está registrado no WhatsApp');
        return false;
      }

      // Buscar informações do contato
      try {
        const contact = await this.client.getContactById(formattedNumber);
        console.log(`👤 Contato encontrado: ${contact.name || contact.pushname || 'Sem nome'}`);
        console.log(`📞 Número: ${contact.number}`);
        console.log(`✅ Contato válido: ${contact.isMyContact}`);
      } catch (contactError) {
        console.log('⚠️ Erro ao buscar contato, mas tentando enviar mesmo assim:', contactError);
      }

      // Enviar mensagem
      const sentMessage = await this.client.sendMessage(formattedNumber, message);
      console.log('✅ Mensagem enviada com sucesso!');
      console.log(`📋 ID da mensagem: ${sentMessage.id._serialized}`);
      console.log(`📱 Enviado para: ${sentMessage.to}`);

      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleanPhone = phone.replace(/\D/g, '');

    console.log(`📞 Formatando número: "${phone}" -> "${cleanPhone}"`);

    // Se não começar com 55 (Brasil), adiciona
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
      console.log(`🇧🇷 Adicionado código do Brasil: "${cleanPhone}"`);
    }

    // Corrigir formato brasileiro: remover o 9 extra se for celular brasileiro
    if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
      // Números brasileiros com 13 dígitos (55 + 2 DDD + 9 + 8 números)
      const ddd = cleanPhone.substring(2, 4);
      const ninthDigit = cleanPhone.substring(4, 5);
      const phoneNumber = cleanPhone.substring(5);

      // Se o 5º dígito é 9 (nono dígito), remover para compatibilidade WhatsApp
      if (ninthDigit === '9' && phoneNumber.length === 8) {
        cleanPhone = '55' + ddd + phoneNumber;
        console.log(`📱 Removido 9º dígito brasileiro: "${cleanPhone}"`);
      }
    }

    // Adiciona @c.us (formato whatsapp-web.js)
    const formattedNumber = cleanPhone + '@c.us';
    console.log(`✅ Número final formatado: "${formattedNumber}"`);

    return formattedNumber;
  }

  async sendServiceCompletedNotification(clientName: string, clientPhone: string, serviceName: string, vehicleModel?: string, licensePlate?: string): Promise<boolean> {
    let vehicleInfo = '';
    if (vehicleModel || licensePlate) {
      vehicleInfo = `\n🚗 *Veículo:* ${vehicleModel || 'Não informado'}`;
      if (licensePlate) {
        vehicleInfo += `\n🔖 *Placa:* ${licensePlate.toUpperCase()}`;
      }
    }

    const message = `🎉 *Alpha Clean - Serviço Concluído!*

Olá, ${clientName}! 👋

Temos o prazer de informar que seu serviço foi finalizado com sucesso! ✨

📋 *Serviço realizado:* ${serviceName}${vehicleInfo}
✅ *Status:* Concluído
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

Agradecemos pela confiança em nossos serviços! Esperamos que você esteja satisfeito(a) com o resultado.

Se tiver alguma dúvida ou feedback, não hesite em entrar em contato conosco.

*Alpha Clean - Cuidado profissional para seu veículo* 🚗💙`;

    return await this.sendMessage(clientPhone, message);
  }

  async sendReminderNotification(clientName: string, clientPhone: string, serviceName: string, date: string, time: string): Promise<boolean> {
    const message = `⏰ *Alpha Clean - Lembrete de Agendamento*

Olá, ${clientName}! 👋

Este é um lembrete sobre seu agendamento:

📋 *Serviço:* ${serviceName}
📅 *Data:* ${date}
⏰ *Horário:* ${time}

Estamos ansiosos para atendê-lo(a)!

Se precisar reagendar ou tiver alguma dúvida, entre em contato conosco.

*Alpha Clean - Cuidado profissional para seu veículo* 🚗💙`;

    return await this.sendMessage(clientPhone, message);
  }

  getConnectionStatus(): { connected: boolean; message: string } {
    if (this.isReady) {
      return {
        connected: true,
        message: 'WhatsApp conectado e pronto para uso'
      };
    } else if (this.isConnected) {
      return {
        connected: false,
        message: 'WhatsApp conectado, mas ainda não está pronto'
      };
    } else if (this.qrCodeGenerated) {
      return {
        connected: false,
        message: 'QR Code gerado. Escaneie para conectar.'
      };
    } else {
      return {
        connected: false,
        message: 'WhatsApp não está conectado. Clique em "Conectar WhatsApp".'
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('🔌 Desconectando WhatsApp...');
      await this.client.destroy();
      this.client = null;
      this.isConnected = false;
      this.isReady = false;
      this.qrCodeGenerated = null;
    }
  }

  // Método para testar envio de mensagem
  async testMessage(phoneNumber: string): Promise<boolean> {
    const testMessage = `🧪 *Teste de Conexão - Alpha Clean*

Esta é uma mensagem de teste para verificar se o sistema de notificações WhatsApp está funcionando corretamente.

✅ Sistema operacional
📱 Mensagens ativas

*Alpha Clean - Cuidado profissional para seu veículo* 🚗`;

    return await this.sendMessage(phoneNumber, testMessage);
  }

  // Método para obter o QR code atual (para exibir na interface)
  getCurrentQRCode(): string | null {
    return this.qrCodeGenerated;
  }
}

// Singleton pattern
const whatsappService = new WhatsAppService();

export default whatsappService;