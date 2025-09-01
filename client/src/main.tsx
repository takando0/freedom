import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles.css';
import Led from './routes/Led';
import Tablet from './routes/Tablet';
import Admin from './routes/Admin';

const router = createBrowserRouter([
  { path: '/', element: <Led /> },
  { path: '/led', element: <Led /> },
  { path: '/tablet', element: <Tablet /> },
  { path: '/tablet/:playerId', element: <Tablet /> },
  { path: '/admin', element: <Admin /> },
]);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);



