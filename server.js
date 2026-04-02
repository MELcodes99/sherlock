import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { SolRouter } from '@solrouter/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = 'sk_solrouter_YOUR_KEY_HERE';

const client = new SolRouter({ apiKey: API_KEY });
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/analyze', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  console.log('🔍 Analyzing:', prompt.slice(0, 80) + '...');

  const response = await client.chat(prompt).catch(err => {
    console.error('❌ SolRouter error:', err.message);
    res.status(500).json({ error: err.message });
    return null;
  });

  if (!response) return;

  console.log('✅ Raw response:', JSON.stringify(response).slice(0, 300));

  const raw =
    response?.message ||
    response?.content ||
    response?.text ||
    response?.result ||
    response?.output ||
    (typeof response === 'string' ? response : null);

  if (!raw) {
    console.error('❌ Unknown shape:', JSON.stringify(response));
    return res.status(500).json({
      error: `Unknown response shape. Keys received: ${Object.keys(response || {}).join(', ')}`
    });
  }

  res.json({ message: raw });
});

app.get('/ping', (_, res) => res.json({ ok: true }));

app.listen(3000, () => {
  console.log('\n🕵️  Sherlock is live → http://localhost:3000\n');
});
