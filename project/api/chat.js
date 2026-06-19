module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const { messages, model, isThinkingEnabled, isWebSearchEnabled, systemPrompt, language } = req.body;

        const response = await fetch('https://www.wormgpt.co/api/chat-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0',
                'authorization': req.headers['authorization'] || '',
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
            const err = await response.text();
            res.status(response.status).json({ error: err });
            return;
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        for await (const chunk of response.body) {
            res.write(chunk);
        }

        res.end();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};