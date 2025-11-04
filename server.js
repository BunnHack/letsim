import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Your API key should be in an environment variable for security.
// For this example, it's hardcoded, but in a real app, use process.env.OPENROUTER_API_KEY
const OPENROUTER_API_KEY = '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';

app.use(express.json());
app.use(express.static('.')); // Serve all static files from the root directory

app.post('/api/generate', async (req, res) => {
    try {
        const { model, messages, referer } = req.body;

        if (!model || !messages) {
            return res.status(400).send({ error: 'Missing model or messages in request body' });
        }

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': referer || 'http://localhost:3000', // Pass referer from client
                'X-Title': 'AI Code Preview', // Required by OpenRouter free tier
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
            }),
        });

        if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            console.error('OpenRouter API error:', openRouterResponse.status, errorText);
            return res.status(openRouterResponse.status).send(errorText);
        }

        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive'); 

        // Pipe the streaming response from OpenRouter directly to the client
        openRouterResponse.body.pipe(res);

    } catch (error) {
        console.error('Server error in /api/generate:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Open editor.html at http://localhost:${PORT}/editor.html`);
});