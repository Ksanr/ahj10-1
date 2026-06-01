import './styles.css';
import { parseCoordinates } from './modules/coordinateParser';

// ===== Элементы DOM =====
const timelineContainer = document.querySelector('.timeline');
const postInput = document.getElementById('postInput');
const submitBtn = document.getElementById('submitBtn');
const audioBtn = document.getElementById('audioBtn');
const videoBtn = document.getElementById('videoBtn'); // для задачи 3 (пока не используется)
const recordingPanel = document.getElementById('recordingPanel');
const recordingTimerSpan = document.getElementById('recordingTimer');
const recordingOk = document.getElementById('recordingOk');
const recordingCancel = document.getElementById('recordingCancel');

// Модальное окно (из задачи 1)
const modal = document.getElementById('modal');
const modalClose = document.querySelector('.modal-close');
const coordInput = document.getElementById('coordInput');
const modalSubmit = document.getElementById('modalSubmit');
const coordError = document.getElementById('coordError');

// ===== Хранилище постов =====
const posts = []; // { id, type, text?, audioUrl?, latitude, longitude, timestamp }

// ===== Переменные для аудиозаписи =====
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let recordingSeconds = 0;

// ===== Общие вспомогательные функции =====

// Закрытие модального окна
function closeModal() {
  modal.classList.add('hidden');
  delete modal.dataset.pendingText;
  delete modal.dataset.context;
  coordError.classList.add('hidden');
}

// Показать модалку для ручного ввода координат (текст)
function showModalForManualInput(text) {
  modal.dataset.pendingText = text;
  modal.dataset.context = 'text';
  coordInput.value = '';
  coordError.classList.add('hidden');
  modal.classList.remove('hidden');
  coordInput.focus();
}

// Показать модалку для ручного ввода координат (аудио)
function showModalForManualInputAudio() {
  modal.dataset.context = 'audio';
  coordInput.value = '';
  coordError.classList.add('hidden');
  modal.classList.remove('hidden');
  coordInput.focus();
}

// Добавление текстового поста в DOM и в массив
function addTextPostToDOM(text, latitude, longitude) {
  const postId = Date.now() + Math.random();
  const post = {
    id: postId,
    type: 'text',
    text,
    latitude,
    longitude,
    timestamp: new Date(),
  };
  posts.unshift(post);

  const postElement = document.createElement('article');
  postElement.classList.add('post');
  postElement.dataset.id = postId;

  const header = document.createElement('div');
  header.classList.add('post-header');
  const dateStr = post.timestamp.toLocaleString('ru-RU');
  header.innerHTML = `<span>${dateStr}</span><span class="post-coordinates">📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</span>`;

  const textDiv = document.createElement('div');
  textDiv.classList.add('post-text');
  textDiv.textContent = text;

  postElement.appendChild(header);
  postElement.appendChild(textDiv);
  timelineContainer.prepend(postElement);
}

// Добавление аудио-поста в DOM и в массив
function addAudioPostToDOM(audioBlob, latitude, longitude) {
  const audioUrl = URL.createObjectURL(audioBlob);
  const postId = Date.now() + Math.random();
  const post = {
    id: postId,
    type: 'audio',
    audioUrl,
    latitude,
    longitude,
    timestamp: new Date(),
  };
  posts.unshift(post);

  const postElement = document.createElement('article');
  postElement.classList.add('post', 'post-audio');
  const header = document.createElement('div');
  header.classList.add('post-header');
  const dateStr = post.timestamp.toLocaleString('ru-RU');
  header.innerHTML = `<span>${dateStr}</span><span class="post-coordinates">📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</span>`;

  const audioElem = document.createElement('audio');
  audioElem.controls = true;
  audioElem.src = audioUrl;

  postElement.appendChild(header);
  postElement.appendChild(audioElem);
  timelineContainer.prepend(postElement);
}

// Создание текстового поста после получения координат (гео или ручной ввод)
function createTextPost(text, latitude, longitude) {
  if (!text.trim()) {
    alert('Текст записи не может быть пустым');
    return false;
  }
  addTextPostToDOM(text, latitude, longitude);
  return true;
}

