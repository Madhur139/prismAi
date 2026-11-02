/*
  VITE CONFIGURATION
  - Controls the frontend development/build tooling.
*/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { port: 5173 } });
