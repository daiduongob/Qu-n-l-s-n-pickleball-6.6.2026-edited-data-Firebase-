import { createContext, useContext, useEffect, useState } from 'react';
import { AppState, User, Court, MatchHistory } from './types';
import { fetchState, callApi } from './api';

interface AppContextType extends AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  refreshState: () => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  setActiveTab: (tab: string) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('Missing AppContext');
  return ctx;
};
