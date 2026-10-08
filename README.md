# CineAdapt - PWA movil (Ionic + Angular) - Entrega 1

PWA instalable (sin APK). Arquitectura POO: `models/` (clases), `services/` (GeoService, TimeService, InstallService, ApiService), `home/` (pagina).
Estilo "americano": Ionic en modo iOS (`provideIonicAngular({ mode: 'ios' })` en `src/app/app.config.ts`; cambiar a `'md'` para Material).

## Ejecutar
    npm install
    npm start                      # desarrollo en http://localhost:4200 (service worker desactivado)

## Probar PWA instalable (build de produccion)
    npm run build
    npx http-server dist/movil-pwa/browser -p 4300 -c-1
Abrir http://localhost:4300 en Chrome. En el celular: conectar por USB, `chrome://inspect` > Port forwarding 4300 -> localhost:4300
(el GPS y el service worker exigen HTTPS o localhost; una IP de red local por HTTP NO funciona). Al desplegar usa HTTPS (Vercel).

## Pantallas
Login / Registro, pestañas (Inicio, Buscar, Mi lista, Perfil), detalle con temporadas y episodios, Perfil con la lectura del GPS (Entrega 1).

## Conexion con el backend
- URL en `src/environments/environment.ts` (`apiBase`, por defecto `http://localhost:4000/api`).
- En el backend (`src/server.js`) agrega a `allowedOrigins`: `http://localhost:4200` y `http://localhost:4300`.
- Usuarios de prueba: demo@cineadapt.com / user123.
