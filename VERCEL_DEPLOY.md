# Deploy WhatsApp Service na Vercel

## ⚠️ AVISOS IMPORTANTES

### Limitações da Vercel:
1. **Memória**: 1024MB máximo (com Pro plan)
2. **Timeout**: 60s máximo por função serverless
3. **Stateless**: Cada request pode ser em instância diferente
4. **Chromium**: A Vercel não tem Chromium instalado por padrão

### Problemas Esperados:
- ❌ **Alto consumo de memória** - Puppeteer + Chrome usa facilmente 500-800MB
- ❌ **Sessão não persistente** - LocalAuth pode não funcionar entre deploys
- ❌ **Cold starts lentos** - Primeira request pode levar >30s
- ⚠️ **QR Code expira** - Ambiente serverless não mantém conexão ativa

## 📋 Passos para Deploy

### 1. Instalar Vercel CLI
```bash
npm install -g vercel
```

### 2. Fazer login na Vercel
```bash
vercel login
```

### 3. Configurar variáveis de ambiente
Na dashboard da Vercel ou via CLI:
```bash
vercel env add MAIN_API_URL
vercel env add WHATSAPP_SESSION_NAME
vercel env add NODE_ENV
vercel env add CORS_ORIGINS
```

Valores:
- `MAIN_API_URL`: https://alpha-clean-backend-reservation.vercel.app
- `WHATSAPP_SESSION_NAME`: alpha-clean-production
- `NODE_ENV`: production
- `CORS_ORIGINS`: https://alpha-clean-pearl.vercel.app,https://alpha-clean-backend-reservation.vercel.app

### 4. Deploy
```bash
cd AlphaClean-WhatsappService
vercel --prod
```

## 🧪 Testando após Deploy

### 1. Health Check
```bash
curl https://seu-app.vercel.app/health
```

### 2. Conectar WhatsApp
```bash
curl -X POST https://seu-app.vercel.app/whatsapp/connect
```

### 3. Verificar Status
```bash
curl https://seu-app.vercel.app/whatsapp/status
```

### 4. Obter QR Code
```bash
curl https://seu-app.vercel.app/whatsapp/qr
```

## 🔧 Alternativas Recomendadas

### Railway.app (RECOMENDADO)
✅ Suporta aplicações stateful
✅ Memória adequada (até 8GB)
✅ Conexão persistente
✅ $5/mês gratuito

Deploy:
```bash
# 1. Criar conta em railway.app
# 2. Conectar repositório GitHub
# 3. Configurar variáveis de ambiente
# 4. Deploy automático!
```

### Fly.io
✅ Free tier generoso
✅ Suporta Docker
✅ Boa performance

### Render.com
✅ Free tier disponível
✅ Fácil configuração
⚠️ Consome muita memória (seu caso)

## 🐛 Troubleshooting

### Erro: "Cannot find module 'puppeteer'"
```bash
npm install puppeteer
```

### Erro: "Chromium not found"
A Vercel não tem Chromium. Considere usar:
- `chrome-aws-lambda` (alternativa para AWS Lambda/Vercel)
- Ou migrar para Railway/Fly.io

### Erro: "Function exceeded memory limit"
- Reduza `--max-old-space-size` no whatsappService.ts
- Upgrade para Vercel Pro ($20/mês) para 1024MB
- **Ou migre para Railway** (recomendado)

## 📊 Comparação de Plataformas

| Plataforma | Memória | Stateful | Preço Free | Recomendado |
|------------|---------|----------|------------|-------------|
| Vercel     | 512MB   | ❌       | Sim        | ❌          |
| Railway    | 8GB     | ✅       | $5/mês     | ✅✅✅       |
| Fly.io     | 256MB   | ✅       | Sim        | ✅✅        |
| Render     | 512MB   | ✅       | Sim        | ⚠️          |

## 💡 Recomendação Final

**Use Railway.app** para este projeto. A Vercel não é adequada para:
- Aplicações que mantêm conexões WebSocket/WhatsApp
- Alto consumo de memória (Puppeteer/Chromium)
- Necessidade de persistência de sessão

O código está pronto para Vercel, mas a experiência será melhor no Railway.
