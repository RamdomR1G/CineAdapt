/** Reglas de registro compartidas con el backend (auth.controller.js). Una sola fuente de verdad en el cliente. */
export const PASSWORD_MIN = 8;
export const NOMBRE_MAX = 100;
export const CORREO_MAX = 150;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Devuelve el texto del primer error encontrado, o null si los datos son validos. Nunca lanza. */
export function validarRegistro(name: string, email: string, password: string): string | null {
  const n = (name ?? '').toString().trim();
  const e = (email ?? '').toString().trim();
  const p = (password ?? '').toString();
  if (!n || !e || !p) return 'Todos los campos son obligatorios.';
  if (n.length > NOMBRE_MAX || e.length > CORREO_MAX) return 'Nombre o correo demasiado largo.';
  if (!CORREO_RE.test(e)) return 'Correo con formato invalido.';
  if (p.length < PASSWORD_MIN) return `La contrasena debe tener minimo ${PASSWORD_MIN} caracteres.`;
  return null;
}

/** Traduce un error HTTP a un mensaje para el usuario. Nunca lanza. */
export function mensajeErrorRegistro(e: any): string {
  if (e?.status === 0) return 'Sin conexion con el servidor. Revisa tu internet e intenta de nuevo.';
  const msg = e?.error?.message ?? e?.error?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.status >= 500) return 'El servidor no esta disponible por el momento. Intenta mas tarde.';
  return 'No se pudo crear la cuenta.';
}
