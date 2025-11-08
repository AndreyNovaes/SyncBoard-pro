/**
 * RoomManager.js
 * Gerenciador de salas para o SyncBoard Pro
 * Mantém o estado de cada quadro e gerencia conexões de usuários
 */

export class RoomManager {
  constructor() {
    // Estrutura: { roomId: { users: Map, objects: Map, cursors: Map } }
    this.rooms = new Map();

    // Contador para gerar IDs únicos de usuários
    this.userIdCounter = 0;

    // Fila para processar conflitos (usado no modo de teste)
    this.conflictQueue = [];
  }

  /**
   * Cria uma nova sala ou retorna uma existente
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(), // userId -> { ws, role, name, color }
        objects: new Map(), // objectId -> { type, data, lastModified, lastModifiedBy }
        cursors: new Map(), // userId -> { x, y, timestamp }
        metadata: {
          createdAt: Date.now(),
          lastActivity: Date.now()
        }
      });
      console.log(`[${this.timestamp()}] [${roomId}] Sala criada`);
    }
    return this.rooms.get(roomId);
  }

  /**
   * Adiciona um usuário a uma sala
   */
  addUser(roomId, ws, userData = {}) {
    const room = this.getOrCreateRoom(roomId);
    const userId = `user_${++this.userIdCounter}`;

    const user = {
      id: userId,
      ws,
      role: userData.role || 'editor', // 'editor' ou 'viewer'
      name: userData.name || `User ${userId}`,
      color: userData.color || this.generateRandomColor(),
      joinedAt: Date.now()
    };

    room.users.set(userId, user);
    room.metadata.lastActivity = Date.now();

    console.log(`[${this.timestamp()}] [${roomId}] Usuário conectado: ${userId} (${user.role})`);

    // Enviar estado atual do quadro para o novo usuário
    this.sendInitialState(ws, roomId, userId);

    // Notificar outros usuários sobre o novo usuário
    this.broadcastToRoom(roomId, {
      type: 'USER_JOINED',
      userId,
      user: {
        id: userId,
        name: user.name,
        color: user.color,
        role: user.role
      }
    }, userId);

    return userId;
  }

  /**
   * Remove um usuário de uma sala
   */
  removeUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(userId);
    if (!user) return;

    room.users.delete(userId);
    room.cursors.delete(userId);

    console.log(`[${this.timestamp()}] [${roomId}] Usuário desconectado: ${userId}`);

    // Notificar outros usuários
    this.broadcastToRoom(roomId, {
      type: 'USER_LEFT',
      userId
    });

