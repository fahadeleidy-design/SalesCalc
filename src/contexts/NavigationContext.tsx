import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NavigationContextType {
  currentPath: string;
  navigate: (path: string) => void;
  resetNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState('/dashboard');

  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const resetNavigation = useCallback(() => {
    setCurrentPath('/dashboard');
  }, []);

  return (
    <NavigationContext.Provider value={{ currentPath, navigate, resetNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
