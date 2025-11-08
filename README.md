# SyncBoard Pro - Quadro Branco Colaborativo para Testes de QA

## 🎯 Objetivo do Projeto

**SyncBoard Pro** é um quadro branco colaborativo em tempo real **deliberadamente desafiador**, construído especificamente para servir como alvo de classe mundial para automação de QA. O foco não é a estética da UI, mas sim expor cenários complexos de sincronização, condições de corrida, e testes multi-sessão.

## 🏗️ Arquitetura

```
SyncBoard-pro/
├── frontend/              # Aplicação Next.js (Frontend)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
└── websocket-server/      # Servidor WebSocket Node.js (Backend)
    ├── index.js
    ├── RoomManager.js
    └── package.json
```

## 📋 Stack Tecnológica

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Linguagem**: TypeScript
- **UI**: React 19+ com Tailwind CSS
- **Estado**: Zustand
- **WebSocket Client**: native WebSocket API

### Backend
- **Runtime**: Node.js 18+
- **WebSocket**: biblioteca `ws`
- **Arquitetura**: Servidor minimalista com gerenciamento de salas

## 🧪 Desafios de QA Implementados

### 1. **Sincronização Multi-Sessão** (Crítico)
- Ações em um cliente devem ser refletidas em <100ms em todos os outros
- Validar consistência visual e de estado entre múltiplas sessões

### 2. **Condições de Corrida** (Race Conditions)
- Botão especial: `data-testid="trigger-race-condition"`
- Envia mensagens conflitantes simultaneamente
- Servidor usa lógica "Last Write Wins"
- Validar estado final após conflito

### 3. **Rastreamento de Cursores em Tempo Real**
- Fluxo contínuo de eventos `mousemove`
- Cada usuário vê cursores de outros usuários
- Teste de desempenho com múltiplos cursores

### 4. **Controle de Acesso (RBAC)**
- Papéis: `Editor` e `Viewer`
- Viewer não pode editar (UI desabilitada + validação servidor)
- Testar rejeição de ações não autorizadas

### 5. **Gerenciamento de Ferramentas**
- Ferramentas: Selecionar, Caneta, Nota Adesiva
- Comportamento diferente por ferramenta
- Validar interações baseadas em ferramenta ativa

### 6. **Teste de Estresse**
- Botão: `data-testid="stress-test-button"`
- Gera 500+ objetos programaticamente
- Medir responsividade sob carga

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+ e npm/yarn/pnpm instalados
- Duas janelas de terminal

### Passo 1: Instalar e Iniciar o Servidor WebSocket

```bash
cd websocket-server
npm install
npm start
```

O servidor WebSocket estará rodando em: `ws://localhost:8080`

### Passo 2: Instalar e Iniciar o Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em: `http://localhost:3000`

### Passo 3: Abrir Múltiplas Sessões (Para Testes)

1. Abra `http://localhost:3000/board/test-room-1` em um navegador
2. Abra `http://localhost:3000/board/test-room-1` em outra aba/janela (ou navegador incógnito)
3. Observe a sincronização em tempo real entre as sessões

## 🧪 Guia de Testes de QA

### Teste 1: Sincronização Básica
1. Abrir 2 navegadores na mesma sala
2. Criar uma nota adesiva no navegador 1
3. Validar que aparece instantaneamente no navegador 2

### Teste 2: Condição de Corrida
1. No navegador 1, clicar no botão oculto de race condition
2. Observar logs do servidor WebSocket
3. Validar que o estado final é consistente em ambos os clientes

### Teste 3: Cursores em Tempo Real
1. Abrir 2 navegadores na mesma sala
2. Mover o mouse no navegador 1
3. Validar que o cursor aparece movendo-se no navegador 2

### Teste 4: RBAC - Permissões
1. Entrar como "Viewer" (trocar role no componente)
2. Tentar criar uma nota adesiva
3. Validar que a ação é bloqueada

### Teste 5: Estresse e Performance
1. Clicar no botão de stress test
2. Tentar arrastar objetos
3. Medir FPS e tempo de resposta

## 🔍 Data-TestIDs para Automação

### Ferramentas
- `data-testid="tool-select"` - Ferramenta de seleção
- `data-testid="tool-pen"` - Ferramenta caneta
- `data-testid="tool-sticky-note"` - Ferramenta nota adesiva

### Testes Especiais
- `data-testid="trigger-race-condition"` - Disparar condição de corrida
- `data-testid="stress-test-button"` - Teste de estresse
- `data-testid="role-selector"` - Seletor de papel (Editor/Viewer)

### Objetos do Quadro
- `data-testid="board-object-{objectId}"` - Cada objeto renderizado
- `data-testid="cursor-{userId}"` - Cursor de cada usuário

## 📊 Logs e Debugging

### Servidor WebSocket
- Todos os eventos são logados com timestamps
- Formato: `[TIMESTAMP] [ROOM] EVENT: details`

### Frontend
- Console do navegador exibe eventos WebSocket
- Estado do Zustand visível via DevTools

## 🎯 Cenários de Teste Avançados

### Cenário 1: Resolução de Conflito
```
Cliente A: Move objeto-123 para (100, 100) @ T+0ms
Cliente B: Move objeto-123 para (200, 200) @ T+5ms
Resultado Esperado: Objeto em (200, 200) (Last Write Wins)
```

### Cenário 2: Desconexão e Reconexão
```
1. Cliente A cria 5 objetos
2. Cliente B desconecta (fechar WebSocket)
3. Cliente A move os objetos
4. Cliente B reconecta
5. Validar: Estado sincronizado após reconexão
```

### Cenário 3: Multi-Usuário Concorrente
```
1. 10 clientes conectados simultaneamente
2. Cada um cria 10 objetos
3. Validar: 100 objetos visíveis em todos os clientes
4. Nenhuma perda de mensagem
```

## 🛠️ Desenvolvimento e Extensões

### Adicionar Nova Ferramenta
1. Adicionar tipo em `frontend/lib/types.ts`
2. Adicionar botão em `Toolbar.tsx`
3. Implementar lógica em `Board.tsx`

### Adicionar Novo Tipo de Objeto
1. Estender `BoardObjectType` em `types.ts`
2. Adicionar renderização em `Board.tsx`
3. Atualizar servidor para broadcast

### Modificar Resolução de Conflitos
- Editar `RoomManager.js` método `handleConflict()`
- Implementar: CRDT, Operational Transform, etc.

## 📝 Notas Importantes

- **Latência Simulada**: Para testes, adicionar delay artificial no servidor
- **Mensagens Duplicadas**: Servidor não deduplicata - teste de idempotência
- **Ordem de Mensagens**: WebSocket garante ordem por conexão, não entre conexões
- **Estado do Servidor**: Mantido em memória - reiniciar limpa todos os quadros

## 🐛 Problemas Conhecidos (Intencionais para Testes)

1. **Race Condition em Drag**: Arrastar rapidamente pode causar conflitos
2. **Cursor Lag**: Muitos cursores degradam performance
3. **Memory Leak**: Stress test não limpa objetos automaticamente
4. **No Persistence**: Estado perdido ao reiniciar servidor

## 📚 Recursos Adicionais

- [Documentação Next.js](https://nextjs.org/docs)
- [Biblioteca ws](https://github.com/websockets/ws)
- [Zustand](https://github.com/pmndrs/zustand)

## 🤝 Contribuindo

Este é um projeto educacional para demonstração de desafios de QA. Contribuições são bem-vindas para adicionar mais cenários de teste desafiadores!

---

**Boa sorte nos testes! Que as race conditions estejam a seu favor! 🏁**