// === Геолокация для текстового поста ===
function requestGeolocationAndCreatePost(text) {
  if (!navigator.geolocation) {
    alert('Geolocation не поддерживается вашим браузером. Введите координаты вручную.');
    showModalForManualInput(text);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      createTextPost(text, latitude, longitude);
      postInput.value = '';
    },
    (error) => {
      console.warn('Ошибка геолокации:', error);
      let errorMessage = 'Не удалось определить координаты. ';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Пользователь запретил доступ к геолокации.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Информация о местоположении недоступна.';
          break;
        case error.TIMEOUT:
          errorMessage += 'Превышено время ожидания.';
          break;
        default:
          errorMessage += 'Неизвестная ошибка.';
      }
      alert(errorMessage + ' Пожалуйста, введите координаты вручную.');
      showModalForManualInput(text);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// === Геолокация для аудио-поста ===
function requestGeolocationAndCreateAudio() {
  if (!navigator.geolocation) {
    alert('Geolocation не поддерживается. Введите координаты вручную.');
    showModalForManualInputAudio();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      if (window.pendingAudioBlob) {
        addAudioPostToDOM(window.pendingAudioBlob, latitude, longitude);
        window.pendingAudioBlob = null;
      }
      // Скрыть панель записи и вернуть кнопки
      recordingPanel.classList.add('hidden');
      document.querySelector('.action-buttons').classList.remove('hidden');
      stopRecordingTimer();
    },
    (error) => {
      console.warn('Ошибка геолокации:', error);
      alert('Не удалось определить координаты. Введите их вручную.');
      showModalForManualInputAudio();
    }
  );
}

// === Управление записью аудио ===
function startRecordingTimer() {
  recordingSeconds = 0;
  recordingTimerSpan.textContent = '0';
  if (recordingInterval) clearInterval(recordingInterval);
  recordingInterval = setInterval(() => {
    recordingSeconds++;
    recordingTimerSpan.textContent = recordingSeconds;
  }, 1000);
}

function stopRecordingTimer() {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
}

function cancelRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = null; // предотвращаем создание поста
    mediaRecorder.stop();
  }
  recordingPanel.classList.add('hidden');
  document.querySelector('.action-buttons').classList.remove('hidden');
  stopRecordingTimer();
}

function finishRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  // Панель и таймер будут скрыты после создания поста в onstop
}

async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      // Останавливаем все треки микрофона
      stream.getTracks().forEach(track => track.stop());
      // Сохраняем blob во временной переменной
      window.pendingAudioBlob = audioBlob;
      // Запрашиваем геолокацию (или ручной ввод)
      requestGeolocationAndCreateAudio();
    };

    mediaRecorder.start(100); // собираем данные каждые 100 мс
    startRecordingTimer();

    // Скрываем кнопки микрофона/видео, показываем панель записи
    document.querySelector('.action-buttons').classList.add('hidden');
    recordingPanel.classList.remove('hidden');
  } catch (err) {
    console.error('Ошибка доступа к микрофону:', err);
    alert('Не удалось получить доступ к микрофону. Пожалуйста, разрешите использование и перезагрузите страницу.');
  }
}

// === Обработчик отправки текста ===
function onPostSubmit() {
  const text = postInput.value;
  if (!text.trim()) {
    alert('Введите текст записи');
    return;
  }
  requestGeolocationAndCreatePost(text);
}

// === Обработчик подтверждения координат из модального окна (общий для текста и аудио) ===
function onManualSubmit() {
  const rawCoords = coordInput.value.trim();
  const pendingText = modal.dataset.pendingText;
  const context = modal.dataset.context; // 'text' или 'audio'

  try {
    const { latitude, longitude } = parseCoordinates(rawCoords);
    if (context === 'audio' && window.pendingAudioBlob) {
      addAudioPostToDOM(window.pendingAudioBlob, latitude, longitude);
      window.pendingAudioBlob = null;
      recordingPanel.classList.add('hidden');
      document.querySelector('.action-buttons').classList.remove('hidden');
      stopRecordingTimer();
    } else if (context === 'text' && pendingText) {
      createTextPost(pendingText, latitude, longitude);
      postInput.value = '';
      delete modal.dataset.pendingText;
    } else {
      throw new Error('Неизвестный контекст или отсутствуют данные');
    }
    modal.classList.add('hidden');
    delete modal.dataset.context;
  } catch (err) {
    coordError.textContent = err.message;
    coordError.classList.remove('hidden');
  }
}

// === Инициализация обработчиков событий ===
submitBtn.addEventListener('click', onPostSubmit);
postInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onPostSubmit();
  }
});

audioBtn.addEventListener('click', startAudioRecording);
recordingOk.addEventListener('click', finishRecording);
recordingCancel.addEventListener('click', cancelRecording);

modalClose.addEventListener('click', closeModal);
modalSubmit.addEventListener('click', onManualSubmit);
// Закрытие по клику вне области контента
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// === Демо-пост (пример из задачи 1) ===
setTimeout(() => {
  if (timelineContainer.children.length === 0) {
    addTextPostToDOM('Это пример текстовой записи. Отправьте своё сообщение или записывайте аудио!', 55.751244, 37.618423);
  }
}, 100);