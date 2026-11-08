import { describe, expect, it } from 'vitest';
import { ErrorApi } from '../api/cliente';
import { esNoEncontrado, MENSAJE_SIN_CONEXION, MENSAJE_TIEMPO_CLIENTE, mensajeDeError } from './errores';

const respuesta = (estado: number, codigo?: string) => new ErrorApi({ tipo: 'respuesta', estado, codigo });

describe('mensajeDeError', () => {
  it('usa el texto del catálogo para los códigos del portal', () => {
    expect(mensajeDeError(respuesta(409, 'PLANILLA_NO_PRESENTADA'))).toBe(
      'Esta planilla ya no está esperando tu revisión. Recarga para ver su estado actual.',
    );
    expect(mensajeDeError(respuesta(422, 'MOTIVO_INVALIDO'))).toBe('El motivo debe tener entre 10 y 500 caracteres.');
    expect(mensajeDeError(respuesta(404, 'PLANILLA_NO_ENCONTRADA'))).toBe('Planilla no encontrada');
    expect(mensajeDeError(respuesta(404, 'OBRA_NO_ENCONTRADA'))).toBe('Obra no encontrada');
    expect(mensajeDeError(respuesta(503, 'SERVICIO_NO_DISPONIBLE'))).toBe(
      'Este servicio no está disponible por el momento. Intenta de nuevo en unos minutos.',
    );
  });

  it('un código desconocido muestra el genérico de su estado', () => {
    expect(mensajeDeError(respuesta(409, 'OTRO_CONFLICTO'))).toBe(
      'Los datos cambiaron mientras trabajabas. Recarga para ver la última versión.',
    );
    expect(mensajeDeError(respuesta(422, 'OTRA_REGLA'))).toBe(
      'No se pudo completar la operación porque no cumple una regla del sistema.',
    );
    expect(mensajeDeError(respuesta(404, 'OTRO_NO_ENCONTRADO'))).toBe(
      'No encontramos lo que buscas. Puede que ya no exista o que no tengas acceso.',
    );
    expect(mensajeDeError(respuesta(502))).toBe(
      'Ocurrió un error inesperado. Intenta de nuevo; si se repite, avisa a soporte.',
    );
  });

  it('distingue la falta de conexión y el tiempo agotado del navegador', () => {
    expect(mensajeDeError(new ErrorApi({ tipo: 'red' }))).toBe(MENSAJE_SIN_CONEXION);
    expect(mensajeDeError(new ErrorApi({ tipo: 'tiempo' }))).toBe(MENSAJE_TIEMPO_CLIENTE);
  });

  it('un error que no es de la API muestra el genérico interno', () => {
    expect(mensajeDeError(new Error('x'))).toBe('Ocurrió un error inesperado. Intenta de nuevo; si se repite, avisa a soporte.');
  });
});

describe('esNoEncontrado', () => {
  it('es verdadero solo para un 404', () => {
    expect(esNoEncontrado(respuesta(404, 'OBRA_NO_ENCONTRADA'))).toBe(true);
    expect(esNoEncontrado(respuesta(503))).toBe(false);
    expect(esNoEncontrado(new Error('x'))).toBe(false);
  });
});
