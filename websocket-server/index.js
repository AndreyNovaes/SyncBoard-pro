/**
 * index.js
 * Servidor WebSocket Principal para SyncBoard Pro
 */

import { WebSocketServer } from 'ws';
import { RoomManager } from './RoomManager.js';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });
const roomManager = new RoomManager();

// Mapa de conexões: ws -> { roomId, userId }
const connections = new Map();

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              🎨 SyncBoard Pro WebSocket Server            ║
║                                                           ║
║  Status: Rodando                                          ║
║  Porta: ${PORT}                                             ║
║  Hora: ${new Date().toLocaleString()}                      ║
║                                                           ║
║  WebSocket URL: ws://localhost:${PORT}                       ║
║                                                           ║
║  Pronto para receber conexões de clientes!                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

/**
 * Manipulador de novas conexões WebSocket
 */
wss.on('connection', (ws, req) => {
  console.log(`\n[${timestamp()}] 🔌 Nova conexão WebSocket recebida`);
  console.log(`[${timestamp()}] URL: ${req.url}`);

  // Extrair roomId da URL (formato: ws://localhost:8080/?roomId=test-room-1)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId') || 'default-room';
  const userName = url.searchParams.get('userName') || undefined;
  const userRole = url.searchParams.get('userRole') || 'editor';
  const userColor = url.searchParams.get('userColor') || undefined;

  console.log(`[${timestamp()}] Parâmetros de conexão:`, {
    roomId,
    userName,
    userRole,
    userColor
  });

  // Adicionar usuário à sala
  const userId = roomManager.addUser(roomId, ws, {
    name: userName,
    role: userRole,
    color: userColor
  });

  // Armazenar informações da conexão
  connections.set(ws, { roomId, userId });

  console.log(`[${timestamp()}] ✅ Usuário ${userId} adicionado à sala ${roomId}`);

  /**
   * Manipulador de mensagens recebidas
   */
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const connection = connections.get(ws);

      if (!connection) {
        console.error(`[${timestamp()}] ❌ Conexão não encontrada para mensagem`);
        return;
      }

      // Log detalhado da mensagem (exceto CURSOR_MOVE para não poluir)
      if (message.type !== 'CURSOR_MOVE') {
        console.log(`[${timestamp()}] 📨 Mensagem recebida:`, {
          room: connection.roomId,
          user: connection.userId,
          type: message.type,
          data: message
        });
      }

      // Processar mensagem através do RoomManager
      roomManager.handleMessage(connection.roomId, connection.userId, message);

    } catch (error) {
      console.error(`[${timestamp()}] ❌ Erro ao processar mensagem:`, error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Erro ao processar mensagem',
        error: error.message
      }));
    }
  });

  /**
   * Manipulador de desconexão
   */
  ws.on('close', () => {
    const connection = connections.get(ws);

    if (connection) {
      console.log(`[${timestamp()}] 🔌 Conexão fechada: ${connection.userId} da sala ${connection.roomId}`);
      roomManager.removeUser(connection.roomId, connection.userId);
      connections.delete(ws);
    } else {
      console.log(`[${timestamp()}] 🔌 Conexão fechada (não identificada)`);
    }

    logServerStats();
  });

  /**
   * Manipulador de erros
   */
  ws.on('error', (error) => {
    console.error(`[${timestamp()}] ❌ Erro no WebSocket:`, error);
  });

  /**
   * Enviar mensagem de boas-vindas
   */
  ws.send(JSON.stringify({
    type: 'WELCOME',
    message: 'Conectado ao SyncBoard Pro WebSocket Server',
    userId,
    roomId,
    serverTime: Date.now()
  }));

  // Log de estatísticas após nova conexão
  logServerStats();
});

/**
 * Manipulador de erros do servidor
 */
wss.on('error', (error) => {
  console.error(`[${timestamp()}] ❌ Erro no servidor WebSocket:`, error);
});

/**
 * Endpoint HTTP simples para health check e estatísticas
 * Isso não é um servidor HTTP completo, apenas para monitoramento
 */
wss.on('listening', () => {
  console.log(`\n[${timestamp()}] ✅ Servidor WebSocket está escutando na porta ${PORT}`);
  console.log(`[${timestamp()}] 📊 Aguardando conexões...\n`);
});

/**
 * Exibe estatísticas do servidor
 */
function logServerStats() {
  const stats = roomManager.getStats();
  console.log(`\n[${timestamp()}] 📊 Estatísticas do Servidor:`);
  console.log(`   - Total de salas: ${stats.totalRooms}`);
  console.log(`   - Total de conexões ativas: ${connections.size}`);

  if (stats.rooms.length > 0) {
    console.log(`   - Detalhes das salas:`);
    stats.rooms.forEach(room => {
      console.log(`     • ${room.id}: ${room.users} usuários, ${room.objects} objetos`);
    });
  }
  console.log('');
}

/**
 * Retorna timestamp formatado
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Limpeza graciosa ao encerrar o servidor
 */
process.on('SIGINT', () => {
  console.log(`\n[${timestamp()}] 🛑 Encerrando servidor...`);

  // Notificar todos os clientes sobre o encerramento
  connections.forEach((connection, ws) => {
    try {
      ws.send(JSON.stringify({
        type: 'SERVER_SHUTDOWN',
        message: 'O servidor está sendo encerrado'
      }));
      ws.close();
    } catch (error) {
      console.error(`[${timestamp()}] Erro ao fechar conexão:`, error);
    }
  });

  wss.close(() => {
    console.log(`[${timestamp()}] ✅ Servidor WebSocket encerrado`);
    process.exit(0);
  });

  // Forçar encerramento após 5 segundos se não conseguir fechar graciosamente
  setTimeout(() => {
    console.log(`[${timestamp()}] ⚠️  Forçando encerramento`);
    process.exit(1);
  }, 5000);
});

/**
 * Heartbeat para detectar conexões mortas
 */
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      const connection = connections.get(ws);
      if (connection) {
        console.log(`[${timestamp()}] 💀 Conexão morta detectada: ${connection.userId}`);
        roomManager.removeUser(connection.roomId, connection.userId);
        connections.delete(ws);
      }
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // 30 segundos

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

/**
 * Log periódico de estatísticas (a cada 60 segundos)
 */
setInterval(() => {
  if (connections.size > 0) {
    logServerStats();
  }
}, 60000);

// Exportar para testes (opcional)
export { wss, roomManager };
