import React from 'react';
import ReactDOM from 'react-dom/client';
import { IconContext } from '@phosphor-icons/react';
import { MotionConfig } from 'framer-motion';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import { App } from './App';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import './shared/tokens/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <IconContext.Provider value={{ weight: 'regular' }}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </IconContext.Provider>
    </MotionConfig>
  </React.StrictMode>
);
