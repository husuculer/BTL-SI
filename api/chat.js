export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, prompt } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set.' });
  }

  let systemPrompt = "Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adlı məktəb assistentisən. Həmişə Azərbaycan dilində, səliqəli və dəqiq cavab ver.";
  
  if (mode === 'search') {
    systemPrompt = "Sən BTL-SI Deep Search sistemisən. Verilən mövzunu səthi deyil, son dərəcə ətraflı, məntiqi strukturda, addım-addım təhlil edərək, dərindən araşdırıb Azərbaycan dilində peşəkar hesabat şəklində izah et.";
  }

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nİstifadəçi sualı: ${prompt}` }
            ]
          }
        ]
      })
    });

    const data = await geminiResponse.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({
        choices: [
          {
            message: {
              content: text
            }
          }
        ]
      });
    } else if (data.error) {
      return res.status(500).json({ error: data.error.message });
    } else {
      return res.status(500).json({ error: "Gemini API-dən gözlənilməz cavab gəldi." });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
