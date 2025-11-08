# 🚀 Quick Start - SyncBoard Pro

Guia rápido para colocar o SyncBoard Pro funcionando em menos de 5 minutos!

## ⚡ Início Rápido (5 Minutos)

### 1️⃣ Instalar Dependências

```bash
# Terminal 1 - Servidor WebSocket
cd websocket-server
npm install

# Terminal 2 - Frontend
cd frontend
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente (Opcional)

```bash
# No diretório frontend/
cp .env.local.example .env.local

# Editar se necessário (o padrão já funciona)
# NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### 3️⃣ Iniciar os Servidores

```bash
# Terminal 1 - Servidor WebSocket
cd websocket-server
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4️⃣ Abrir no Navegador

Abra: **http://localhost:3000**

🎉 **Pronto!** O SyncBoard Pro está rodando!

---

## 🧪 Teste Rápido de Sincronização

Valide que está funcionando:

### Teste em 60 Segundos:

1. **Aba 1**: Abra `http://localhost:3000`
   - Clique em "🧪 Entrar em Sala de Teste (test-room-1)"
   - Nome: "Alice"
   - Papel: Editor
   - Clique em "Entrar no Quadro 🚀"

2. **Aba 2**: Em outra aba/janela, abra `http://localhost:3000`
   - Clique em "🧪 Entrar em Sala de Teste (test-room-1)"
   - Nome: "Bob"
   - Papel: Editor
   - Clique em "Entrar no Quadro 🚀"

3. **Na Aba 1 (Alice)**:
   - Clique em "📝 Nota Adesiva"
   - Clique em qualquer lugar do quadro

4. **Na Aba 2 (Bob)**:
   - Você deve ver a nota criada por Alice **instantaneamente**! ⚡

5. **Mova o mouse na Aba 1**:
   - Você deve ver o cursor de Alice na Aba 2

✅ **Funcionou?** Parabéns! A sincronização está operacional!

---

## 🔥 Testes Avançados

### Teste de Race Condition
```
1. Entre em qualquer quadro como Editor
2. Clique no botão "🏁 Race Test"
3. Veja os logs no console do navegador
4. Veja os logs no terminal do WebSocket server
```

### Teste de Estresse
```
1. Entre em qualquer quadro como Editor
2. Clique no botão "⚡ Stress Test"
3. Aguarde a criação de 500 objetos
4. Teste a responsividade arrastando objetos
```

### Teste de RBAC (Permissões)
```
1. Entre em um quadro como "Viewer"
2. Tente criar uma nota (botão estará desabilitado)
3. Veja que você só pode visualizar
```

---

## 📊 Verificação de Status

### Servidor WebSocket
Deve exibir:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              🎨 SyncBoard Pro WebSocket Server            ║
║                                                           ║
║  Status: Rodando                                          ║
║  Porta: 8080                                              ║
...
```

### Frontend Next.js
Deve exibir:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- Local:        http://localhost:3000
```

---

## ❓ Troubleshooting

### Problema: "Conectando..." infinito

**Solução**:
1. Verifique se o WebSocket server está rodando na porta 8080
2. Verifique os logs do servidor
3. Verifique o console do navegador (F12)

### Problema: Porta 3000 já em uso

**Solução**:
```bash
# Matar processo na porta 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9

# Ou usar outra porta
PORT=3001 npm run dev
```

### Problema: Porta 8080 já em uso

**Solução**:
```bash
# Matar processo na porta 8080 (Mac/Linux)
lsof -ti:8080 | xargs kill -9

# Ou editar websocket-server/index.js
# const PORT = process.env.PORT || 8081;
```

### Problema: Erro "Cannot find module"

**Solução**:
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 Próximos Passos

1. ✅ Leia o **README.md** principal
2. 🧪 Leia o **QA_TESTING_GUIDE.md**
3. 📚 Explore os códigos em `frontend/components/`
4. 🔍 Veja os logs verbosos no servidor WebSocket
5. 🎨 Personalize cores, ferramentas, etc.

---

## 📞 Suporte

- **Documentação Completa**: Veja `README.md`
- **Guia de Testes**: Veja `QA_TESTING_GUIDE.md`
- **Código Frontend**: `frontend/README.md`
- **Código Backend**: `websocket-server/README.md`

---

## 🎉 Dica Final

Para a melhor experiência de teste:

1. Use **3+ abas/navegadores** simultaneamente
2. Abra o **Console DevTools** (F12) para ver logs
3. Abra o **Terminal do WebSocket** para ver mensagens do servidor
4. Abuse dos botões de teste: 🏁 Race Test e ⚡ Stress Test

**Divirta-se testando!** 🚀
