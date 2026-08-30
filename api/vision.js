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
        model: 'claude-sonnet-5',
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
              text: `Extract menu items, tax, and service charges from this receipt. Return ONLY valid JSON (no markdown) in this exact format:
{
  "items": [
    {"name": "Nasi Goreng", "price": 45000},
    {"name": "Mie Kuah", "price": 35000}
  ],
  "tax": 12000,
  "service": 8000
}

Rules:
- items: array of {name, price}
- tax: number (0 if not found). Look for "tax", "pajak", "pb", "tpb", etc
- service: number (0 if not found). Look for "service", "sc", "svc", etc
- If prices have "k" (like "45k"), convert to full number (45000)
- Convert all amounts to numbers, strip commas/spaces
- Return ONLY the JSON object, no explanations or markdown`
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
    const content = data.content[0].text.trim();
    
    // Parse JSON - handle any markdown formatting
    let jsonStr = content;
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    const result = JSON.parse(jsonStr);
    
    return res.status(200).json({ 
      success: true,
      items: result.items || [],
      tax: result.tax || 0,
      service: result.service || 0
    });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message || 'Failed to process image' 
    });
  }
}
