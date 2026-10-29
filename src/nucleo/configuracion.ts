import { z } from 'zod';

// Variables de entorno del portal (docs/entorno-local.md, «Variables de entorno por proyecto»), validadas al iniciar.
const esquemaEntorno = z.object({
  VITE_KEYCLOAK_URL: z.url({ protocol: /^https?$/ }),
  VITE_KEYCLOAK_REALM: z.string().trim().min(1),
  VITE_KEYCLOAK_CLIENT_ID: z.string().trim().min(1),
  VITE_OBRAS_URL: z.url({ protocol: /^https?$/ }),
});

export interface Configuracion {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  obrasUrl: string;
}

/** Valida las variables de entorno; si falta alguna o no es válida, lanza un error que dice cuál. */
export function leerConfiguracion(entorno: Record<string, unknown>): Configuracion {
  const resultado = esquemaEntorno.safeParse(entorno);
  if (!resultado.success) {
    const detalle = resultado.error.issues.map((problema) => `${problema.path.join('.')}: ${problema.message}`);
    throw new Error(`Configuración inválida del portal (revisa .env, ver .env.example). ${detalle.join('; ')}`);
  }
  const datos = resultado.data;
  return {
    keycloakUrl: datos.VITE_KEYCLOAK_URL.replace(/\/+$/, ''),
    realm: datos.VITE_KEYCLOAK_REALM,
    clientId: datos.VITE_KEYCLOAK_CLIENT_ID,
    obrasUrl: datos.VITE_OBRAS_URL.replace(/\/+$/, ''),
  };
}
