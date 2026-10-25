// Sənin təqdim etdiyin API açarları
const GEMINI_API_KEY = "AQ.Ab8RN6I8OIv2GHg8Chgbn38AzyT2IAJKnc9mwyjnPJFBTFXOKg";
const POLLINATIONS_API_KEY = "sk_5Uag4G8oj5GdXKTItUdu3LDlOPM37IqT";

async function sendMessage() {
  const inputField = document.getElementById('userInput');
  const userText = inputField.value.trim();

  if (!userText) return;

  // İstifadəçi mesajını ekrana yaz
  appendMessage(userText, 'user-msg');
  inputField.value = '';

  // AI düşünür mesajı
  const loadingDiv = appendMessage('BTL-SI düşünür...', 'ai-msg');

  // Şəkil tələbini yoxlayaq
  const lowerText = userText.toLowerCase();
  const isImageReq = lowerText.includes('şəkil çək') || lowerText.includes('şəkil yarat') || lowerText.includes('şəkli çək');

  if (isImageReq) {
    loadingDiv.innerText = 'Şəkil hazırlanır, zəhmət olmasa gözləyin...';
    
    const promptClean = encodeURIComponent(userText);
    const imgUrl = `https://image.pollinations.ai/prompt/${promptClean}?width=800&height=600&nologo=true&key=${POLLINATIONS_API_KEY}`;
    
    loadingDiv.innerHTML = `Buyurun, istədiyiniz şəkil:<br><img src="${imgUrl}" alt="AI Şəkil" onload="scrollToBottom()">`;
    return;
  }

  // Gemini API vasitəsilə mətn və söhbət cavabı
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adlı məktəb assistentisən. Həmişə Azərbaycan dilində, səliqəli, dəqiq və yardımçı tərzdə cavab ver. İstifadəçinin yazdığı kiçik hərf səhvlərini anlayışla qarşıla, mənanı dərk edərək peşəkar şəkildə cavablandır." },
              { text: userText }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const aiReply = data.candidates[0].content.parts[0].text;
      loadingDiv.innerText = aiReply;
    } else {
      loadingDiv.innerText = "Üzr istəyirəm, cavab hazırlayarkən xəta baş verdi.";
    }
  } catch (error) {
    loadingDiv.innerText = "Şəbəkə xətası baş verdi. Zəhmət olmasa yenidən yoxlayın.";
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
