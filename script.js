let sessions = JSON.parse(localStorage.getItem('btl_sessions')) || [
  { id: '1', title: 'Yeni söhbət', messages: [] }
];
let currentSessionId = localStorage.getItem('btl_current_session') || sessions[0].id;
let currentMode = 'chat';

window.onload = () => {
  renderChatList();
  loadCurrentSessionMessages();
};

function toggleModeMenu() {
  const menu = document.getElementById('modeMenu');
  menu.classList.toggle('show');
}

window.onclick = function(event) {
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

  const inputField = document.getElementById('userInput');
  if (mode === 'chat') {
    inputField.placeholder = "Sualınızı və ya mesajınızı yazın...";
  } else if (mode === 'search') {
    inputField.placeholder = "Dərin araşdırma etmək istədiyiniz mövzunu yazın...";
  } else if (mode === 'image') {
    inputField.placeholder = "Yaratmaq istədiyiniz şəkli təsvir edin...";
  }
}

function resetMode() {
  currentMode = 'chat';
  document.getElementById('activeModeIndicator').classList.remove('show');
  document.getElementById('userInput').placeholder = "Mesajınızı bura yazın...";
}

function createNewChat() {
  const newId = 'session_' + Date.now();
  const newSession = {
    id: newId,
    title: 'Yeni söhbət',
    messages: []
  };
  sessions.unshift(newSession);
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
    sessions = sessions.filter(s => s.id !== id);
    if (currentSessionId === id) {
      currentSessionId = sessions[0].id;
    }
  }
  saveAndRefresh();
}

function saveAndRefresh() {
  localStorage.setItem('btl_sessions', JSON.stringify(sessions));
  localStorage.setItem('btl_current_session', currentSessionId);
  renderChatList();
  loadCurrentSessionMessages();
}

function renderChatList() {
  const chatList = document.getElementById('chatList');
  chatList.innerHTML = '';

  sessions.forEach(session => {
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

  const currentSession = sessions.find(s => s.id === currentSessionId);
  if (!currentSession || currentSession.messages.length === 0) {
    chatBox.innerHTML = `<div class="message ai-msg fade-in">Salam! Mən BTL-SI. Sual vermək və ya rejim seçmək üçün sol aşağıdakı "+" düyməsindən istifadə edə bilərsən.</div>`;
    return;
  }

  currentSession.messages.forEach(msg => {
    if (msg.type === 'image') {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'message ai-msg fade-in';
      loadingDiv.innerHTML = `Buyurun, istədiyiniz şəkil:<br>`;
      const imgElement = document.createElement('img');
      imgElement.src = msg.content;
      imgElement.alt = "AI Şəkil";
      loadingDiv.appendChild(imgElement);
      chatBox.appendChild(loadingDiv);
    } else {
      appendMessageUI(msg.content, msg.className);
    }
  });
  scrollToBottom();
}

async function sendMessage() {
  const inputField = document.getElementById('userInput');
  const userText = inputField.value.trim();

  if (!userText) return;

  const currentSession = sessions.find(s => s.id === currentSessionId);
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

  if (currentMode === 'image') {
    try {
      const promptClean = encodeURIComponent(userText + ", high quality, detailed, realistic, 4k");
      // Limitə düşməyən standart təmiz endpoint
      const imgUrl = `https://image.pollinations.ai/prompt/${promptClean}?width=800&height=600&nologo=true`;
      
      const imgElement = document.createElement('img');
      imgElement.src = imgUrl;
      imgElement.alt = "AI Şəkil";
      imgElement.onload = () => scrollToBottom();
      imgElement.onerror = () => { 
        loadingDiv.className = 'message ai-msg fade-in';
        loadingDiv.innerText = "Şəkil yüklənə bilmədi."; 
      };
      
      loadingDiv.className = 'message ai-msg fade-in';
      loadingDiv.innerHTML = 'Buyurun, istədiyiniz şəkil:<br>';
      loadingDiv.appendChild(imgElement);

      currentSession.messages.push({ content: imgUrl, className: 'ai-msg', type: 'image' });
      saveAndRefresh();
    } catch (err) {
      loadingDiv.className = 'message ai-msg fade-in';
      loadingDiv.innerText = "Şəkil yaradılarkən xəta baş verdi.";
    }
    return;
  }

  try {
    const apiResponse = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: currentMode,
        prompt: userText
      })
    });

    const data = await apiResponse.json();

    let aiReply = "";
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      aiReply = data.choices[0].message.content;
      loadingDiv.className = 'message ai-msg fade-in';
      loadingDiv.innerText = aiReply;
    } else if (data.error) {
      aiReply = "Xəta: " + (data.error.message || JSON.stringify(data.error));
      loadingDiv.className = 'message ai-msg fade-in';
      loadingDiv.innerText = aiReply;
    } else {
      aiReply = "Gözlənilməz cavab formatı alındı.";
      loadingDiv.className = 'message ai-msg fade-in';
      loadingDiv.innerText = aiReply;
    }

    currentSession.messages.push({ content: aiReply, className: 'ai-msg', type: 'text' });
    saveAndRefresh();

  } catch (error) {
    const errText = "Şəbəkə xətası baş verdi: " + error.message;
    loadingDiv.className = 'message ai-msg fade-in';
    loadingDiv.innerText = errText;
    currentSession.messages.push({ content: errText, className: 'ai-msg', type: 'text' });
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
