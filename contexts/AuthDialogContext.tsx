'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type AuthDialogContextType = {
  openLoginDialog: () => void;
  openRegisterDialog: () => void;
  isLoginOpen: boolean;
  isRegisterOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  setRegisterOpen: (open: boolean) => void;
};

const AuthDialogContext = createContext<AuthDialogContextType | undefined>(undefined);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const openLoginDialog = () => {
    setLoginOpen(true);
    setRegisterOpen(false);
  };

  const openRegisterDialog = () => {
    setRegisterOpen(true);
    setLoginOpen(false);
  };

  return (
    <AuthDialogContext.Provider
      value={{
        openLoginDialog,
        openRegisterDialog,
        isLoginOpen: loginOpen,
        isRegisterOpen: registerOpen,
        setLoginOpen,
        setRegisterOpen,
      }}
    >
      {children}
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error('useAuthDialog must be used within AuthDialogProvider');
  }
  return context;
}

