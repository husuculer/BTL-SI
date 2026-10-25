// Göndərdiyin Yeni API Açarları
const GROQ_API_KEY = "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";
const IMAGE_API_KEY = "key_CgPCA82szNRyf7CEabwd9";

let currentMode = 'chat'; // Varsayılan mod

function setMode(mode) {
  currentMode = mode;
  const chatBtn = document.getElementById('chatModeBtn');
  const imgBtn = document.getElementById('imageModeBtn');
  const inputField = document.getElementById('userInput');

  if (mode === 'chat') {
    chatBtn.classList.add('active');
    imgBtn.classList.remove('active');
    inputField.placeholder = "Sualınızı və ya mesajınızı yazın...";
  } else {
    imgBtn.classList.add('active');
    chatBtn.classList.remove('active');
    inputField.placeholder = "Yaratmaq istədiyiniz şəkli təsvir edin (məs: qırmızı alma)...";
  }
}

async function sendMessage() {
  const inputField = document.getElementById('userInput');
  const userText = inputField.value.trim();

  if (!userText) return;

  appendMessage(userText, 'user-msg');
  inputField.value = '';

  // Animasiyalı Yüklənir qutusu
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai-msg';
  loadingDiv.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  
  const chatBox = document.getElementById('chatBox');
  chatBox.appendChild(loadingDiv);
  scrollToBottom();

  // Mode 1: Şəkil Yaratmaq
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

  // Mode 2: Groq (Llama 3) AI Mətn Cavabı
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adlı məktəb assistentisən. Həmişə Azərbaycan dilində, səliqəli, dəqiq və yardımçı tərzdə cavab ver. İstifadəçinin yazdığı kiçik hərf səhvlərini anlayışla qarşıla, mənanı dərk edərək peşəkar şəkildə cavablandır."
          },
          {
            role: "user",
            content: userText
          }
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
