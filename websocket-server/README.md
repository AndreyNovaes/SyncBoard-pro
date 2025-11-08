# WebSocket Server - SyncBoard Pro

Servidor WebSocket minimalista para o SyncBoard Pro, construído com Node.js e a biblioteca `ws`.

## 🚀 Instalação

```bash
npm install
```

## 🏃 Executar

### Modo Normal
```bash
npm start
```

### Modo de Desenvolvimento (com auto-reload)
```bash
npm run dev
```

O servidor WebSocket estará rodando em: `ws://localhost:8080`

## 📁 Estrutura do Projeto

```
websocket-server/
├── index.js           # Servidor WebSocket principal
├── RoomManager.js     # Gerenciador de salas e estado
└── package.json
```

## 🔌 Como Funciona

### Conexão
Os clientes se conectam ao servidor via WebSocket com parâmetros de query:

```
ws://localhost:8080/?roomId=test-room-1&userName=João&userRole=editor&userColor=#FF6B6B
```

**Parâmetros:**
- `roomId`: ID da sala (obrigatório)
- `userName`: Nome do usuário (opcional)
- `userRole`: `editor` ou `viewer` (opcional, padrão: `editor`)
- `userColor`: Cor do cursor em hexadecimal (opcional, aleatório se não fornecido)

### Mensagens do Cliente para o Servidor

#### CREATE_OBJECT
Criar um novo objeto no quadro.
```json
{
  "type": "CREATE_OBJECT",
  "objectId": "sticky_123",
  "objectType": "STICKY_NOTE",
  "data": {
    "x": 100,
    "y": 100,
    "text": "Olá!",
    "width": 200,
    "height": 100,
    "color": "#ffeb3b"
  }
}
```

#### UPDATE_OBJECT
Atualizar dados de um objeto existente.
```json
{
  "type": "UPDATE_OBJECT",
  "objectId": "sticky_123",
  "data": {
    "text": "Texto atualizado"
  }
}
```

#### MOVE_OBJECT
Mover um objeto para uma nova posição.
```json
{
  "type": "MOVE_OBJECT",
  "objectId": "sticky_123",
  "x": 250,
  "y": 300
}
```

#### DELETE_OBJECT
Deletar um objeto do quadro.
```json
{
  "type": "DELETE_OBJECT",
  "objectId": "sticky_123"
}
```

#### CURSOR_MOVE
Atualizar a posição do cursor do usuário.
```json
{
  "type": "CURSOR_MOVE",
  "x": 150,
  "y": 200
}
```

#### TRIGGER_RACE_CONDITION
Disparar um teste de condição de corrida (para QA).
```json
{
  "type": "TRIGGER_RACE_CONDITION",
  "objectId": "test-object"
}
```

### Mensagens do Servidor para o Cliente

#### WELCOME
Enviada ao conectar com sucesso.
```json
{
  "type": "WELCOME",
  "userId": "user_1",
  "roomId": "test-room-1",
  "serverTime": 1234567890,
  "message": "Conectado ao SyncBoard Pro WebSocket Server"
}
```

#### INITIAL_STATE
Estado inicial do quadro enviado ao novo usuário.
```json
{
  "type": "INITIAL_STATE",
  "userId": "user_1",
  "data": {
    "objects": [...],
    "users": [...],
    "cursors": [...]
  }
}
```

#### OBJECT_CREATED
Broadcast quando um objeto é criado.
```json
{
  "type": "OBJECT_CREATED",
  "objectId": "sticky_123",
  "object": { ... }
}
```

#### OBJECT_MOVED
Broadcast quando um objeto é movido.
```json
{
  "type": "OBJECT_MOVED",
  "objectId": "sticky_123",
  "x": 250,
  "y": 300,
  "lastModified": 1234567890,
  "lastModifiedBy": "user_1"
}
```

#### ERROR
Enviada quando ocorre um erro (ex: viewer tentando editar).
```json
{
  "type": "ERROR",
  "message": "Viewers não têm permissão para criar objetos",
  "action": "CREATE_OBJECT"
}
```

## 🏗️ Arquitetura

### RoomManager
Gerencia o estado de todas as salas:

- **Salas**: Map de roomId -> Room
- **Room**: Contém usuários, objetos, cursores e metadata
- **Last Write Wins**: Resolução de conflitos baseada em timestamp

### Resolução de Conflitos

O servidor usa a estratégia **Last Write Wins (LWW)** para resolver conflitos:

1. Cada operação MOVE_OBJECT tem um timestamp
2. Se duas operações conflitantes chegarem, a com timestamp mais recente vence
3. Há um delay aleatório de 0-20ms para expor race conditions em testes

### Heartbeat

O servidor envia pings periódicos (30s) para detectar conexões mortas e limpar recursos.

## 📊 Logs

O servidor loga todas as operações importantes:

```
[2024-01-15T10:30:00.000Z] [test-room-1] Sala criada
[2024-01-15T10:30:01.000Z] [test-room-1] Usuário conectado: user_1 (editor)
[2024-01-15T10:30:05.000Z] [test-room-1] Mensagem de user_1: CREATE_OBJECT
[2024-01-15T10:30:05.100Z] [test-room-1] Objeto criado: sticky_123 por user_1
```

## 🧪 Teste de Race Condition

Quando um cliente envia `TRIGGER_RACE_CONDITION`:

1. Cria um objeto de teste (se não existir)
2. Envia duas mensagens MOVE_OBJECT conflitantes:
   - Move para posição A (0ms)
   - Move para posição B (5ms depois)
3. A posição final deve ser B (Last Write Wins)

## 🔒 Controle de Acesso (RBAC)

### Editor
- Pode criar objetos
- Pode editar objetos
- Pode deletar objetos
- Pode mover objetos

### Viewer
- Pode apenas visualizar
- Operações de edição são rejeitadas com mensagem de erro
- Cursores são transmitidos normalmente

## 🛠️ Desenvolvimento

### Adicionar Novo Tipo de Mensagem

1. Adicione o tipo em `handleMessage()` no `RoomManager.js`
2. Crie um handler method (ex: `handleNewAction()`)
3. Implemente a lógica de broadcast/update
4. Adicione logs apropriados

### Modificar Resolução de Conflitos

Edite o método `handleMoveObject()` no `RoomManager.js`:

```javascript
// Exemplo: Implementar CRDT ou Operational Transform
handleMoveObject(room, roomId, userId, message) {
  // Sua lógica customizada aqui
}
```

## 📝 Notas

- Estado mantido em memória (perdido ao reiniciar)
- Para persistência, adicione integração com banco de dados
- Logs verbosos para facilitar debugging de testes
- Delay intencional para expor race conditions
