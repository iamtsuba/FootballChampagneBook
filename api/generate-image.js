export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'Prompt manquant' })

  try {
    const encoded = encodeURIComponent(prompt)
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${Date.now()}`

    const response = await fetch(url)
    if (!response.ok) return res.status(500).json({ error: `Pollinations error: ${response.status}` })

    const arrayBuffer = await response.arrayBuffer()
    const b64 = Buffer.from(arrayBuffer).toString('base64')

    return res.status(200).json({ b64 })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
