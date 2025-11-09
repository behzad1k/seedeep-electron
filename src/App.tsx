import { ThemeProvider } from '@/contexts/ThemeContext';
import { BackendHealthIndicator } from '@components/layout/BackendHealthIndicator.tsx';
import MainLayout from '@core/layouts/MainLayout.tsx';
import React from 'react';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainLayout />
      <BackendHealthIndicator position="top-right" />
    </ThemeProvider>
  );
};

export default App;