# Timeline

[![Build and Deploy to GitHub Pages](https://github.com/ksanr/ahj10-1/actions/workflows/deploy.yml/badge.svg)](https://github.com/ksanr/ahj10-1/actions/workflows/deploy.yml)

Проект «Timeline» — лента постов с возможностью добавления текста, аудио и видео с привязкой к геопозиции.  
**[Посмотреть на GitHub Pages](https://ksanr.github.io/ahj10-1/)**

## Возможности
- Создание текстовых постов с автоматическим определением координат (или ручным вводом)
- Запись аудио и видео с использованием медиаустройств
- Привязка геолокации к каждому посту
- Прослушивание аудио и просмотр видео прямо в ленте

## Установка и запуск

1. Клонируйте репозиторий:
   ```bash
   npm install      # Установка зависимостей
   npm start        # Пуск в режиме разработчика
   npm run build    # Сборка Production
   npm test         # Запуск тестов