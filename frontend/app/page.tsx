'use client';

/**
 * app/page.tsx
 * Página inicial do SyncBoard Pro
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      router.push(`/board/${encodeURIComponent(roomId.trim())}`);
    }
  };

  const handleCreateRandomRoom = () => {
    const randomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    router.push(`/board/${randomId}`);
  };

  const handleJoinTestRoom = () => {
    router.push('/board/test-room-1');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
            🎨 SyncBoard Pro
          </h1>
          <p className="text-2xl text-white/90 font-medium">
            Quadro Branco Colaborativo em Tempo Real
          </p>
          <p className="text-lg text-white/70 mt-2">
            Sistema desafiador para testes de QA avançados
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Entrar em uma sala existente */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Entrar em uma Sala
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="Digite o ID da sala..."
                className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg text-gray-800"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomId.trim()}
                className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                Entrar 🚪
              </button>
            </div>
          </div>

          {/* Divisor */}
          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-gray-500 bg-white font-semibold">
                OU
              </span>
            </div>
          </div>

          {/* Criar nova sala */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Criar Nova Sala
            </h2>
            <button
              onClick={handleCreateRandomRoom}
              className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-xl transition-all text-lg"
            >
              ✨ Criar Sala Aleatória
            </button>
          </div>

          {/* Quick Test */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Teste Rápido
            </h2>
            <button
              onClick={handleJoinTestRoom}
              className="w-full px-8 py-5 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-xl transition-all text-lg"
            >
              🧪 Entrar em Sala de Teste (test-room-1)
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon="🔄"
            title="Sincronização Real-Time"
            description="Sincronização <100ms entre múltiplas sessões"
          />
          <FeatureCard
            icon="🏁"
            title="Race Conditions"
            description="Teste condições de corrida e resolução de conflitos"
          />
          <FeatureCard
            icon="⚡"
            title="Teste de Estresse"
            description="Crie 500+ objetos e teste performance"
          />
        </div>

        {/* Footer Info */}
        <div className="mt-10 text-center text-white/80">
          <p className="mb-2">
            💡 <strong>Dica:</strong> Abra múltiplas abas com o mesmo ID de sala para testar sincronização
          </p>
          <p className="text-sm">
            Desenvolvido para testes de QA avançados | WebSocket + Next.js + React
          </p>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center text-white">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-white/80">{description}</p>
    </div>
  );
}
