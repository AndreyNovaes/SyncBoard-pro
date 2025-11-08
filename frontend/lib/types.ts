/**
 * types.ts
 * Tipos TypeScript compartilhados para o SyncBoard Pro
 */

/**
 * Tipos de ferramentas disponíveis no quadro
 */
export type Tool = 'SELECT' | 'PEN' | 'STICKY_NOTE';

/**
 * Tipos de objetos que podem ser criados no quadro
 */
export type BoardObjectType = 'STICKY_NOTE' | 'DRAWING' | 'SHAPE';

/**
 * Papéis de usuário (RBAC)
 */
export type UserRole = 'editor' | 'viewer';

/**
 * Interface para um usuário conectado
 */
export interface User {
  id: string;
  name: string;
  color: string;
  role: UserRole;
  joinedAt?: number;
}

/**
 * Interface para a posição do cursor de um usuário
 */
export interface Cursor {
  userId: string;
  x: number;
  y: number;
  timestamp?: number;
}

/**
 * Dados base para qualquer objeto no quadro
 */
export interface BoardObjectData {
  x: number;
  y: number;
  [key: string]: any;
}

/**
 * Dados específicos para uma nota adesiva
 */
export interface StickyNoteData extends BoardObjectData {
  text: string;
  width: number;
  height: number;
  color: string;
}

/**
 * Dados específicos para um desenho livre
 */
export interface DrawingData extends BoardObjectData {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

/**
 * Dados específicos para uma forma geométrica
 */
export interface ShapeData extends BoardObjectData {
  shapeType: 'RECTANGLE' | 'CIRCLE' | 'TRIANGLE';
  width: number;
  height: number;
  color: string;
  fillColor?: string;
}

/**
 * Interface para um objeto no quadro
 */
export interface BoardObject {
  id: string;
  type: BoardObjectType;
  data: StickyNoteData | DrawingData | ShapeData | BoardObjectData;
  createdAt: number;
  createdBy: string;
  lastModified: number;
  lastModifiedBy: string;
}

/**
 * Estado global do quadro
 */
export interface BoardState {
  objects: Map<string, BoardObject>;
  users: Map<string, User>;
  cursors: Map<string, Cursor>;
  currentUserId: string | null;
  currentUserRole: UserRole;
  activeTool: Tool;
  isConnected: boolean;
}

/**
 * Tipos de mensagens WebSocket do cliente para o servidor
 */
export type ClientMessage =
  | { type: 'CREATE_OBJECT'; objectId?: string; objectType: BoardObjectType; data: BoardObjectData }
  | { type: 'UPDATE_OBJECT'; objectId: string; data: Partial<BoardObjectData> }
  | { type: 'DELETE_OBJECT'; objectId: string }
  | { type: 'MOVE_OBJECT'; objectId: string; x: number; y: number }
  | { type: 'CURSOR_MOVE'; x: number; y: number }
  | { type: 'TRIGGER_RACE_CONDITION'; objectId?: string };

/**
 * Tipos de mensagens WebSocket do servidor para o cliente
 */
export type ServerMessage =
  | { type: 'WELCOME'; userId: string; roomId: string; serverTime: number; message: string }
  | {
      type: 'INITIAL_STATE';
      userId: string;
      data: {
        objects: BoardObject[];
        users: User[];
        cursors: Cursor[];
      };
    }
  | { type: 'USER_JOINED'; userId: string; user: User }
  | { type: 'USER_LEFT'; userId: string }
  | { type: 'OBJECT_CREATED'; objectId: string; object: BoardObject }
  | {
      type: 'OBJECT_UPDATED';
      objectId: string;
      data: Partial<BoardObjectData>;
      lastModified: number;
      lastModifiedBy: string;
    }
  | { type: 'OBJECT_DELETED'; objectId: string; deletedBy: string }
  | {
      type: 'OBJECT_MOVED';
      objectId: string;
      x: number;
      y: number;
      lastModified: number;
      lastModifiedBy: string;
    }
  | { type: 'CURSOR_MOVED'; userId: string; x: number; y: number }
  | { type: 'ERROR'; message: string; action?: string }
  | { type: 'SERVER_SHUTDOWN'; message: string };

/**
 * Configuração do WebSocket
 */
export interface WebSocketConfig {
  url: string;
  roomId: string;
  userName?: string;
  userRole?: UserRole;
  userColor?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

/**
 * Status da conexão WebSocket
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Propriedades do contexto WebSocket
 */
export interface WebSocketContextValue {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  send: (message: ClientMessage) => void;
  currentUserId: string | null;
  currentUserRole: UserRole;
}
