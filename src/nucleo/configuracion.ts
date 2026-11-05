import { z } from 'zod';

// Configuración del portal (601). La compilación es una sola: al publicar, el script de infra escribe
// configuracion.json junto a index.html (configuracion.json.plantilla). En desarrollo el archivo no está y se usan
// las variables VITE_* de .env (docs/entorno-local.md) o, si faltan, los valores de desarrollo de .env.example. En la
// compilación publicada solo vale configuracion.json: sin el archivo o con un campo de menos, el portal no arranca.

/** Valores de desarrollo (los de .env.example). */
export const ENTORNO_DESARROLLO = {
  VITE_KEYCLOAK_URL: 'http://localhost:8080',
  VITE_KEYCLOAK_REALM: 'supervision',
  VITE_KEYCLOAK_CLIENT_ID: 'portal',
  VITE_OBRAS_URL: 'http://localhost:8081',
  VITE_ERP_URL: 'http://localhost:4200',
} as const;

const esquemaEntorno = z.object({
  VITE_KEYCLOAK_URL: z.url({ protocol: /^https?$/ }),
  VITE_KEYCLOAK_REALM: z.string().trim().min(1),
  VITE_KEYCLOAK_CLIENT_ID: z.string().trim().min(1),
  VITE_OBRAS_URL: z.url({ protocol: /^https?$/ }),
  VITE_ERP_URL: z.url({ protocol: /^https?$/ }),
});

/** Campos de configuracion.json y la variable que reemplazan. */
const CAMPOS_PUBLICADOS = {
  keycloakUrl: 'VITE_KEYCLOAK_URL',
  keycloakRealm: 'VITE_KEYCLOAK_REALM',
  obrasUrl: 'VITE_OBRAS_URL',
  erpUrl: 'VITE_ERP_URL',
} as const;

export interface Configuracion {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  obrasUrl: string;
  erpUrl: string;
}

const sinBarraFinal = (url: string) => url.replace(/\/+$/, '');

/** Un texto no vacío, o `undefined` (así manda el siguiente respaldo). */
const texto = (valor: unknown) => (typeof valor === 'string' && valor.trim() !== '' ? valor : undefined);

/**
 * Desarrollo: `vite`, o la versión compilada servida en localhost (`vite preview`). Una publicación (producción local
 * en `*.localhost` o la nube) nunca lo es.
 */
export function esDesarrollo(
  modoDesarrollo: boolean = import.meta.env.DEV,
  host: string = globalThis.location?.hostname ?? '',
): boolean {
  return modoDesarrollo || host === 'localhost' || host === '127.0.0.1';
}

/**
 * Valida las variables; si alguna no es válida, lanza un error que dice cuál. En desarrollo, las que faltan toman el
 * valor de desarrollo; publicado, solo el cliente (`portal`), que no es una dirección.
 */
export function leerConfiguracion(entorno: Record<string, unknown>, desarrollo = true): Configuracion {
  const respaldo: Record<string, string> = desarrollo
    ? ENTORNO_DESARROLLO
    : { VITE_KEYCLOAK_CLIENT_ID: ENTORNO_DESARROLLO.VITE_KEYCLOAK_CLIENT_ID };
  const conRespaldo = Object.fromEntries(
    Object.keys(ENTORNO_DESARROLLO).map((nombre) => [nombre, entorno[nombre] ?? respaldo[nombre]]),
  );
  const resultado = esquemaEntorno.safeParse(conRespaldo);
  if (!resultado.success) {
    const detalle = resultado.error.issues.map((problema) => `${problema.path.join('.')}: ${problema.message}`);
    throw new Error(
      `Configuración inválida del portal (revisa configuracion.json o .env, ver .env.example). ${detalle.join('; ')}`,
    );
  }
  const datos = resultado.data;
  return {
    keycloakUrl: sinBarraFinal(datos.VITE_KEYCLOAK_URL),
    realm: datos.VITE_KEYCLOAK_REALM,
    clientId: datos.VITE_KEYCLOAK_CLIENT_ID,
    obrasUrl: sinBarraFinal(datos.VITE_OBRAS_URL),
    erpUrl: sinBarraFinal(datos.VITE_ERP_URL),
  };
}

/** Lo que trae configuracion.json, con el nombre de la variable que reemplaza; ignora lo vacío o que no es texto. */
export function entornoPublicado(datos: unknown): Record<string, string> {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    return {};
  }
  const entorno: Record<string, string> = {};
  for (const [campo, variable] of Object.entries(CAMPOS_PUBLICADOS)) {
    const valor = texto((datos as Record<string, unknown>)[campo]);
    if (valor !== undefined) {
      entorno[variable] = valor.trim();
    }
  }
  return entorno;
}

async function leerArchivoPublicado(obtener: typeof fetch, desarrollo: boolean): Promise<Record<string, string>> {
  try {
    const respuesta = await obtener('/configuracion.json', { cache: 'no-cache' });
    if (!respuesta.ok) {
      throw new Error(`configuracion.json del portal respondió ${respuesta.status} (lo escribe infra al publicar).`);
    }
    return entornoPublicado(await respuesta.json());
  } catch (error) {
    if (!desarrollo) {
      throw error instanceof SyntaxError
        ? new Error('configuracion.json del portal no es JSON: falta el archivo (lo escribe infra al publicar).')
        : error;
    }
    // Sin el archivo (el servidor de desarrollo de Vite devuelve index.html) o sin red: se usa .env
    return {};
  }
}

/**
 * Carga la configuración antes de montar React: configuracion.json (al publicar) manda sobre las variables VITE_* de
 * .env y estas sobre los valores de desarrollo. En desarrollo rechaza solo si un valor no es válido; publicado, también
 * si falta el archivo o uno de sus campos (nunca usa .env ni los valores de desarrollo).
 */
export async function cargarConfiguracion(
  entorno: Record<string, unknown>,
  obtener: typeof fetch = (entrada, opciones) => fetch(entrada, opciones),
  desarrollo: boolean = esDesarrollo(),
): Promise<Configuracion> {
  const variables = Object.fromEntries(
    Object.keys(ENTORNO_DESARROLLO)
      .filter((nombre) => desarrollo || nombre === 'VITE_KEYCLOAK_CLIENT_ID')
      .map((nombre) => [nombre, texto(entorno[nombre])]),
  );
  return leerConfiguracion({ ...variables, ...(await leerArchivoPublicado(obtener, desarrollo)) }, desarrollo);
}
