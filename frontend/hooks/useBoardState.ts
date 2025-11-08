/**
 * useBoardState.ts
 * Hook Zustand para gerenciar o estado global do quadro
 */

import { create } from 'zustand';
import {
  BoardObject,
  User,
  Cursor,
  Tool,
  UserRole,
  BoardState,
} from '@/lib/types';

interface BoardActions {
  // Ações de objetos
  addObject: (object: BoardObject) => void;
  updateObject: (objectId: string, data: Partial<BoardObject['data']>) => void;
  deleteObject: (objectId: string) => void;
  moveObject: (objectId: string, x: number, y: number, lastModified: number, lastModifiedBy: string) => void;
  clearAllObjects: () => void;

  // Ações de usuários
  setCurrentUser: (userId: string, role: UserRole) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;

  // Ações de cursores
  updateCursor: (userId: string, x: number, y: number) => void;
  removeCursor: (userId: string) => void;

  // Ações de ferramentas
  setActiveTool: (tool: Tool) => void;

  // Ações de conexão
  setConnected: (isConnected: boolean) => void;

  // Limpar todo o estado
  resetState: () => void;

  // Inicializar estado do servidor
  initializeFromServer: (data: {
    objects: BoardObject[];
    users: User[];
    cursors: Cursor[];
  }) => void;
}

const initialState: BoardState = {
  objects: new Map(),
  users: new Map(),
  cursors: new Map(),
  currentUserId: null,
  currentUserRole: 'editor',
  activeTool: 'SELECT',
  isConnected: false,
};

export const useBoardState = create<BoardState & BoardActions>((set, get) => ({
  ...initialState,

  // Ações de objetos
  addObject: (object) => {
    set((state) => {
      const newObjects = new Map(state.objects);
      newObjects.set(object.id, object);
      return { objects: newObjects };
    });
  },

  updateObject: (objectId, data) => {
    set((state) => {
      const newObjects = new Map(state.objects);
      const existingObject = newObjects.get(objectId);

      if (existingObject) {
        newObjects.set(objectId, {
          ...existingObject,
          data: { ...existingObject.data, ...data },
        });
      }

      return { objects: newObjects };
    });
  },

  deleteObject: (objectId) => {
    set((state) => {
      const newObjects = new Map(state.objects);
      newObjects.delete(objectId);
      return { objects: newObjects };
    });
  },

  moveObject: (objectId, x, y, lastModified, lastModifiedBy) => {
    set((state) => {
      const newObjects = new Map(state.objects);
      const existingObject = newObjects.get(objectId);

      if (existingObject) {
        newObjects.set(objectId, {
          ...existingObject,
          data: { ...existingObject.data, x, y },
          lastModified,
          lastModifiedBy,
        });
      }

      return { objects: newObjects };
    });
  },

  clearAllObjects: () => {
    set({ objects: new Map() });
  },

  // Ações de usuários
  setCurrentUser: (userId, role) => {
    set({ currentUserId: userId, currentUserRole: role });
  },

  addUser: (user) => {
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.set(user.id, user);
      return { users: newUsers };
    });
  },

  removeUser: (userId) => {
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.delete(userId);
      return { users: newUsers };
    });
  },

  // Ações de cursores
  updateCursor: (userId, x, y) => {
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.set(userId, { userId, x, y, timestamp: Date.now() });
      return { cursors: newCursors };
    });
  },

  removeCursor: (userId) => {
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.delete(userId);
      return { cursors: newCursors };
    });
  },

  // Ações de ferramentas
  setActiveTool: (tool) => {
    set({ activeTool: tool });
  },

  // Ações de conexão
  setConnected: (isConnected) => {
    set({ isConnected });
  },

  // Limpar todo o estado
  resetState: () => {
    set(initialState);
  },

  // Inicializar estado do servidor
  initializeFromServer: (data) => {
    const newObjects = new Map<string, BoardObject>();
    data.objects.forEach((obj) => {
      newObjects.set(obj.id, obj);
    });

    const newUsers = new Map<string, User>();
    data.users.forEach((user) => {
      newUsers.set(user.id, user);
    });

    const newCursors = new Map<string, Cursor>();
    data.cursors.forEach((cursor) => {
      newCursors.set(cursor.userId, cursor);
    });

    set({
      objects: newObjects,
      users: newUsers,
      cursors: newCursors,
    });
  },
}));
