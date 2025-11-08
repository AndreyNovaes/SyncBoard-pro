'use client';

/**
 * Toolbar.tsx
 * Barra de ferramentas para seleção de ferramentas e ações
 */

import React from 'react';
import { useBoardState } from '@/hooks/useBoardState';
import { Tool, UserRole } from '@/lib/types';
import { useWebSocket } from './WebSocketProvider';

interface ToolbarProps {}

export function Toolbar({}: ToolbarProps) {
  const { activeTool, setActiveTool, currentUserRole } = useBoardState();
  const { isConnected, connectionStatus } = useWebSocket();

  const tools: { id: Tool; label: string; icon: string; disabled?: boolean }[] = [
    { id: 'SELECT', label: 'Selecionar', icon: '🖱️' },
    { id: 'PEN', label: 'Caneta', icon: '✏️', disabled: currentUserRole === 'viewer' },
    { id: 'STICKY_NOTE', label: 'Nota Adesiva', icon: '📝', disabled: currentUserRole === 'viewer' },
  ];

  const handleToolClick = (tool: Tool) => {
    if (currentUserRole === 'viewer' && tool !== 'SELECT') {
      alert('Viewers não podem usar ferramentas de edição');
      return;
    }
    setActiveTool(tool);
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-3">
        <div className="flex items-center gap-3">
          {/* Status de Conexão */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-sm font-medium text-gray-700">
              {connectionStatus === 'connected' ? 'Conectado' :
               connectionStatus === 'connecting' ? 'Conectando...' :
               connectionStatus === 'error' ? 'Erro' :
               'Desconectado'}
            </span>
          </div>

          {/* Divisor */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Role Badge */}
          <div className={`px-3 py-2 rounded-md text-sm font-semibold ${
            currentUserRole === 'editor'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {currentUserRole === 'editor' ? '✏️ Editor' : '👁️ Viewer'}
          </div>

          {/* Divisor */}
          <div className="h-8 w-px bg-gray-300" />

          {/* Ferramentas */}
          {tools.map((tool) => (
            <button
              key={tool.id}
              data-testid={`tool-${tool.id.toLowerCase().replace('_', '-')}`}
              onClick={() => handleToolClick(tool.id)}
              disabled={tool.disabled || !isConnected}
              className={`
                toolbar-button
                px-4 py-2 rounded-md font-medium text-sm
                flex items-center gap-2
                transition-all duration-200
                ${activeTool === tool.id
                  ? 'active bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                }
                ${(tool.disabled || !isConnected)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-md'
                }
              `}
            >
              <span className="text-lg">{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
