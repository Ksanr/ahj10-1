import { parseCoordinates } from '../modules/coordinateParser';

describe('Функция parseCoordinates', () => {
  test('должна корректно разбирать строку "51.50851, -0.12572" (с пробелом)', () => {
    const result = parseCoordinates('51.50851, -0.12572');
    expect(result).toEqual({ latitude: 51.50851, longitude: -0.12572 });
  });

  test('должна корректно разбирать строку "51.50851,-0.12572" (без пробела)', () => {
    const result = parseCoordinates('51.50851,-0.12572');
    expect(result).toEqual({ latitude: 51.50851, longitude: -0.12572 });
  });

  test('должна корректно разбирать строку "[51.50851, -0.12572]" (с квадратными скобками)', () => {
    const result = parseCoordinates('[51.50851, -0.12572]');
    expect(result).toEqual({ latitude: 51.50851, longitude: -0.12572 });
  });

  test('должна выбрасывать исключение для пустой строки', () => {
    expect(() => parseCoordinates('')).toThrow('Пустая строка');
    expect(() => parseCoordinates('   ')).toThrow('Пустая строка');
  });

  test('должна выбрасывать исключение для неверного формата (одно число)', () => {
    expect(() => parseCoordinates('51.50851')).toThrow('Неверный формат');
  });

  test('должна выбрасывать исключение для неверного формата (буквы)', () => {
    expect(() => parseCoordinates('abc, def')).toThrow('Значения должны быть числами');
  });

  test('должна выбрасывать исключение при выходе широты за диапазон', () => {
    expect(() => parseCoordinates('100, -0.12572')).toThrow('Широта должна быть в диапазоне');
  });

  test('должна выбрасывать исключение при выходе долготы за диапазон', () => {
    expect(() => parseCoordinates('51.50851, 200')).toThrow('Долгота должна быть в диапазоне');
  });
});