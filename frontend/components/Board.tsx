'use client';

/**
 * Board.tsx
 * Componente principal do quadro colaborativo
 * Renderiza objetos, lida com interações do mouse e sincroniza com WebSocket
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useBoardState } from '@/hooks/useBoardState';
import { useWebSocket } from './WebSocketProvider';
import { StickyNoteData, BoardObject, DrawingData } from '@/lib/types';
import { Cursors } from './Cursors';

export function Board() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const lastCursorSendTime = useRef(0);

  // Estado para desenho com caneta
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{ x: number; y: number }[]>([]);

  // Estado para pan e zoom do canvas
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  const { objects, activeTool, currentUserRole, setActiveTool } = useBoardState();
  const { send, isConnected } = useWebSocket();

  /**
   * Converter coordenadas da tela para coordenadas do canvas
   */
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  }, [pan, zoom]);

  /**
   * Envia atualização de posição do cursor (throttled para não sobrecarregar)
   */
  const sendCursorUpdate = useCallback((x: number, y: number) => {
    const now = Date.now();
    // Enviar apenas a cada 50ms (20 atualizações por segundo)
    if (now - lastCursorSendTime.current > 50) {
      const canvasPos = screenToCanvas(x, y);
      send({
        type: 'CURSOR_MOVE',
        x: canvasPos.x,
        y: canvasPos.y,
      });
      lastCursorSendTime.current = now;
    }
  }, [send, screenToCanvas]);

  /**
   * Handler de zoom (scroll do mouse)
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 5);

    // Zoom centrado no cursor
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPan = {
        x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
        y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
      };

      setPan(newPan);
      setZoom(newZoom);
    }
  }, [zoom, pan]);

  /**
   * Manipulador de movimento do mouse no quadro
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Enviar posição do cursor
    sendCursorUpdate(screenX, screenY);

    // Se estiver fazendo pan do canvas
    if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - panStart.x),
        y: pan.y + (e.clientY - panStart.y),
      });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const canvasPos = screenToCanvas(screenX, screenY);

    // Se estiver desenhando com caneta
    if (isDrawing && activeTool === 'PEN') {
      setCurrentDrawing(prev => [...prev, canvasPos]);
      return;
    }

    // Se estiver arrastando um objeto
    if (isDragging && selectedObjectId) {
      const newX = canvasPos.x - dragOffset.x;
      const newY = canvasPos.y - dragOffset.y;

      // Enviar atualização de posição via WebSocket
      send({
        type: 'MOVE_OBJECT',
        objectId: selectedObjectId,
        x: newX,
        y: newY,
      });
    }
  }, [isDragging, selectedObjectId, dragOffset, send, sendCursorUpdate, isDrawing, activeTool, isPanning, pan, panStart, screenToCanvas]);

  /**
   * Manipulador de clique no quadro
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!boardRef.current || !isConnected) return;

    const rect = boardRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas(screenX, screenY);

    // Botão do meio ou Espaço + clique esquerdo = Pan
    if (e.button === 1 || (spacePressed && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Se a ferramenta ativa for PEN, iniciar desenho
    if (activeTool === 'PEN') {
      if (currentUserRole === 'viewer') {
        alert('Viewers não podem desenhar');
        return;
      }
      setIsDrawing(true);
      setCurrentDrawing([canvasPos]);
      return;
    }

    // Se a ferramenta ativa for STICKY_NOTE, criar uma nova nota
    if (activeTool === 'STICKY_NOTE') {
      if (currentUserRole === 'viewer') {
        alert('Viewers não podem criar objetos');
        return;
      }

      const objectId = `sticky_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const stickyNoteData: StickyNoteData = {
        x: canvasPos.x - 100, // Centralizar
        y: canvasPos.y - 50,
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

      // Auto-switch para SELECT após criar
      setActiveTool('SELECT');
    }
  }, [activeTool, send, isConnected, currentUserRole, screenToCanvas, spacePressed, setActiveTool]);

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
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasPos = screenToCanvas(screenX, screenY);

      setDragOffset({
        x: canvasPos.x - object.data.x,
        y: canvasPos.y - object.data.y,
      });
    }
  }, [activeTool, currentUserRole, screenToCanvas]);

  /**
   * Manipulador de fim de arrasto/desenho/pan
   */
  const handleMouseUp = useCallback(() => {
    // Se estava desenhando, criar o objeto de desenho
    if (isDrawing && currentDrawing.length > 1) {
      const objectId = `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calcular bounding box do desenho
      const xs = currentDrawing.map(p => p.x);
      const ys = currentDrawing.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);

      // Normalizar pontos em relação ao ponto inicial
      const normalizedPoints = currentDrawing.map(p => ({
        x: p.x - minX,
        y: p.y - minY
      }));

      const drawingData: DrawingData = {
        x: minX,
        y: minY,
        points: normalizedPoints,
        color: '#000000',
        width: 3,
      };

      send({
        type: 'CREATE_OBJECT',
        objectId,
        objectType: 'DRAWING',
        data: drawingData,
      });

      setCurrentDrawing([]);

      // Auto-switch para SELECT após desenhar
      setActiveTool('SELECT');
    }

    setIsDrawing(false);
    setIsDragging(false);
    setIsPanning(false);
  }, [isDrawing, currentDrawing, send, setActiveTool]);

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

      case 'DRAWING':
        return (
          <Drawing
            key={object.id}
            object={object}
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

  /**
   * Listeners de teclado para tecla Espaço (pan)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spacePressed]);

  return (
    <div
      ref={boardRef}
      className={`
        board-canvas
        w-full h-screen bg-gray-100 relative overflow-hidden
        ${activeTool === 'SELECT' ? 'tool-select' : ''}
        ${activeTool === 'PEN' ? 'tool-pen' : ''}
        ${isDragging ? 'grabbing' : ''}
        ${isPanning || spacePressed ? 'cursor-grab' : ''}
      `}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      {/* Grid de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Container com transformação pan/zoom */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Renderizar todos os objetos */}
        {Array.from(objects.values()).map(renderObject)}

        {/* Preview do desenho em progresso */}
        {isDrawing && currentDrawing.length > 1 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
            <polyline
              points={currentDrawing.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#000000"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* Renderizar cursores de outros usuários */}
        <Cursors />
      </div>

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

/**
 * Componente Drawing (Desenho com caneta)
 */
interface DrawingProps {
  object: BoardObject;
  onDelete: () => void;
  canEdit: boolean;
}

function Drawing({ object, onDelete, canEdit }: DrawingProps) {
  const data = object.data as DrawingData;
  const [isHovered, setIsHovered] = useState(false);

  // Converter pontos para string SVG
  const pointsString = data.points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div
      data-testid={`board-object-${object.id}`}
      className="absolute pointer-events-auto"
      style={{
        left: `${data.x}px`,
        top: `${data.y}px`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* SVG do desenho */}
      <svg
        className="block"
        style={{
          width: `${Math.max(...data.points.map(p => p.x)) + 10}px`,
          height: `${Math.max(...data.points.map(p => p.y)) + 10}px`,
        }}
      >
        <polyline
          points={pointsString}
          fill="none"
          stroke={data.color}
          strokeWidth={data.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Botão de deletar (aparece ao passar o mouse) */}
      {canEdit && isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 transition-colors shadow-md"
          title="Deletar desenho"
        >
          ×
        </button>
      )}
    </div>
  );
}
