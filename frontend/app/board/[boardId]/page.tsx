'use client';

/**
 * app/board/[boardId]/page.tsx
 * Página principal do quadro colaborativo
 */

import React, { useState, useCallback } from 'react';
import { WebSocketProvider, useWebSocket } from '@/components/WebSocketProvider';
import { Board } from '@/components/Board';
import { Toolbar } from '@/components/Toolbar';
import { StickyNoteData } from '@/lib/types';

interface BoardPageProps {
  params: {
    boardId: string;
  };
}

/**
 * Componente interno que tem acesso ao WebSocket
 */
function BoardContent() {
  const { send } = useWebSocket();

  /**
   * Disparar teste de condição de corrida
   */
  const handleRaceConditionTest = useCallback(() => {
    console.log('🏁 Disparando teste de condição de corrida...');

    send({
      type: 'TRIGGER_RACE_CONDITION',
    });

    alert('🏁 Teste de Race Condition iniciado! Verifique o console do navegador e os logs do servidor.');
  }, [send]);

  /**
   * Teste de estresse - Criar 500 objetos
   */
  const handleStressTest = useCallback(() => {
    const confirmed = confirm(
      '⚡ Teste de Estresse\n\n' +
      'Isso irá criar 500 objetos no quadro.\n' +
      'Pode causar lentidão temporária.\n\n' +
      'Continuar?'
    );

    if (!confirmed) return;

    console.log('⚡ Iniciando teste de estresse - criando 500 objetos...');

    const colors = ['#ffeb3b', '#ff9800', '#e91e63', '#9c27b0', '#3f51b5', '#00bcd4', '#4caf50'];
    const startTime = Date.now();

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * (window.innerWidth - 200);
      const y = Math.random() * (window.innerHeight - 150);
      const color = colors[Math.floor(Math.random() * colors.length)];

      const objectId = `stress_test_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const stickyNoteData: StickyNoteData = {
        x,
        y,
        text: `Objeto #${i + 1}`,
        width: 150,
        height: 80,
        color,
      };

      // Enviar em batches para não sobrecarregar de uma vez
      setTimeout(() => {
        send({
          type: 'CREATE_OBJECT',
          objectId,
          objectType: 'STICKY_NOTE',
          data: stickyNoteData,
        });

        // Log de progresso a cada 100 objetos
        if ((i + 1) % 100 === 0) {
          console.log(`⚡ Progresso: ${i + 1}/500 objetos criados`);
        }

        // Quando terminar
        if (i === 499) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          console.log(`⚡ Teste de estresse concluído! 500 objetos criados em ${duration}ms`);
          alert(`⚡ Teste concluído!\n\n500 objetos criados em ${duration}ms\n\nAgora teste a responsividade arrastando objetos!`);
        }
      }, i * 10); // 10ms de intervalo entre cada criação
    }
  }, [send]);

  return (
    <>
      <Toolbar
        onRaceConditionTest={handleRaceConditionTest}
        onStressTest={handleStressTest}
      />
      <Board />
    </>
  );
}

/**
 * Página principal do quadro
 */
export default function BoardPage({ params }: BoardPageProps) {
  const { boardId } = params;
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'editor' | 'viewer'>('editor');
  const [hasJoined, setHasJoined] = useState(false);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

  /**
   * Tela de entrada (antes de entrar no quadro)
   */
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎨 SyncBoard Pro
            </h1>
            <p className="text-gray-600">
              Quadro Branco Colaborativo em Tempo Real
            </p>
          </div>

          <div className="space-y-6">
            {/* Nome do Quadro */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sala do Quadro
              </label>
              <div className="px-4 py-3 bg-gray-100 rounded-lg border-2 border-gray-300">
                <p className="font-mono text-lg text-gray-800">{boardId}</p>
              </div>
            </div>

            {/* Nome do Usuário */}
            <div>
              <label htmlFor="userName" className="block text-sm font-semibold text-gray-700 mb-2">
                Seu Nome
              </label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Digite seu nome..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-gray-800"
              />
            </div>

            {/* Seletor de Papel (Role) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Papel de Acesso
              </label>
              <div className="flex gap-3" data-testid="role-selector">
                <button
                  onClick={() => setUserRole('editor')}
                  className={`
                    flex-1 px-4 py-3 rounded-lg font-semibold transition-all
                    ${userRole === 'editor'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                    }
                  `}
                >
                  ✏️ Editor
                </button>
                <button
                  onClick={() => setUserRole('viewer')}
                  className={`
                    flex-1 px-4 py-3 rounded-lg font-semibold transition-all
                    ${userRole === 'viewer'
                      ? 'bg-gray-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                    }
                  `}
                >
                  👁️ Viewer
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {userRole === 'editor'
                  ? '✏️ Você poderá criar, editar e deletar objetos'
                  : '👁️ Você só poderá visualizar (modo somente leitura)'}
              </p>
            </div>

            {/* Botão de Entrar */}
            <button
              onClick={() => setHasJoined(true)}
              disabled={!userName.trim()}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Entrar no Quadro 🚀
            </button>
          </div>

          {/* Informações */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              💡 Dicas para Testes de QA:
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Abra múltiplas abas/janelas para testar sincronização</li>
              <li>• Use o botão "🏁 Race Test" para disparar condições de corrida</li>
              <li>• Use o botão "⚡ Stress Test" para criar 500 objetos</li>
              <li>• Teste como Viewer para validar restrições de permissão</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Quadro principal (após entrar)
   */
  return (
    <WebSocketProvider
      config={{
        url: wsUrl,
        roomId: boardId,
        userName: userName || 'Usuário Anônimo',
        userRole,
        autoReconnect: true,
        reconnectInterval: 3000,
      }}
    >
      <BoardContent />
    </WebSocketProvider>
  );
}
