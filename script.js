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
      const imgUrl = `https://image.pollinations.ai/prompt/${promptClean}?width=800&height=600&nologo=true&key=${IMAGE_API_KEY}`;
      
      const imgElement = document.createElement('img');
      imgElement.src = imgUrl;
      imgElement.alt = "AI Şəkil";
      imgElement.onload = () => scrollToBottom();
      
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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ]
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0].message.content) {
      loadingDiv.innerText = data.choices[0].message.content;
    } else if (data.error) {
      loadingDiv.innerText = "API Xətası: " + data.error.message;
    } else {
      loadingDiv.innerText = "Üzr istəyirəm, cavab hazırlana bilmədi.";
    }
  } catch (error) {
    loadingDiv.innerText = "Şəbəkə xətası baş verdi. Yenidən yoxlayın.";
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
