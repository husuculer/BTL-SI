// API yolları. Handler faylın adı api/app.js-dirsə, CHAT_API-ni '/api/app' et
const CHAT_API = '/api/chat';
const IMAGE_API = '/api/image';

function loadSessions() {
  try {
    const saved = JSON.parse(localStorage.getItem('btl_sessions'));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {}
  return [{ id: '1', title: 'Yeni söhbət', messages: [] }];
}

let sessions = loadSessions();
let currentSessionId = localStorage.getItem('btl_current_session');
if (!sessions.some((s) => s.id === currentSessionId)) {
  currentSessionId = sessions[0].id;
}
let currentMode = 'chat';
let isSending = false;

window.onload = () => {
  renderChatList();
  loadCurrentSessionMessages();
};

function toggleModeMenu() {
  const menu = document.getElementById('modeMenu');
  menu.classList.toggle('show');
}

window.onclick = function (event) {
  if (!event.target.matches('.plus-btn')) {
    const menu = document.getElementById('modeMenu');
    if (menu && menu.classList.contains('show')) {
      menu.classList.remove('show');
    }
  }
};

function selectMode(mode, label) {
  currentMode = mode;
  document.getElementById('modeMenu').classList.remove('show');

  const indicator = document.getElementById('activeModeIndicator');
  const textSpan = document.getElementById('activeModeText');

  if (mode !== 'chat') {
    textSpan.innerText = `Rejim: ${label}`;
    indicator.classList.add('show');
  } else {
    indicator.classList.remove('show');
  }

  if (mode === 'psychologist') {
    document.body.classList.add('psychologist-theme');
  } else {
    document.body.classList.remove('psychologist-theme');
  }

  const inputField = document.getElementById('userInput');
  if (mode === 'chat') {
    inputField.placeholder = 'Sualınızı və ya mesajınızı yazın...';
  } else if (mode === 'search') {
    inputField.placeholder = 'Dərin araşdırma etmək istədiyiniz mövzunu yazın...';
  } else if (mode === 'psychologist') {
    inputField.placeholder = 'Psixoloqla dərdləş və ya söhbət et...';
  } else if (mode === 'image') {
    inputField.placeholder = 'Yaratmaq istədiyiniz şəkli təsvir edin (məs: qarlı dağlarda qırmızı maşın)...';
  }
}

function resetMode() {
  currentMode = 'chat';
  document.body.classList.remove('psychologist-theme');
  document.getElementById('activeModeIndicator').classList.remove('show');
  document.getElementById('userInput').placeholder = 'Mesajınızı bura yazın...';
}

function createNewChat() {
  const newId = 'session_' + Date.now();
  sessions.unshift({ id: newId, title: 'Yeni söhbət', messages: [] });
  currentSessionId = newId;
  saveAndRefresh();
  resetMode();
}

function switchSession(id) {
  currentSessionId = id;
  localStorage.setItem('btl_current_session', id);
  renderChatList();
  loadCurrentSessionMessages();
  resetMode();
}

function deleteSession(event, id) {
  event.stopPropagation();
  if (sessions.length === 1) {
    sessions[0].messages = [];
    sessions[0].title = 'Yeni söhbət';
  } else {
    sessions = sessions.filter((s) => s.id !== id);
    if (currentSessionId === id) {
      currentSessionId = sessions[0].id;
    }
  }
  saveAndRefresh();
}

// Şəkillər böyük olduğu üçün yaddaş dolarsa, köhnə şəkilləri silib yenidən yazır
function persist() {
  const write = () => {
    localStorage.setItem('btl_sessions', JSON.stringify(sessions));
    localStorage.setItem('btl_current_session', currentSessionId);
  };
  try {
    write();
  } catch (e) {
    sessions.forEach((s) => {
      s.messages.forEach((m, i) => {
        const isLatest = s.id === currentSessionId && i === s.messages.length - 1;
        if (m.type === 'image' && !isLatest) {
          m.type = 'text';
          m.content = '[Şəkil yaddaşdan silindi]';
        }
      });
    });
    try {
      write();
    } catch (e2) {}
  }
}

function saveAndRefresh() {
  persist();
  renderChatList();
  loadCurrentSessionMessages();
}

function renderChatList() {
  const chatList = document.getElementById('chatList');
  chatList.innerHTML = '';

  sessions.forEach((session) => {
    const item = document.createElement('div');
    item.className = `chat-item ${session.id === currentSessionId ? 'active' : ''}`;
    item.onclick = () => switchSession(session.id);

    const titleSpan = document.createElement('span');
    titleSpan.innerText = session.title;
    titleSpan.style.overflow = 'hidden';
    titleSpan.style.textOverflow = 'ellipsis';
    titleSpan.style.whiteSpace = 'nowrap';
    titleSpan.style.flex = '1';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-chat';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => deleteSession(e, session.id);

    item.appendChild(titleSpan);
    item.appendChild(deleteBtn);
    chatList.appendChild(item);
  });
}

function loadCurrentSessionMessages() {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = '';

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  if (!currentSession || currentSession.messages.length === 0) {
    chatBox.innerHTML = `<div class="message ai-msg fade-in">Salam! Mən BTL-SI. Sual vermək və ya rejim seçmək üçün sol aşağıdakı "+" düyməsindən istifadə edə bilərsən.</div>`;
    return;
  }

  currentSession.messages.forEach((msg) => {
    if (msg.type === 'image') {
      const wrapper = document.createElement('div');
      wrapper.className = 'message ai-msg fade-in';
      wrapper.innerHTML = 'Buyurun, istədiyiniz şəkil:<br>';
      const imgElement = document.createElement('img');
      imgElement.src = msg.content;
      imgElement.alt = 'AI Şəkil';
      wrapper.appendChild(imgElement);
      chatBox.appendChild(wrapper);
    } else {
      appendMessageUI(msg.content, msg.className);
    }
  });
  scrollToBottom();
}

// Modelə yalnız normal söhbət mesajları göndərilir (şəkillər və xətalar daxil deyil)
function buildApiHistory(session) {
  return session.messages
    .filter(
      (m) =>
        m.type === 'text' &&
        !m.isError &&
        typeof m.content === 'string' &&
        !m.content.startsWith('Xəta:') &&
        !m.content.startsWith('Şəbəkə xətası')
    )
    .map((m) => ({
      role: m.className === 'user-msg' ? 'user' : 'assistant',
      content: m.content,
    }));
}

function describeError(data, status) {
  const e = data && data.error;
  if (!e) return `Gözlənilməz cavab alındı (HTTP ${status}).`;
  let text = e.message || 'Naməlum xəta';
  if (e.details) text += `\n(${e.details})`;
  return text;
}

// Şəkli kiçildib JPEG-ə çevirir ki, brauzer yaddaşı tez dolmasın
function shrinkImage(src, maxSize = 768, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function sendMessage() {
  if (isSending) return;

  const inputField = document.getElementById('userInput');
  const userText = inputField.value.trim();
  if (!userText) return;

  isSending = true;
  try {
    await processMessage(userText, inputField);
  } finally {
    isSending = false;
  }
}

async function processMessage(userText, inputField) {
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  if (currentSession.title === 'Yeni söhbət') {
    currentSession.title = userText.length > 25 ? userText.substring(0, 25) + '...' : userText;
  }

  currentSession.messages.push({ content: userText, className: 'user-msg', type: 'text' });
  appendMessageUI(userText, 'user-msg');
  inputField.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai-msg fade-in';
  loadingDiv.innerHTML = `<img src="edited-photo.png" class="logo-loader" alt="Yüklənir...">`;

  const chatBox = document.getElementById('chatBox');
  chatBox.appendChild(loadingDiv);
  scrollToBottom();

  // Şəkil rejimi
  if (currentMode === 'image') {
    try {
      const apiResponse = await fetch(IMAGE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText }),
      });

      let data;
      try {
        data = await apiResponse.json();
      } catch (e) {
        throw new Error(`Serverdən düzgün cavab gəlmədi (HTTP ${apiResponse.status}). api/image.js faylı varmı?`);
      }

      if (!apiResponse.ok || !data.image) {
        throw new Error(describeError(data, apiResponse.status));
      }

      const dataUrl = await shrinkImage(`data:${data.mime || 'image/jpeg'};base64,${data.image}`);
      currentSession.messages.push({ content: dataUrl, className: 'ai-msg', type: 'image' });
      saveAndRefresh();
    } catch (err) {
      const errText = 'Şəkil yaradılarkən xəta: ' + err.message;
      currentSession.messages.push({ content: errText, className: 'ai-msg', type: 'text', isError: true });
      saveAndRefresh();
    }
    return;
  }

  // Söhbət, Deep Search və Psixoloq rejimləri
  try {
    const apiResponse = await fetch(CHAT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: currentMode,
        messages: buildApiHistory(currentSession),
      }),
    });

    let data;
    try {
      data = await apiResponse.json();
    } catch (e) {
      throw new Error(
        `Serverdən düzgün cavab gəlmədi (HTTP ${apiResponse.status}). API faylının yolu ${CHAT_API} olmalıdır.`
      );
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null;

    if (content) {
      currentSession.messages.push({ content, className: 'ai-msg', type: 'text' });
    } else {
      currentSession.messages.push({
        content: 'Xəta: ' + describeError(data, apiResponse.status),
        className: 'ai-msg',
        type: 'text',
        isError: true,
      });
    }
    saveAndRefresh();
  } catch (error) {
    currentSession.messages.push({
      content: 'Şəbəkə xətası baş verdi: ' + error.message,
      className: 'ai-msg',
      type: 'text',
      isError: true,
    });
    saveAndRefresh();
  }

  scrollToBottom();
}

function appendMessageUI(text, className) {
  const chatBox = document.getElementById('chatBox');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${className} fade-in`;
  msgDiv.innerText = text;
  chatBox.appendChild(msgDiv);
  scrollToBottom();
  return msgDiv;
}

function scrollToBottom() {
  const chatBox = document.getElementById('chatBox');
  chatBox.scrollTop = chatBox.scrollHeight;
}

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}
