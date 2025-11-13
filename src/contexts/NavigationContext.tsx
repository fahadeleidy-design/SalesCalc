import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  currentPath: string;
  navigate: (path: string) => void;
  resetNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState('/dashboard');

  const navigate = (path: string) => {
    setCurrentPath(path);
  };

  const resetNavigation = () => {
    setCurrentPath('/dashboard');
  };

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
