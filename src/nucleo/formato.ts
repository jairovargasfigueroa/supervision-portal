// Formatos de docs/diseno-visual.md («Formatos»): locale es-BO y hora de La Paz.
// Mismas funciones que frontend/erp-shell (src/app/compartido/formato.ts).
const LOCALE = 'es-BO';
const ZONA_NEGOCIO = 'America/La_Paz';

const montos = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cantidades = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });
const porcentajes = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const fechas = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA_NEGOCIO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const fechasHoras = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONA_NEGOCIO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * `Bs 1.250.000,00`. No se usa `style: 'currency'` porque `Intl` pone un espacio duro (U+00A0)
 * después de «Bs»; aquí va un espacio normal, como en el diseño.
 */
export function formatearMonto(monto: number): string {
  return `Bs ${montos.format(monto)}`;
}

/** `120,5 m²` (hasta 3 decimales). */
export function formatearCantidad(cantidad: number, unidad: string): string {
  return `${cantidades.format(cantidad)} ${unidad}`;
}

/** `32,5 %`. Recibe el porcentaje de 0 a 100 (como `anticipoPct` en los contratos). `Intl` con `style: 'percent'` daría `32,5%` sin espacio. */
export function formatearPorcentaje(porcentaje: number): string {
  return `${porcentajes.format(porcentaje)} %`;
}

/** `15/11/2026`. Recibe una fecha sin hora (`2026-11-15`) o un instante ISO (se muestra en hora de La Paz). */
export function formatearFecha(fecha: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  return fechas.format(new Date(fecha));
}

const meses = new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', month: 'long' });

/** `Noviembre 2026` para el periodo `2026-11` (igual que mf-obras). Si no es un periodo, lo devuelve tal cual. */
export function formatearPeriodo(periodo: string): string {
  const coincide = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (!coincide) return periodo;
  const anio = Number(coincide[1]);
  const mes = Number(coincide[2]);
  const nombre = meses.format(new Date(Date.UTC(anio, mes - 1, 1)));
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** `15/11/2026 14:30` en hora de La Paz. `Intl` da `15/11/2026, 14:30`: se quita la coma. */
export function formatearFechaHora(instante: string): string {
  return fechasHoras.format(new Date(instante)).replace(', ', ' ');
}
