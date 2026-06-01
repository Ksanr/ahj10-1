import './styles.css';
import { parseCoordinates } from './modules/coordinateParser';

// ===== Элементы DOM =====
const timelineContainer = document.querySelector('.timeline');
const postInput = document.getElementById('postInput');
const submitBtn = document.getElementById('submitBtn');
const audioBtn = document.getElementById('audioBtn');
const videoBtn = document.getElementById('videoBtn');
const recordingPanel = document.getElementById('recordingPanel');
const recordingTimerSpan = document.getElementById('recordingTimer');
const recordingOk = document.getElementById('recordingOk');
const recordingCancel = document.getElementById('recordingCancel');
const videoPreviewContainer = document.getElementById('videoPreviewContainer');
const videoPreview = document.getElementById('videoPreview');

// Модальное окно (из задачи 1)
const modal = document.getElementById('modal');
const modalClose = document.querySelector('.modal-close');
const coordInput = document.getElementById('coordInput');
const modalSubmit = document.getElementById('modalSubmit');
const coordError = document.getElementById('coordError');

// ===== Хранилище постов =====
const posts = [];

// ===== Переменные для записи аудио/видео =====
let mediaRecorder = null;
let recordedChunks = [];
let recordingInterval = null;
let recordingSeconds = 0;
let activeStream = null;        // текущий поток (для остановки треков)
let recordingType = null;       // 'audio' или 'video'

// ===== Общие вспомогательные функции =====
function closeModal() {
  modal.classList.add('hidden');
  delete modal.dataset.pendingText;
  delete modal.dataset.context;
  coordError.classList.add('hidden');
}

function showModalForManualInput(text) {
  modal.dataset.pendingText = text;
  modal.dataset.context = 'text';
  coordInput.value = '';
  coordError.classList.add('hidden');
  modal.classList.remove('hidden');
  coordInput.focus();
}

function showModalForManualInputAudio() {
  modal.dataset.context = 'audio';
  coordInput.value = '';
  coordError.classList.add('hidden');
  modal.classList.remove('hidden');
  coordInput.focus();
}

function showModalForManualInputVideo() {
  modal.dataset.context = 'video';
  coordInput.value = '';
  coordError.classList.add('hidden');
  modal.classList.remove('hidden');
  coordInput.focus();
}

// Добавление текстового поста
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

// Добавление аудио-поста
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

// Добавление видео-поста
function addVideoPostToDOM(videoBlob, latitude, longitude) {
  const videoUrl = URL.createObjectURL(videoBlob);
  const postId = Date.now() + Math.random();
  const post = {
    id: postId,
    type: 'video',
    videoUrl,
    latitude,
    longitude,
    timestamp: new Date(),
  };
  posts.unshift(post);

  const postElement = document.createElement('article');
  postElement.classList.add('post', 'post-video');
  const header = document.createElement('div');
  header.classList.add('post-header');
  const dateStr = post.timestamp.toLocaleString('ru-RU');
  header.innerHTML = `<span>${dateStr}</span><span class="post-coordinates">📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</span>`;
  const videoElem = document.createElement('video');
  videoElem.controls = true;
  videoElem.src = videoUrl;
  videoElem.style.maxWidth = '100%';

  postElement.appendChild(header);
  postElement.appendChild(videoElem);
  timelineContainer.prepend(postElement);
}

// Создание текстового поста
function createTextPost(text, latitude, longitude) {
  if (!text.trim()) {
    alert('Текст записи не может быть пустым');
    return false;
  }
  addTextPostToDOM(text, latitude, longitude);
  return true;
}

// === Геолокация для текста ===
function requestGeolocationAndCreatePost(text) {
  if (!navigator.geolocation) {
    alert('Geolocation не поддерживается. Введите координаты вручную.');
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
      alert('Не удалось определить координаты. Введите их вручную.');
      showModalForManualInput(text);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// === Геолокация для аудио ===
function requestGeolocationAndCreateAudio() {
  if (!navigator.geolocation) {
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
      recordingPanel.classList.add('hidden');
      document.querySelector('.action-buttons').classList.remove('hidden');
      stopRecordingTimer();
    },
    () => showModalForManualInputAudio()
  );
}

// === Геолокация для видео ===
function requestGeolocationAndCreateVideo() {
  if (!navigator.geolocation) {
    showModalForManualInputVideo();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      if (window.pendingVideoBlob) {
        addVideoPostToDOM(window.pendingVideoBlob, latitude, longitude);
        window.pendingVideoBlob = null;
      }
      recordingPanel.classList.add('hidden');
      videoPreviewContainer.classList.add('hidden');
      if (videoPreview.srcObject) {
        videoPreview.srcObject.getTracks().forEach(track => track.stop());
        videoPreview.srcObject = null;
      }
      document.querySelector('.action-buttons').classList.remove('hidden');
      stopRecordingTimer();
    },
    () => showModalForManualInputVideo()
  );
}

