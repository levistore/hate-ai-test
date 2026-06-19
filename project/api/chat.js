// Vercel Serverless Function - api/chat.js
// Berfungsi sebagai proxy aman untuk meneruskan request ke WormGPT, melumpuhkan CORS, dan menjaga keamanan token.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
    }

    try {
        const { messages, model, isThinkingEnabled, isWebSearchEnabled, systemPrompt, language } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Payload 'messages' wajib diisi dan berupa array." });
        }

        const wormGptUrl = 'https://www.wormgpt.co/api/chat-proxy';
        
        // Ambil token otorisasi dari header request client
        const authHeader = req.headers['authorization'] || '';

        // Hubungi server WormGPT secara server-to-server (bebas kendala CORS)
        const response = await fetch(wormGptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'authorization': authHeader,
                'origin': 'https://www.wormgpt.co',
                'referer': 'https://www.wormgpt.co/chat'
            },
            body: JSON.stringify({
                messages,
                stream: true,
                model: model || 'wormv5.1',
                isThinkingEnabled: !!isThinkingEnabled,
                isWebSearchEnabled: !!isWebSearchEnabled,
                systemPrompt: systemPrompt || '',
                language: language || 'Indonesian'
            })
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => 'Gagal membaca detail error.');
            return res.status(response.status).json({ 
                error: `Server upstream mengembalikan kode status ${response.status}`,
                details: errBody
            });
        }

        // Set header khusus untuk mengaktifkan SSE streaming ke client
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Mencegah buffering di server proxy Vercel/Nginx
        });

        // Alirkan chunk data langsung ke respon client tanpa membebani memori server
        const reader = response.body;
        for await (const chunk of reader) {
            res.write(chunk);
        }
        
        res.end();

    } catch (error) {
        console.error('[PROXY ERROR]', error);
        return res.status(500).json({ 
            error: "Terjadi kegagalan internal pada server proxy.", 
            details: error.message 
        });
    }
}