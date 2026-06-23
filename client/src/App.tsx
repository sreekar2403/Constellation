import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useThemeStore } from './store/useThemeStore';

function App() {
  const { theme } = useThemeStore();

  // Apply theme on mount + when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <RouterProvider router={router} />;
}

export default App;
