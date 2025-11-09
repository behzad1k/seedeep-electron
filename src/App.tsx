import { ThemeProvider } from '@/contexts/ThemeContext';
import MainLayout from '@core/layouts/MainLayout.tsx';
import React from 'react';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainLayout />
    </ThemeProvider>
  );
};

export default App;