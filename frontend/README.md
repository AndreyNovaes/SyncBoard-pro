# Frontend - SyncBoard Pro

Frontend do SyncBoard Pro construído com Next.js 15, React 19, TypeScript e Tailwind CSS.

## 🚀 Instalação

```bash
npm install
```

## 🏃 Executar

### Desenvolvimento
```bash
npm run dev
```

O frontend estará disponível em: `http://localhost:3000`

### Produção
```bash
npm run build
npm start
```

## 🔧 Configuração

1. Copie o arquivo `.env.local.example` para `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Ajuste a URL do WebSocket se necessário:
```
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

## 📁 Estrutura do Projeto

```
frontend/
├── app/
│   ├── board/[boardId]/
│   │   └── page.tsx          # Página do quadro colaborativo
│   ├── layout.tsx             # Layout raiz
│   ├── page.tsx               # Página inicial
│   └── globals.css            # Estilos globais
├── components/
│   ├── Board.tsx              # Componente principal do quadro
│   ├── Toolbar.tsx            # Barra de ferramentas
│   ├── Cursors.tsx            # Cursores de outros usuários
│   └── WebSocketProvider.tsx  # Provider de WebSocket
├── hooks/
│   └── useBoardState.ts       # Hook Zustand para estado
└── lib/
    └── types.ts               # Tipos TypeScript
```

## 🎯 Componentes Principais

### Board.tsx
Componente principal que renderiza o canvas do quadro. Lida com:
- Interações de mouse (click, drag, move)
- Renderização de objetos (notas adesivas)
- Sincronização em tempo real

### Toolbar.tsx
Barra de ferramentas com:
- Seleção de ferramentas (Selecionar, Caneta, Nota Adesiva)
- Status de conexão
- Indicador de papel (Editor/Viewer)
- Botões de teste (Race Condition, Stress Test)

### WebSocketProvider.tsx
Context Provider que gerencia:
- Conexão WebSocket com o servidor
- Envio e recebimento de mensagens
- Auto-reconexão
- Sincronização com estado Zustand

### useBoardState.ts
Hook Zustand que gerencia:
- Objetos do quadro
- Usuários conectados
- Cursores em tempo real
- Ferramenta ativa
- Status de conexão

## 🧪 Data-TestIDs

Todos os componentes importantes possuem `data-testid` para automação de testes:

### Ferramentas
- `data-testid="tool-select"`
- `data-testid="tool-pen"`
- `data-testid="tool-sticky-note"`

### Botões de Teste
- `data-testid="trigger-race-condition"`
- `data-testid="stress-test-button"`
- `data-testid="role-selector"`

### Objetos
- `data-testid="board-object-{objectId}"`
- `data-testid="cursor-{userId}"`

## 🌐 Uso

1. Acesse `http://localhost:3000`
2. Digite um ID de sala ou crie uma aleatória
3. Escolha seu nome e papel (Editor/Viewer)
4. Clique em "Entrar no Quadro"
5. Comece a colaborar!

## 📝 Notas

- Certifique-se de que o servidor WebSocket está rodando em `ws://localhost:8080`
- Para testes multi-sessão, abra múltiplas abas/janelas com o mesmo ID de sala
- Viewers não podem criar, editar ou deletar objetos
