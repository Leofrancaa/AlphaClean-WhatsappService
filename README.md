# AlphaClean WhatsApp Service

Serviço separado para gerenciar notificações WhatsApp do sistema Alpha Clean.

## Funcionalidades

- 📱 Conexão com WhatsApp Web
- 🎉 Notificações de serviço concluído
- ⏰ Lembretes de agendamento
- 🧪 Mensagens de teste
- 📊 Status de conexão

## Deploy no Render

### 1. Configurar no Render:

1. Conecte seu repositório
2. Escolha **Web Service**
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18+

### 2. Variáveis de Ambiente:

```
NODE_ENV=production
PORT=10000
MAIN_API_URL=https://seu-backend-principal.vercel.app
WHATSAPP_SESSION_NAME=alpha-clean-session
```

### 3. Endpoints Disponíveis:

- `GET /health` - Health check
- `GET /whatsapp/status` - Status da conexão
- `POST /whatsapp/connect` - Conectar WhatsApp
- `POST /whatsapp/disconnect` - Desconectar
- `POST /whatsapp/send-completion` - Notificação de conclusão
- `POST /whatsapp/send-reminder` - Lembrete
- `POST /whatsapp/test` - Mensagem de teste

## Uso no Backend Principal

Para usar este serviço no seu backend principal, faça chamadas HTTP:

```typescript
// Enviar notificação de conclusão
const response = await fetch(`${WHATSAPP_SERVICE_URL}/whatsapp/send-completion`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientName: 'João Silva',
    clientPhone: '71999661709',
    serviceName: 'Lavagem Completa',
    vehicleModel: 'Honda Civic',
    licensePlate: 'ABC-1234'
  })
});
```

## Primeira Conexão

1. Após o deploy, acesse os logs do Render
2. Procure pelo QR Code no console
3. Escaneie com o WhatsApp do seu celular
4. O serviço ficará conectado permanentemente