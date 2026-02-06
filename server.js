import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'recipients.json');

// Supabase Setup
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️  WARNING: Missing Supabase credentials");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ===== API ROUTES (MUST BE BEFORE STATIC) =====

// Simple test route
app.get('/test', (req, res) => {
    res.send('Server is working!');
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: Fetch Signals
app.get('/api/signals', async (req, res) => {
    try {
        console.log('Fetching signals from Supabase...');

        const { data: liveSigs, error: liveErr } = await supabase
            .from('fx_signals')
            .select('*')
            .in('status', ['WAITING_FOR_ENTRY', 'ACTIVE', 'WAITING'])
            .order('generated_at', { ascending: false })
            .limit(1);

        if (liveErr) {
            console.error('Live signals error:', liveErr);
            throw liveErr;
        }

        const { data: history, error: histErr } = await supabase
            .from('fx_signals')
            .select('*')
            .in('status', ['CLOSED', 'CANCELLED', 'EXPIRED'])
            .order('generated_at', { ascending: false })
            .limit(50);

        if (histErr) {
            console.error('History error:', histErr);
            throw histErr;
        }

        const response = {
            success: true,
            active: liveSigs && liveSigs.length > 0 ? liveSigs[0] : null,
            history: history || []
        };

        console.log(`Returning ${history?.length || 0} historical signals`);
        res.json(response);
    } catch (err) {
        console.error("API Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// API: Register Telegram
app.post('/api/register-telegram', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

    try {
        let recipients = [];
        if (fs.existsSync(DATA_FILE)) {
            recipients = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
        if (!recipients.find(r => r.phone === phone)) {
            recipients.push({ phone, timestamp: new Date().toISOString(), status: 'active' });
            fs.writeFileSync(DATA_FILE, JSON.stringify(recipients, null, 2));
        }
        res.json({ success: true, message: 'Registered' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Storage error' });
    }
});

// ===== STATIC FILES (AFTER API ROUTES) =====
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 QUANTIX PRODUCTION SERVER`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`📡 Supabase: ${SUPABASE_URL ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`📂 Static: ${__dirname}`);
    console.log(`🔗 API: /api/signals, /api/register-telegram, /api/health`);
    console.log(`${'='.repeat(60)}\n`);
});
