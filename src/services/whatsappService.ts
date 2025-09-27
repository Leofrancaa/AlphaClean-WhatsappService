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
  private qrCodeTimestamp: number | null = null;
  private isInitializing: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log('⚠️ WhatsApp já está sendo inicializado...');
      return;
    }

    if (this.isConnected) {
      console.log('✅ WhatsApp já está conectado!');
      return;
    }

    console.log('🔄 Inicializando serviço WhatsApp...');
    this.isInitializing = true;

    try {
      // Criar cliente WhatsApp com autenticação local
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: path.join(__dirname, '../.wwebjs_auth')
        }),
        puppeteer: {
          headless: true,
          timeout: 120000,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--memory-pressure-off',
            '--max-old-space-size=1024',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ]
        },
        qrMaxRetries: 5,
        qrTimeoutMs: 300000,
        session: 'whatsapp-session'
      });

      // Evento QR Code
      this.client.on('qr', (qr: string) => {
        this.qrCodeGenerated = qr;
        this.qrCodeTimestamp = Date.now();
        this.reconnectAttempts = 0;
        console.log('📱 QR Code para conectar WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('👆 Escaneie o QR code acima com seu WhatsApp');
        console.log('⏰ QR Code válido por aproximadamente 5 minutos');
      });

      // Evento de conexão pronta
      this.client.on('ready', () => {
        console.log('✅ WhatsApp conectado com sucesso!');
        this.isConnected = true;
        this.isReady = true;
        this.isInitializing = false;
        this.reconnectAttempts = 0;
        this.qrCodeGenerated = null;
        this.qrCodeTimestamp = null;
        this.clearReconnectInterval();
        this.startKeepAlive();
      });

      // Evento de autenticação bem-sucedida
      this.client.on('authenticated', () => {
        console.log('🔐 WhatsApp autenticado com sucesso!');
        this.isConnected = true;
        this.isInitializing = false;

        // Force check ready state after authentication
        setTimeout(() => {
          if (this.client && this.isConnected && !this.isReady) {
            console.log('🔄 Forçando verificação de estado após autenticação...');
            this.checkReadyState();
          }
        }, 3000);
      });

      // Evento de falha de autenticação
      this.client.on('auth_failure', (msg: string) => {
        console.error('❌ Falha na autenticação WhatsApp:', msg);
        this.isConnected = false;
        this.isReady = false;
        this.isInitializing = false;
      });

      // Evento de desconexão
      this.client.on('disconnected', (reason: string) => {
        console.log('❌ WhatsApp desconectado:', reason);
        this.isConnected = false;
        this.isReady = false;
        this.isInitializing = false;
        this.qrCodeGenerated = null;
        this.qrCodeTimestamp = null;
        this.stopKeepAlive();

        // Tentar reconectar automaticamente
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          console.log('❌ Máximo de tentativas de reconexão atingido');
        }
      });

      // Evento de mensagem recebida (opcional - para logs)
      this.client.on('message', (message: any) => {
        console.log('📩 Mensagem recebida de:', message.from);

        // If we receive a message, we're definitely connected and ready
        if (!this.isReady) {
          console.log('✅ Mensagem recebida - WhatsApp está pronto!');
          this.isReady = true;
          this.isConnected = true;
          this.qrCodeGenerated = null;
          this.qrCodeTimestamp = null;
        }
      });

      // Evento de mudança de estado
      this.client.on('change_state', (state: string) => {
        console.log('🔄 Estado mudou para:', state);
        if (state === 'CONNECTED' && !this.isReady) {
          console.log('✅ Estado mudou para CONNECTED - marcando como pronto!');
          this.isReady = true;
          this.isConnected = true;
          this.qrCodeGenerated = null;
          this.qrCodeTimestamp = null;
          this.reconnectAttempts = 0;
        }
      });

      // Evento de loading screen
      this.client.on('loading_screen', (percent: number, message: string) => {
        console.log(`⏳ Carregando WhatsApp: ${percent}% - ${message}`);
        if (percent === 100) {
          setTimeout(() => this.checkReadyState(), 2000);
        }
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
    if (cleanPhone.startsWith('55')) {
      if (cleanPhone.length === 13) {
        // Números brasileiros com 13 dígitos (55 + 2 DDD + 9 + 8 números)
        const ddd = cleanPhone.substring(2, 4);
        const ninthDigit = cleanPhone.substring(4, 5);
        const phoneNumber = cleanPhone.substring(5);

        // Se o 5º dígito é 9 (nono dígito), remover para compatibilidade WhatsApp
        if (ninthDigit === '9' && phoneNumber.length === 8) {
          cleanPhone = '55' + ddd + phoneNumber;
          console.log(`📱 Removido 9º dígito brasileiro (formato 13): "${cleanPhone}"`);
        }
      } else if (cleanPhone.length === 12) {
        // Números brasileiros com 12 dígitos (55 + 2 DDD + 8 números) - já no formato correto
        console.log(`📱 Número brasileiro já no formato correto (12 dígitos): "${cleanPhone}"`);
      } else if (cleanPhone.length === 11) {
        // Número brasileiro sem código do país, verificar se tem 9º dígito
        const ddd = cleanPhone.substring(0, 2);
        const ninthDigit = cleanPhone.substring(2, 3);
        const phoneNumber = cleanPhone.substring(3);

        if (ninthDigit === '9' && phoneNumber.length === 8) {
          // Remover 9º dígito e adicionar código do país
          cleanPhone = '55' + ddd + phoneNumber;
          console.log(`📱 Removido 9º dígito brasileiro (formato 11): "${cleanPhone}"`);
        } else {
          // Apenas adicionar código do país
          cleanPhone = '55' + cleanPhone;
          console.log(`📱 Adicionado código do país (formato 11): "${cleanPhone}"`);
        }
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
    if (this.isReady && this.isConnected) {
      return {
        connected: true,
        message: 'WhatsApp conectado e pronto para uso'
      };
    } else if (this.isConnected && !this.isReady) {
      return {
        connected: false,
        message: 'WhatsApp autenticado, aguardando sincronização...'
      };
    } else if (this.qrCodeGenerated) {
      // Check if QR code is expired (more than 2 minutes)
      const qrAge = this.qrCodeTimestamp ? (Date.now() - this.qrCodeTimestamp) / 1000 : 0;
      if (qrAge > 120) {
        return {
          connected: false,
          message: 'QR Code expirado. Clique em "Conectar WhatsApp" para gerar novo.'
        };
      }
      return {
        connected: false,
        message: 'QR Code gerado. Escaneie para conectar.'
      };
    } else if (this.isInitializing) {
      return {
        connected: false,
        message: 'Inicializando WhatsApp... Aguarde.'
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
      this.clearReconnectInterval();
      this.stopKeepAlive();
      await this.client.destroy();
      this.client = null;
      this.isConnected = false;
      this.isReady = false;
      this.qrCodeGenerated = null;
      this.qrCodeTimestamp = null;
      this.reconnectAttempts = 0;
    }
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(async () => {
      if (this.client) {
        try {
          const state = await this.client.getState();
          console.log('💓 Keep-alive: Estado atual =', state);

          // Update connection status based on actual state
          switch (state) {
            case 'CONNECTED':
              if (!this.isConnected || !this.isReady) {
                console.log('✅ WhatsApp reconectado automaticamente via keep-alive!');
                this.isConnected = true;
                this.isReady = true;
                this.qrCodeGenerated = null;
                this.qrCodeTimestamp = null;
                this.reconnectAttempts = 0;
              }
              break;
            case 'OPENING':
            case 'PAIRING':
              if (!this.isConnected) {
                console.log('🔄 WhatsApp conectando via keep-alive...');
                this.isConnected = true;
              }
              this.isReady = false;
              break;
            case 'UNPAIRED':
            case 'UNPAIRED_IDLE':
              if (this.isConnected || this.isReady) {
                console.log('⚠️ WhatsApp desemparelhado detectado via keep-alive');
                this.isConnected = false;
                this.isReady = false;
                this.qrCodeGenerated = null;
                this.qrCodeTimestamp = null;
              }
              break;
            default:
              if (this.isConnected || this.isReady) {
                console.log('⚠️ WhatsApp desconectado detectado via keep-alive:', state);
                this.isConnected = false;
                this.isReady = false;
              }
              break;
          }
        } catch (error) {
          console.log('❌ Keep-alive falhou:', error);
          if (this.isConnected || this.isReady) {
            console.log('⚠️ Marcando como desconectado devido a erro');
            this.isConnected = false;
            this.isReady = false;
          }
        }
      }
    }, 5000); // Check every 5s for faster detection
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectAttempts * 5000, 30000);

    console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay/1000}s...`);

    this.clearReconnectInterval();
    this.reconnectInterval = setTimeout(async () => {
      if (!this.isConnected && this.client) {
        try {
          console.log('🔄 Reinicializando cliente WhatsApp...');
          await this.client.destroy();
          this.client = null;
          await this.initialize();
        } catch (error) {
          console.error('❌ Erro na reconexão:', error);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        }
      }
    }, delay);
  }

  private clearReconnectInterval(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  private async checkReadyState(): Promise<void> {
    if (!this.client) return;

    try {
      const state = await this.client.getState();
      console.log('🔍 Estado atual verificado:', state);

      switch (state) {
        case 'CONNECTED':
          if (!this.isReady) {
            console.log('✅ WhatsApp detectado como CONNECTED - marcando como pronto!');
            this.isReady = true;
            this.isConnected = true;
            this.qrCodeGenerated = null;
            this.qrCodeTimestamp = null;
            this.reconnectAttempts = 0;
          }
          break;
        case 'OPENING':
          console.log('🔄 WhatsApp ainda abrindo...');
          this.isConnected = true;
          this.isReady = false;
          break;
        case 'PAIRING':
          console.log('📱 WhatsApp em processo de pareamento...');
          this.isConnected = true;
          this.isReady = false;
          break;
        default:
          console.log('⚠️ Estado inesperado:', state);
          break;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar estado:', error);
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