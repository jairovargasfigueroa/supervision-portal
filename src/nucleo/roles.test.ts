import { describe, expect, it } from 'vitest';
import { nombreDeRol, rolesEfectivos, tieneAcceso } from './roles';

describe('rolesEfectivos', () => {
  it('en el portal cuenta solo el rol cliente', () => {
    expect(rolesEfectivos(['default-roles-supervision', 'residente', 'cliente'], 'portal')).toEqual(['cliente']);
  });

  it('en el ERP y la app cuentan solo los roles internos', () => {
    expect(rolesEfectivos(['residente', 'cliente'], 'erp')).toEqual(['residente']);
    expect(rolesEfectivos(['maestro', 'cliente'], 'app-obra')).toEqual(['maestro']);
  });

  it('un azp desconocido o ausente no da ningún rol', () => {
    expect(rolesEfectivos(['cliente'], 'gateway')).toEqual([]);
    expect(rolesEfectivos(['cliente'], undefined)).toEqual([]);
  });

  it('no repite roles', () => {
    expect(rolesEfectivos(['cliente', 'cliente'], 'portal')).toEqual(['cliente']);
  });
});

describe('tieneAcceso', () => {
  it('entra al portal quien tiene cliente e inició sesión con el portal', () => {
    expect(tieneAcceso(['default-roles-supervision', 'cliente'], 'portal')).toBe(true);
  });

  it('un usuario residente y cliente (demo1) entra al portal como cliente', () => {
    expect(tieneAcceso(['residente', 'cliente'], 'portal')).toBe(true);
  });

  it('sin el rol cliente no entra', () => {
    expect(tieneAcceso(['default-roles-supervision', 'residente'], 'portal')).toBe(false);
    expect(tieneAcceso([], 'portal')).toBe(false);
  });

  it('con un token de otra aplicación no entra aunque tenga cliente', () => {
    expect(tieneAcceso(['residente', 'cliente'], 'erp')).toBe(false);
  });
});

describe('nombreDeRol', () => {
  it('muestra el nombre del rol', () => {
    expect(nombreDeRol('cliente')).toBe('Cliente');
    expect(nombreDeRol('otro')).toBe('otro');
  });
});
