'use client';

/**
 * Cursors.tsx
 * Componente para renderizar cursores de outros usuários em tempo real
 */

import React from 'react';
import { useBoardState } from '@/hooks/useBoardState';

export function Cursors() {
  const { cursors, users, currentUserId } = useBoardState();

  return (
    <>
      {Array.from(cursors.entries()).map(([userId, cursor]) => {
        // Não renderizar o cursor do usuário atual
        if (userId === currentUserId) return null;

        const user = users.get(userId);
        if (!user) return null;

        return (
          <div
            key={userId}
            data-testid={`cursor-${userId}`}
            className="remote-cursor"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Ícone do cursor customizado */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673L8.59496 15.3085L10.6781 10.8562L15.1304 8.77303L12.1892 5.83183L5.65376 12.3673Z"
                fill={user.color}
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Label com o nome do usuário */}
            <div
              className="cursor-label"
              style={{
                backgroundColor: user.color,
              }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </>
  );
}