// === Управление таймером записи ===
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
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
  }
  if (activeStream) {
    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
  }
  if (videoPreview.srcObject) {
    videoPreview.srcObject.getTracks().forEach(track => track.stop());
    videoPreview.srcObject = null;
  }
  recordingPanel.classList.add('hidden');
  videoPreviewContainer.classList.add('hidden');
  document.querySelector('.action-buttons').classList.remove('hidden');
  stopRecordingTimer();
  recordedChunks = [];
}

function finishRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}

// === Аудио запись ===
async function startAudioRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    activeStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];
    recordingType = 'audio';

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      if (activeStream) activeStream.getTracks().forEach(track => track.stop());
      window.pendingAudioBlob = audioBlob;
      requestGeolocationAndCreateAudio();
      recordedChunks = [];
    };
    mediaRecorder.start(100);
    startRecordingTimer();

    document.querySelector('.action-buttons').classList.add('hidden');
    recordingPanel.classList.remove('hidden');
  } catch (err) {
    alert('Не удалось получить доступ к микрофону. Проверьте разрешения.');
  }
}

// === Видео запись ===
async function startVideoRecording() {
  try {
    // Запрашиваем видео и аудио
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    activeStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];
    recordingType = 'video';

    // Показываем превью (без звука)
    videoPreview.srcObject = stream;
    videoPreview.muted = true;
    videoPreviewContainer.classList.remove('hidden');

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
      if (activeStream) activeStream.getTracks().forEach(track => track.stop());
      if (videoPreview.srcObject) {
        videoPreview.srcObject.getTracks().forEach(track => track.stop());
        videoPreview.srcObject = null;
      }
      window.pendingVideoBlob = videoBlob;
      requestGeolocationAndCreateVideo();
      recordedChunks = [];
      videoPreviewContainer.classList.add('hidden');
    };
    mediaRecorder.start(100);
    startRecordingTimer();

    document.querySelector('.action-buttons').classList.add('hidden');
    recordingPanel.classList.remove('hidden');
  } catch (err) {
    alert('Не удалось получить доступ к камере и микрофону. Проверьте разрешения и устройства.');
  }
}

// === Обработчики текстового ввода ===
function onPostSubmit() {
  const text = postInput.value;
  if (!text.trim()) {
    alert('Введите текст записи');
    return;
  }
  requestGeolocationAndCreatePost(text);
}

// === Обработчик подтверждения координат из модалки (общий) ===
function onManualSubmit() {
  const rawCoords = coordInput.value.trim();
  const pendingText = modal.dataset.pendingText;
  const context = modal.dataset.context; // 'text', 'audio', 'video'

  try {
    const { latitude, longitude } = parseCoordinates(rawCoords);
    if (context === 'audio' && window.pendingAudioBlob) {
      addAudioPostToDOM(window.pendingAudioBlob, latitude, longitude);
      window.pendingAudioBlob = null;
      recordingPanel.classList.add('hidden');
      document.querySelector('.action-buttons').classList.remove('hidden');
      stopRecordingTimer();
    } else if (context === 'video' && window.pendingVideoBlob) {
      addVideoPostToDOM(window.pendingVideoBlob, latitude, longitude);
      window.pendingVideoBlob = null;
      recordingPanel.classList.add('hidden');
      videoPreviewContainer.classList.add('hidden');
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

// === Инициализация слушателей ===
submitBtn.addEventListener('click', onPostSubmit);
postInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onPostSubmit();
  }
});
audioBtn.addEventListener('click', startAudioRecording);
videoBtn.addEventListener('click', startVideoRecording);
recordingOk.addEventListener('click', finishRecording);
recordingCancel.addEventListener('click', cancelRecording);
modalClose.addEventListener('click', closeModal);
modalSubmit.addEventListener('click', onManualSubmit);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

// Демо-пост
setTimeout(() => {
  if (timelineContainer.children.length === 0) {
    addTextPostToDOM('Добро пожаловать в Timeline! Отправляйте текст, аудио и видео с геопозицией.', 55.751244, 37.618423);
  }
}, 100);