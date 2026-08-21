export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, apiKey } = req.body;

  if (!imageBase64 || !apiKey) {
    return res.status(400).json({ error: 'Missing imageBase64 or apiKey' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `Extract all menu items and their prices from this receipt. Return ONLY a JSON array with no markdown formatting, like this:
[
  {"name": "Nasi Goreng", "price": 45000},
  {"name": "Mie Kuah", "price": 35000}
]

If prices have "k" (like "45k"), convert to full number (45000).
Only return the JSON array, nothing else.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ 
        error: error.error?.message || 'Claude API error' 
      });
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    return res.status(200).json({ 
      success: true,
      items: JSON.parse(content)
    });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message || 'Failed to process image' 
    });
  }
}
