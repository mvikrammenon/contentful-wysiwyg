import React from 'react';
import ReactDOM from 'react-dom/client';
import { SDKProvider } from '@contentful/app-sdk';
import '@contentful/f36-components/dist/styles.css'; // Updated path
import '@contentful/f36-tokens/dist/tokens.css'; // Updated path
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SDKProvider>
      <App />
    </SDKProvider>
  </React.StrictMode>
);
