export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, prompt } = req.body;

  let systemPrompt = "Sən BTL-SI (Bakı Türk Liseyi Super Intellekt) adlı məktəb assistentisən. Həmişə Azərbaycan dilində, səliqəli və dəqiq cavab ver.";
  
  if (mode === 'search') {
    systemPrompt = "Sən BTL-SI Deep Search sistemisən. Verilən mövzunu səthi deyil, son dərəcə ətraflı, məntiqi strukturda, addım-addım təhlil edərək, dərindən araşdırıb Azərbaycan dilində peşəkar hesabat şəklində izah et.";
  }

  try {
    // Pollinations AI text endpoint (heç bir açar tələb etmir)
    const fullPrompt = `${systemPrompt}\n\nİstifadəçi sualı: ${prompt}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);

    const response = await fetch(`https://text.pollinations.ai/${encodedPrompt}`, {
      method: "GET"
    });

    const textData = await response.text();

    if (textData) {
      return res.status(200).json({
        choices: [
          {
            message: {
              content: textData
            }
          }
        ]
      });
    } else {
      return res.status(500).json({ error: "Pollinations API-dən boş cavab gəldi." });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