    // Limpar sala se estiver vazia
    if (room.users.size === 0) {
      console.log(`[${this.timestamp()}] [${roomId}] Sala vazia - mantendo estado em memória`);
    }
  }

  /**
   * Envia o estado inicial do quadro para um usuário recém-conectado
   */
  sendInitialState(ws, roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const state = {
      type: 'INITIAL_STATE',
      userId,
      data: {
        objects: Array.from(room.objects.entries()).map(([id, obj]) => ({
          id,
          ...obj
        })),
        users: Array.from(room.users.entries())
          .filter(([id]) => id !== userId)
          .map(([id, user]) => ({
            id,
            name: user.name,
            color: user.color,
            role: user.role
          })),
        cursors: Array.from(room.cursors.entries())
          .filter(([id]) => id !== userId)
          .map(([id, cursor]) => ({
            userId: id,
            ...cursor
          }))
      }
    };

    this.sendToUser(ws, state);
    console.log(`[${this.timestamp()}] [${roomId}] Estado inicial enviado para ${userId}: ${room.objects.size} objetos`);
  }

  /**
   * Processa mensagens recebidas de clientes
   */
  handleMessage(roomId, userId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(userId);
    if (!user) return;

    room.metadata.lastActivity = Date.now();

    console.log(`[${this.timestamp()}] [${roomId}] Mensagem de ${userId}: ${message.type}`);

    switch (message.type) {
      case 'CREATE_OBJECT':
        this.handleCreateObject(room, roomId, userId, message);
        break;

      case 'UPDATE_OBJECT':
        this.handleUpdateObject(room, roomId, userId, message);
        break;

      case 'DELETE_OBJECT':
        this.handleDeleteObject(room, roomId, userId, message);
        break;

      case 'MOVE_OBJECT':
        this.handleMoveObject(room, roomId, userId, message);
        break;

      case 'CURSOR_MOVE':
        this.handleCursorMove(room, roomId, userId, message);
        break;

      case 'TRIGGER_RACE_CONDITION':
        this.handleRaceConditionTest(room, roomId, userId, message);
        break;

      default:
        console.log(`[${this.timestamp()}] [${roomId}] Tipo de mensagem desconhecido: ${message.type}`);
    }
  }

  /**
   * Cria um novo objeto no quadro
   */
  handleCreateObject(room, roomId, userId, message) {
    const user = room.users.get(userId);

    // Verificar permissões
    if (user.role === 'viewer') {
      this.sendToUser(user.ws, {
        type: 'ERROR',
        message: 'Viewers não têm permissão para criar objetos',
        action: 'CREATE_OBJECT'
      });
      console.log(`[${this.timestamp()}] [${roomId}] Tentativa bloqueada: ${userId} (viewer) tentou criar objeto`);
      return;
    }

    const objectId = message.objectId || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const object = {
      type: message.objectType,
      data: message.data,
      createdAt: Date.now(),
      createdBy: userId,
      lastModified: Date.now(),
      lastModifiedBy: userId
    };

    room.objects.set(objectId, object);

    // Broadcast para todos os usuários
    this.broadcastToRoom(roomId, {
      type: 'OBJECT_CREATED',
      objectId,
      object: {
        id: objectId,
        ...object
      }
    });

    console.log(`[${this.timestamp()}] [${roomId}] Objeto criado: ${objectId} por ${userId}`);
  }

  /**
   * Atualiza um objeto existente
   */
  handleUpdateObject(room, roomId, userId, message) {
    const user = room.users.get(userId);

    if (user.role === 'viewer') {
      this.sendToUser(user.ws, {
        type: 'ERROR',
        message: 'Viewers não têm permissão para atualizar objetos',
        action: 'UPDATE_OBJECT'
      });
      return;
    }

    const object = room.objects.get(message.objectId);
    if (!object) {
      console.log(`[${this.timestamp()}] [${roomId}] Objeto não encontrado: ${message.objectId}`);
      return;
    }

    // Atualizar objeto
    const updatedObject = {
      ...object,
      data: { ...object.data, ...message.data },
      lastModified: Date.now(),
      lastModifiedBy: userId
    };

    room.objects.set(message.objectId, updatedObject);

    this.broadcastToRoom(roomId, {
      type: 'OBJECT_UPDATED',
      objectId: message.objectId,
      data: message.data,
      lastModified: updatedObject.lastModified,
      lastModifiedBy: userId
    });

    console.log(`[${this.timestamp()}] [${roomId}] Objeto atualizado: ${message.objectId} por ${userId}`);
  }

  /**
   * Move um objeto (caso especial de update para testar race conditions)
   */
  handleMoveObject(room, roomId, userId, message) {
    const user = room.users.get(userId);

    if (user.role === 'viewer') {
      this.sendToUser(user.ws, {
        type: 'ERROR',
        message: 'Viewers não têm permissão para mover objetos',
        action: 'MOVE_OBJECT'
      });
      return;
    }

    const object = room.objects.get(message.objectId);
    if (!object) return;

    const timestamp = Date.now();

    // Simular delay aleatório para expor race conditions (0-20ms)
    const delay = Math.random() * 20;

    setTimeout(() => {
      // Last Write Wins (LWW) - baseado no timestamp
      const currentObject = room.objects.get(message.objectId);
      if (currentObject && currentObject.lastModified > timestamp) {
        console.log(`[${this.timestamp()}] [${roomId}] CONFLITO DETECTADO: Move de ${message.objectId} ignorado (timestamp antigo)`);
        return;
      }

      const updatedObject = {
        ...object,
        data: {
          ...object.data,
          x: message.x,
          y: message.y
        },
        lastModified: timestamp,
        lastModifiedBy: userId
      };

      room.objects.set(message.objectId, updatedObject);

      this.broadcastToRoom(roomId, {
        type: 'OBJECT_MOVED',
        objectId: message.objectId,
        x: message.x,
        y: message.y,
        lastModified: timestamp,
        lastModifiedBy: userId
      });

      console.log(`[${this.timestamp()}] [${roomId}] Objeto movido: ${message.objectId} para (${message.x}, ${message.y}) por ${userId}`);
    }, delay);
  }

  /**
   * Deleta um objeto
   */
  handleDeleteObject(room, roomId, userId, message) {
    const user = room.users.get(userId);

    if (user.role === 'viewer') {
      this.sendToUser(user.ws, {
        type: 'ERROR',
        message: 'Viewers não têm permissão para deletar objetos',
        action: 'DELETE_OBJECT'
      });
      return;
    }

    if (!room.objects.has(message.objectId)) {
      console.log(`[${this.timestamp()}] [${roomId}] Objeto não encontrado para deletar: ${message.objectId}`);
      return;
    }

    room.objects.delete(message.objectId);

    this.broadcastToRoom(roomId, {
      type: 'OBJECT_DELETED',
      objectId: message.objectId,
      deletedBy: userId
    });

    console.log(`[${this.timestamp()}] [${roomId}] Objeto deletado: ${message.objectId} por ${userId}`);
  }

  /**
   * Atualiza a posição do cursor de um usuário
   */
  handleCursorMove(room, roomId, userId, message) {
    const cursor = {
      x: message.x,
      y: message.y,
      timestamp: Date.now()
    };

    room.cursors.set(userId, cursor);

    // Broadcast para todos os outros usuários (exceto o remetente)
    this.broadcastToRoom(roomId, {
      type: 'CURSOR_MOVED',
      userId,
      x: message.x,
      y: message.y
    }, userId);
  }

  /**
   * Simula uma condição de corrida (Race Condition Test)
   */
  handleRaceConditionTest(room, roomId, userId, message) {
    console.log(`[${this.timestamp()}] [${roomId}] 🏁 RACE CONDITION TEST INICIADO por ${userId}`);

    // Criar um objeto de teste se não existir
    const testObjectId = message.objectId || 'race-test-object';

    if (!room.objects.has(testObjectId)) {
      room.objects.set(testObjectId, {
        type: 'STICKY_NOTE',
        data: { x: 100, y: 100, text: 'Race Test', width: 200, height: 100, color: '#ffeb3b' },
        createdAt: Date.now(),
        createdBy: userId,
        lastModified: Date.now(),
        lastModifiedBy: userId
      });

      this.broadcastToRoom(roomId, {
        type: 'OBJECT_CREATED',
        objectId: testObjectId,
        object: {
          id: testObjectId,
          ...room.objects.get(testObjectId)
        }
      });
    }

    // Enviar duas mensagens conflitantes com delay mínimo
    const position1 = { x: 200, y: 200 };
    const position2 = { x: 400, y: 400 };

    console.log(`[${this.timestamp()}] [${roomId}] 🏁 Enviando conflito A: mover para (${position1.x}, ${position1.y})`);
    setTimeout(() => {
      this.handleMoveObject(room, roomId, userId, {
        type: 'MOVE_OBJECT',
        objectId: testObjectId,
        x: position1.x,
        y: position1.y
      });
    }, 0);

    console.log(`[${this.timestamp()}] [${roomId}] 🏁 Enviando conflito B: mover para (${position2.x}, ${position2.y})`);
    setTimeout(() => {
      this.handleMoveObject(room, roomId, userId, {
        type: 'MOVE_OBJECT',
        objectId: testObjectId,
        x: position2.x,
        y: position2.y
      });
    }, 5); // 5ms depois

    console.log(`[${this.timestamp()}] [${roomId}] 🏁 RACE CONDITION TEST: Aguardando resolução (Last Write Wins)`);
  }

  /**
   * Envia mensagem para todos os usuários de uma sala
   */
  broadcastToRoom(roomId, message, excludeUserId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    room.users.forEach((user, id) => {
      if (id !== excludeUserId && user.ws.readyState === 1) { // 1 = OPEN
        user.ws.send(messageStr);
      }
    });
  }

  /**
   * Envia mensagem para um usuário específico
   */
  sendToUser(ws, message) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Gera uma cor aleatória para o cursor do usuário
   */
  generateRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7B731', '#5F27CD', '#00D2D3',
      '#FF6348', '#1DD1A1', '#EE5A6F', '#C44569'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Retorna timestamp formatado para logs
   */
  timestamp() {
    return new Date().toISOString();
  }

  /**
   * Retorna estatísticas do servidor
   */
  getStats() {
    const stats = {
      totalRooms: this.rooms.size,
      rooms: []
    };

    this.rooms.forEach((room, roomId) => {
      stats.rooms.push({
        id: roomId,
        users: room.users.size,
        objects: room.objects.size,
        cursors: room.cursors.size,
        createdAt: room.metadata.createdAt,
        lastActivity: room.metadata.lastActivity
      });
    });

    return stats;
  }
}
