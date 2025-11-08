'use client';

/**
 * Board.tsx
 * Componente principal do quadro colaborativo
 * Renderiza objetos, lida com interações do mouse e sincroniza com WebSocket
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useBoardState } from '@/hooks/useBoardState';
import { useWebSocket } from './WebSocketProvider';
import { StickyNoteData, BoardObject } from '@/lib/types';
import { Cursors } from './Cursors';

export function Board() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const lastCursorSendTime = useRef(0);

  const { objects, activeTool, currentUserRole } = useBoardState();
  const { send, isConnected } = useWebSocket();

  /**
   * Envia atualização de posição do cursor (throttled para não sobrecarregar)
   */
  const sendCursorUpdate = useCallback((x: number, y: number) => {
    const now = Date.now();
    // Enviar apenas a cada 50ms (20 atualizações por segundo)
    if (now - lastCursorSendTime.current > 50) {
      send({
        type: 'CURSOR_MOVE',
        x,
        y,
      });
      lastCursorSendTime.current = now;
    }
  }, [send]);

  /**
   * Manipulador de movimento do mouse no quadro
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Enviar posição do cursor
    sendCursorUpdate(x, y);

    // Se estiver arrastando um objeto
    if (isDragging && selectedObjectId) {
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;

      // Enviar atualização de posição via WebSocket
      send({
        type: 'MOVE_OBJECT',
        objectId: selectedObjectId,
        x: newX,
        y: newY,
      });
    }
  }, [isDragging, selectedObjectId, dragOffset, send, sendCursorUpdate]);

  /**
   * Manipulador de clique no quadro
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!boardRef.current || !isConnected) return;

    const rect = boardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Se a ferramenta ativa for STICKY_NOTE, criar uma nova nota
    if (activeTool === 'STICKY_NOTE') {
      if (currentUserRole === 'viewer') {
        alert('Viewers não podem criar objetos');
        return;
      }

      const objectId = `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const stickyNoteData: StickyNoteData = {
        x: x - 100, // Centralizar
        y: y - 50,
        text: 'Nova nota...',
        width: 200,
        height: 100,
        color: '#ffeb3b', // Amarelo
      };

      send({
        type: 'CREATE_OBJECT',
        objectId,
        objectType: 'STICKY_NOTE',
        data: stickyNoteData,
      });
    }
  }, [activeTool, send, isConnected, currentUserRole]);

  /**
   * Manipulador de clique em um objeto
   */
  const handleObjectMouseDown = useCallback((e: React.MouseEvent, object: BoardObject) => {
    e.stopPropagation();

    if (activeTool !== 'SELECT') return;
    if (currentUserRole === 'viewer') return;

    setSelectedObjectId(object.id);
    setIsDragging(true);

    // Calcular offset para arrastar suavemente
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      setDragOffset({
        x: clickX - object.data.x,
        y: clickY - object.data.y,
      });
    }
  }, [activeTool, currentUserRole]);

  /**
   * Manipulador de fim de arrasto
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Editar texto de uma nota adesiva
   */
  const handleStickyNoteEdit = useCallback((objectId: string, newText: string) => {
    if (currentUserRole === 'viewer') return;

    send({
      type: 'UPDATE_OBJECT',
      objectId,
      data: { text: newText },
    });
  }, [send, currentUserRole]);

  /**
   * Deletar um objeto
   */
  const handleDeleteObject = useCallback((objectId: string) => {
    if (currentUserRole === 'viewer') {
      alert('Viewers não podem deletar objetos');
      return;
    }

    send({
      type: 'DELETE_OBJECT',
      objectId,
    });

    if (selectedObjectId === objectId) {
      setSelectedObjectId(null);
    }
  }, [send, selectedObjectId, currentUserRole]);

  /**
   * Renderizar objeto do quadro
   */
  const renderObject = (object: BoardObject) => {
    switch (object.type) {
      case 'STICKY_NOTE':
        return (
          <StickyNote
            key={object.id}
            object={object}
            isSelected={selectedObjectId === object.id}
            onMouseDown={(e) => handleObjectMouseDown(e, object)}
            onEdit={(newText) => handleStickyNoteEdit(object.id, newText)}
            onDelete={() => handleDeleteObject(object.id)}
            canEdit={currentUserRole === 'editor'}
          />
        );

      default:
        return null;
    }
  };

  /**
   * Listener global de mouse up
   */
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div
      ref={boardRef}
      className={`
        board-canvas
        w-full h-screen bg-gray-100 relative overflow-hidden
        ${activeTool === 'SELECT' ? 'tool-select' : ''}
        ${activeTool === 'PEN' ? 'tool-pen' : ''}
        ${isDragging ? 'grabbing' : ''}
      `}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
    >
      {/* Grid de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Renderizar todos os objetos */}
      {Array.from(objects.values()).map(renderObject)}

      {/* Renderizar cursores de outros usuários */}
      <Cursors />

      {/* Indicador de status quando não conectado */}
      {!isConnected && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-xl border-2 border-red-300">
          <div className="flex items-center gap-3">
            <div className="spinner" />
            <div>
              <h3 className="text-lg font-bold text-gray-800">Conectando ao servidor...</h3>
              <p className="text-sm text-gray-600">Aguarde um momento</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente StickyNote
 */
interface StickyNoteProps {
  object: BoardObject;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onEdit: (newText: string) => void;
  onDelete: () => void;
  canEdit: boolean;
}

function StickyNote({ object, isSelected, onMouseDown, onEdit, onDelete, canEdit }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState((object.data as StickyNoteData).text);
  const data = object.data as StickyNoteData;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEdit) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== data.text) {
      onEdit(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setText(data.text);
    }
  };

  return (
    <div
      data-testid={`board-object-${object.id}`}
      className={`
        sticky-note board-object absolute cursor-move
        ${isSelected ? 'selected' : ''}
        fade-in
      `}
      style={{
        left: `${data.x}px`,
        top: `${data.y}px`,
        width: `${data.width}px`,
        minHeight: `${data.height}px`,
        backgroundColor: data.color,
        padding: '12px',
        borderRadius: '4px',
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Botão de deletar */}
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-colors"
          title="Deletar nota"
        >
          ×
        </button>
      )}

      {/* Conteúdo da nota */}
      {isEditing ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent border-none outline-none resize-none font-inherit"
          style={{ minHeight: `${data.height - 24}px` }}
        />
      ) : (
        <div className="text-sm leading-relaxed">
          {data.text}
        </div>
      )}

      {/* Indicador de quem modificou por último */}
      <div className="mt-2 text-xs text-gray-600 opacity-70">
        {object.lastModifiedBy && `Modificado por ${object.lastModifiedBy.slice(0, 8)}...`}
      </div>
    </div>
  );
}
