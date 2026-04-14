export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.TOGETHER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'TOGETHER_API_KEY manquante sur le serveur' })

  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'Prompt manquant' })

  try {
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt,
        width: 512,
        height: 512,
        steps: 4,
        n: 1,
        response_format: 'b64_json'
      })
    })

    const data = await response.json()
    if (data.error) return res.status(400).json({ error: data.error.message || JSON.stringify(data.error) })

    const b64 = data.data?.[0]?.b64_json
    if (!b64) return res.status(500).json({ error: 'Aucune image retournée par le modèle' })

    return res.status(200).json({ b64 })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
