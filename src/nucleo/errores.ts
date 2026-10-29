import { ErrorApi } from '../api/cliente';

// Texto que ve el cliente por cada `codigo` que puede recibir el portal (docs/mensajes.md de la carpeta general,
// columna «Se ve en»: portal y genéricos). Un código que no está aquí se muestra con el genérico de su estado HTTP.

const MENSAJES: Readonly<Record<string, string>> = {
  DATOS_INVALIDOS: 'Algunos datos no son válidos. Revisa los campos marcados.',
  PAGINACION_INVALIDA: 'No se pudo cargar la lista. Recarga la página.',
  NO_AUTENTICADO: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  SIN_PERMISO: 'No tienes permiso para hacer esta acción.',
  RUTA_NO_ENCONTRADA: 'No encontramos lo que buscas. Puede que ya no exista o que no tengas acceso.',
  ARCHIVO_DEMASIADO_GRANDE: 'El envío supera el tamaño permitido.',
  DEMASIADAS_PETICIONES: 'Hiciste muchas solicitudes seguidas. Espera un momento e intenta de nuevo.',
  ERROR_INTERNO: 'Ocurrió un error inesperado. Intenta de nuevo; si se repite, avisa a soporte.',
  SERVICIO_NO_DISPONIBLE: 'Este servicio no está disponible por el momento. Intenta de nuevo en unos minutos.',
  TIEMPO_AGOTADO: 'El servidor tardó demasiado en responder. Intenta de nuevo.',
  OBRA_NO_ENCONTRADA: 'Obra no encontrada',
  PLANILLA_NO_ENCONTRADA: 'Planilla no encontrada',
  PLANILLA_NO_PRESENTADA: 'Esta planilla ya no está esperando tu revisión. Recarga para ver su estado actual.',
  MOTIVO_INVALIDO: 'El motivo debe tener entre 10 y 500 caracteres.',
};

/** Genérico por estado para los códigos que el portal no conoce («Genéricos» de docs/mensajes.md). */
const GENERICO_POR_ESTADO: Readonly<Record<number, string>> = {
  400: MENSAJES['DATOS_INVALIDOS']!,
  401: MENSAJES['NO_AUTENTICADO']!,
  403: MENSAJES['SIN_PERMISO']!,
  404: 'No encontramos lo que buscas. Puede que ya no exista o que no tengas acceso.',
  409: 'Los datos cambiaron mientras trabajabas. Recarga para ver la última versión.',
  413: MENSAJES['ARCHIVO_DEMASIADO_GRANDE']!,
  422: 'No se pudo completar la operación porque no cumple una regla del sistema.',
  429: MENSAJES['DEMASIADAS_PETICIONES']!,
  500: MENSAJES['ERROR_INTERNO']!,
  503: MENSAJES['SERVICIO_NO_DISPONIBLE']!,
  504: MENSAJES['TIEMPO_AGOTADO']!,
};

export const MENSAJE_SIN_CONEXION =
  'No hay conexión con el servidor. Revisa tu conexión a internet e intenta de nuevo.';
export const MENSAJE_TIEMPO_CLIENTE = 'La respuesta está tardando demasiado. Revisa tu conexión e intenta de nuevo.';

/** Mensaje para el usuario según el `codigo` del error; el `detail` del servicio nunca se muestra. */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof ErrorApi)) return MENSAJES['ERROR_INTERNO']!;
  if (error.tipo === 'red') return MENSAJE_SIN_CONEXION;
  if (error.tipo === 'tiempo') return MENSAJE_TIEMPO_CLIENTE;
  const conocido = error.codigo ? MENSAJES[error.codigo] : undefined;
  if (conocido) return conocido;
  const estado = error.estado ?? 500;
  return GENERICO_POR_ESTADO[estado] ?? (estado >= 500 ? MENSAJES['ERROR_INTERNO']! : GENERICO_POR_ESTADO[422]!);
}

/** `true` si el error es un «no encontrado» (404), para mostrar la pantalla de recurso inexistente. */
export function esNoEncontrado(error: unknown): boolean {
  return error instanceof ErrorApi && error.estado === 404;
}
