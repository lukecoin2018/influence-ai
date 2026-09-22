import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // `server-only` throws unless the bundler sets the `react-server`
      // export condition, which vitest does not. The package ships an
      // empty.js for exactly this; aliasing to it lets a test import a module
      // that carries the marker (lib/creator-requests/fulfil.ts) without
      // weakening what the marker does in the real build, where Next resolves
      // the package normally.
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
});
