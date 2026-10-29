// Roles por aplicación (001, criterio 3) y regla de «Usuario con varios roles» (docs/convenciones.md):
// cada aplicación cuenta solo los roles de la aplicación desde la que se inició sesión, que viene en `azp`.

/** Roles que valen en cada aplicación, por `azp` (cliente de Keycloak con el que se inició sesión). */
export const ROLES_POR_APLICACION: Readonly<Record<string, readonly string[]>> = {
  erp: ['admin', 'residente', 'gerente'],
  portal: ['cliente'],
  'app-obra': ['maestro', 'almacenero'],
};

/** Rol que da acceso al portal. */
export const ROL_CLIENTE = 'cliente';

const NOMBRES_DE_ROL: Readonly<Record<string, string>> = {
  admin: 'Administrador',
  residente: 'Residente',
  gerente: 'Gerente',
  maestro: 'Maestro de obra',
  almacenero: 'Almacenero',
  cliente: 'Cliente',
};

/**
 * Roles del token que cuentan en la aplicación del `azp`. Los demás (los de otras aplicaciones y los técnicos de
 * Keycloak como `default-roles-supervision`) se ignoran. Un `azp` desconocido no da ningún rol.
 */
export function rolesEfectivos(roles: readonly string[], azp: string | undefined): string[] {
  const permitidos = azp ? ROLES_POR_APLICACION[azp] : undefined;
  if (!permitidos) return [];
  return roles.filter((rol, indice) => permitidos.includes(rol) && roles.indexOf(rol) === indice);
}

/** El usuario puede usar el portal solo si inició sesión con el cliente `portal` y tiene el rol `cliente`. */
export function tieneAcceso(roles: readonly string[], azp: string | undefined): boolean {
  return rolesEfectivos(roles, azp).includes(ROL_CLIENTE);
}

/** Nombre del rol para mostrarlo en la barra superior (001, criterio 11). */
export function nombreDeRol(rol: string): string {
  return NOMBRES_DE_ROL[rol] ?? rol;
}
