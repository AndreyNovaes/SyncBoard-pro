'use client';

/**
 * WebSocketProvider.tsx
 * Context Provider para gerenciar a conexão WebSocket
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  WebSocketContextValue,
  ClientMessage,
  ServerMessage,
  WebSocketConfig,
  ConnectionStatus,
  UserRole,
} from '@/lib/types';
import { useBoardState } from '@/hooks/useBoardState';

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  config: WebSocketConfig;
}

export function WebSocketProvider({ children, config }: WebSocketProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(config.userRole || 'editor');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  // Zustand store
  const {
    addObject,
    updateObject,
    deleteObject,
    moveObject,
    addUser,
    removeUser,
    updateCursor,
    removeCursor,
    setCurrentUser,
    setConnected,
    initializeFromServer,
  } = useBoardState();

  /**
   * Manipulador de mensagens recebidas do servidor
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      // Log apenas mensagens importantes (não CURSOR_MOVED)
      if (message.type !== 'CURSOR_MOVED') {
        console.log('[WebSocket] Mensagem recebida:', message.type, message);
      }

      switch (message.type) {
        case 'WELCOME':
          console.log('[WebSocket] Bem-vindo! UserId:', message.userId);
          setCurrentUserId(message.userId);
          setCurrentUser(message.userId, currentUserRole);
          break;

        case 'INITIAL_STATE':
          console.log('[WebSocket] Estado inicial recebido:', message.data);
          initializeFromServer(message.data);
          break;

        case 'USER_JOINED':
          console.log('[WebSocket] Usuário entrou:', message.user);
          addUser(message.user);
          break;

        case 'USER_LEFT':
          console.log('[WebSocket] Usuário saiu:', message.userId);
          removeUser(message.userId);
          removeCursor(message.userId);
          break;

        case 'OBJECT_CREATED':
          console.log('[WebSocket] Objeto criado:', message.objectId);
          addObject(message.object);
          break;

        case 'OBJECT_UPDATED':
          console.log('[WebSocket] Objeto atualizado:', message.objectId);
          updateObject(message.objectId, message.data);
          break;

        case 'OBJECT_DELETED':
          console.log('[WebSocket] Objeto deletado:', message.objectId);
          deleteObject(message.objectId);
          break;

        case 'OBJECT_MOVED':
          moveObject(
            message.objectId,
            message.x,
            message.y,
            message.lastModified,
            message.lastModifiedBy
          );
          break;

        case 'CURSOR_MOVED':
          updateCursor(message.userId, message.x, message.y);
          break;

        case 'ERROR':
          console.error('[WebSocket] Erro do servidor:', message.message);
          // Você pode adicionar uma notificação para o usuário aqui
          break;

        case 'SERVER_SHUTDOWN':
          console.warn('[WebSocket] Servidor está encerrando:', message.message);
          break;

        default:
          console.warn('[WebSocket] Tipo de mensagem desconhecido:', message);
      }
    } catch (error) {
      console.error('[WebSocket] Erro ao processar mensagem:', error);
    }
  }, [
    addObject,
    updateObject,
    deleteObject,
    moveObject,
    addUser,
    removeUser,
    updateCursor,
    removeCursor,
    setCurrentUser,
    initializeFromServer,
    currentUserRole,
  ]);

  /**
   * Conectar ao servidor WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Já está conectado');
      return;
    }

    try {
      // Construir URL do WebSocket com parâmetros
      const wsUrl = new URL(config.url);
      wsUrl.searchParams.set('roomId', config.roomId);
      if (config.userName) wsUrl.searchParams.set('userName', config.userName);
      if (config.userRole) wsUrl.searchParams.set('userRole', config.userRole);
      if (config.userColor) wsUrl.searchParams.set('userColor', config.userColor);

      console.log('[WebSocket] Conectando a:', wsUrl.toString());
      setConnectionStatus('connecting');

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Conexão estabelecida');
        setConnectionStatus('connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[WebSocket] Erro:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Conexão fechada:', event.code, event.reason);
        setConnectionStatus('disconnected');
        setConnected(false);
        wsRef.current = null;

        // Auto-reconectar se configurado
        if (config.autoReconnect !== false && reconnectAttemptsRef.current < 5) {
          const delay = (config.reconnectInterval || 3000) * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[WebSocket] Tentando reconectar em ${delay}ms (tentativa ${reconnectAttemptsRef.current + 1}/5)`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

    } catch (error) {
      console.error('[WebSocket] Erro ao conectar:', error);
      setConnectionStatus('error');
    }
  }, [config, handleMessage, setConnected]);

  /**
   * Enviar mensagem para o servidor
   */
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));

      // Log apenas mensagens importantes (não CURSOR_MOVE)
      if (message.type !== 'CURSOR_MOVE') {
        console.log('[WebSocket] Mensagem enviada:', message.type, message);
      }
    } else {
      console.warn('[WebSocket] Não é possível enviar mensagem: conexão não está aberta');
    }
  }, []);

  /**
   * Conectar ao montar o componente
   */
  useEffect(() => {
    connect();

    // Cleanup ao desmontar
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        console.log('[WebSocket] Fechando conexão...');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const value: WebSocketContextValue = {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    send,
    currentUserId,
    currentUserRole,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
