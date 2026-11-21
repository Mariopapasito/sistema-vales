import React from 'react';
import { createRoot } from 'react-dom/client';
import SecugenTest from './components/SecugenTest';
import './styles/ReaderTestPage.css';

// Standalone hardware test: no Redux session, API client, analytics or service worker.
createRoot(document.getElementById('root')!).render(<React.StrictMode><main className="reader-test-page"><SecugenTest /></main></React.StrictMode>);
