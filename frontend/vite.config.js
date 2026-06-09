import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site at https://<user>.github.io/DEEP-SIGN/
// so all asset URLs must be prefixed with /DEEP-SIGN/.
// In development (vite dev) the base resolves to '/'.
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/DEEP-SIGN/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
