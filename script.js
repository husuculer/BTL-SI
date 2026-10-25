let currentMode = 'chat';

function setMode(mode) {
  currentMode = mode;
  const chatBtn = document.getElementById('chatModeBtn');
  const searchBtn = document.getElementById('searchModeBtn');
  const imgBtn = document.getElementById('imageModeBtn');
  const inputField = document.getElementById('userInput');

  chatBtn.classList.remove('active');
  searchBtn.classList.remove('active');
  imgBtn.classList.remove('active');

  if (mode === 'chat') {
    chatBtn.classList.add('active');
    inputField.placeholder = "Sualınızı və ya mesajınızı yazın...";
  } else if (mode === 'search') {
    searchBtn.classList.add('active');
    inputField.placeholder = "Dərin araşdırma etmək istədiyiniz mövzunu yazın...";
  } else {
    imgBtn.classList.add('active');
    inputField.placeholder = "Yaratmaq istədiyiniz şəkli ingilis dilində təsvir edin (məs: flag of germany)...";
  }
}

async function sendMessage() {
  const inputField = document.getElementById('userInput');
  const userText = inputField.value.trim();

  if (!userText) return;

  appendMessage(userText, 'user-msg');
  inputField.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai-msg';
  loadingDiv.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  
  const chatBox = document.getElementById('chatBox');
  chatBox.appendChild(loadingDiv);
  scrollToBottom();

  if (currentMode === 'image') {
    try {
      // Şəkil modelinin başa düşməsi üçün sorğunu təmizləyirik və keyfiyyət parametry əlavə edirik
      const promptClean = encodeURIComponent(userText + ", high quality, detailed, 4k resolution");
      const imgUrl = `https://image.pollinations.ai/prompt/${promptClean}?width=800&height=600&nologo=true`;
      
      const imgElement = document.createElement('img');
      imgElement.src = imgUrl;
      imgElement.alt = "AI Şəkil";
      imgElement.onload = () => scrollToBottom();
      imgElement.onerror = () => { loadingDiv.innerText = "Şəkil yüklənə bilmədi."; };
      
      loadingDiv.innerHTML = 'Buyurun, istədiyiniz şəkil:<br>';
      loadingDiv.appendChild(imgElement);
    } catch (err) {
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

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      loadingDiv.innerText = data.choices[0].message.content;
    } else if (data.error) {
      loadingDiv.innerText = "Xəta: " + (data.error.message || JSON.stringify(data.error));
    } else {
      loadingDiv.innerText = "Gözlənilməz cavab formatı alındı.";
    }
  } catch (error) {
    loadingDiv.innerText = "Şəbəkə xətası baş verdi: " + error.message;
  }

  scrollToBottom();
}

function appendMessage(text, className) {
  const chatBox = document.getElementById('chatBox');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${className}`;
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
