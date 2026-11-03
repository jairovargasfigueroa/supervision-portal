import { z } from 'zod';

// Configuración del portal (601). La compilación es una sola: al publicar, el script de infra escribe
// configuracion.json junto a index.html (configuracion.json.plantilla). En desarrollo el archivo no está y se usan
// las variables VITE_* de .env (docs/entorno-local.md) o, si faltan, los valores de desarrollo de .env.example.

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

/** Valida las variables; si alguna no es válida, lanza un error que dice cuál. Las que faltan toman el valor de desarrollo. */
export function leerConfiguracion(entorno: Record<string, unknown>): Configuracion {
  const conRespaldo = Object.fromEntries(
    Object.entries(ENTORNO_DESARROLLO).map(([nombre, desarrollo]) => [nombre, entorno[nombre] ?? desarrollo]),
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

async function leerArchivoPublicado(obtener: typeof fetch): Promise<Record<string, string>> {
  try {
    const respuesta = await obtener('/configuracion.json', { cache: 'no-cache' });
    return respuesta.ok ? entornoPublicado(await respuesta.json()) : {};
  } catch {
    // Sin el archivo (el servidor de desarrollo de Vite devuelve index.html) o sin red: se usa .env
    return {};
  }
}

/**
 * Carga la configuración antes de montar React: configuracion.json (al publicar) manda sobre las variables VITE_* de
 * .env y estas sobre los valores de desarrollo. Rechaza solo si un valor no es válido.
 */
export async function cargarConfiguracion(
  entorno: Record<string, unknown>,
  obtener: typeof fetch = (entrada, opciones) => fetch(entrada, opciones),
): Promise<Configuracion> {
  const variables = Object.fromEntries(
    Object.keys(ENTORNO_DESARROLLO).map((nombre) => [nombre, texto(entorno[nombre])]),
  );
  return leerConfiguracion({ ...variables, ...(await leerArchivoPublicado(obtener)) });
}
