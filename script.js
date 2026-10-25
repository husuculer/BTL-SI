const GROQ_API_KEY = "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";
const IMAGE_API_KEY = "key_CgPCA82szNRyf7CEabwd9";

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
    inputField.placeholder = "Yaratmaq istədiyiniz şəkli təsvir edin...";
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
      const promptClean = encodeURIComponent(userText);
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

  let systemPrompt = "Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adlı məktəb assistentisən. Həmişə Azərbaycan dilində, səliqəli və dəqiq cavab ver.";
  
  if (currentMode === 'search') {
    systemPrompt = "Sən BTL-SI Deep Search sistemisən. Verilən mövzunu səthi deyil, son dərəcə ətraflı, məntiqi strukturda, addım-addım təhlil edərək, dərindən araşdırıb Azərbaycan dilində peşəkar hesabat şəklində izah et.";
  }

  try {
    const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ],
        temperature: 0.7
      })
    });

    const data = await apiResponse.json();

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      loadingDiv.innerText = data.choices[0].message.content;
    } else if (data.error) {
      loadingDiv.innerText = "API Xətası: " + data.error.message;
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
