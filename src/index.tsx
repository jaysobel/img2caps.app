import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './keymason.css';
// Explicitly import the TSX component
import App from './App.tsx';
import reportWebVitals from './reportWebVitals.js';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to!");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 