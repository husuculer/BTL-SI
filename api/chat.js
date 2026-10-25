export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, prompt } = req.body;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY environment variable is not set.' });
  }

  let systemPrompt = "Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adlı məktəb assistentisən. Həmişə Azərbaycan dilində, səliqəli və dəqiq cavab ver.";
  
  if (mode === 'search') {
    systemPrompt = "Sən BTL-SI Deep Search sistemisən. Verilən mövzunu səthi deyil, son dərəcə ətraflı, məntiqi strukturda, addım-addım təhlil edərək, dərindən araşdırıb Azərbaycan dilində peşəkar hesabat şəklində izah et.";
  }

  // İşləyə biləcək modellərin siyahısı (növbə ilə yoxlanılacaq)
  const modelsToTry = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "gemma2-9b-it"
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      const data = await groqResponse.json();

      if (groqResponse.ok && data.choices && data.choices.length > 0) {
        return res.status(200).json(data);
      } else {
        lastError = data.error?.message || JSON.stringify(data);
      }
    } catch (error) {
      lastError = error.message;
    }
  }

  return res.status(500).json({ error: "Heç bir model işləmədi. Son xəta: " + lastError });
}
