/**
 * Преобразует строку с координатами в объект { latitude, longitude }
 * Поддерживаемые форматы:
 *   "51.50851, -0.12572"
 *   "51.50851,-0.12572"
 *   "[51.50851, -0.12572]"
 * @param {string} input - строка с координатами
 * @returns {{ latitude: number, longitude: number }}
 * @throws {Error} если формат не соответствует или значения не числа
 */
export function parseCoordinates(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error('Пустая строка');
  }

  let cleaned = input.trim();
  // Удаляем квадратные скобки, если есть
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Разделяем по запятой
  const parts = cleaned.split(',').map(part => part.trim());
  if (parts.length !== 2) {
    throw new Error('Неверный формат: требуется два числа, разделённых запятой');
  }

  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error('Значения должны быть числами');
  }

  // Дополнительная проверка диапазона
  if (lat < -90 || lat > 90) {
    throw new Error('Широта должна быть в диапазоне [-90, 90]');
  }
  if (lon < -180 || lon > 180) {
    throw new Error('Долгота должна быть в диапазоне [-180, 180]');
  }

  return { latitude: lat, longitude: lon };
}