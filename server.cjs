const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(process.cwd(), 'recipients.json');

// Supabase Setup
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_KEY environment variables.");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

app.use(cors());
app.use(bodyParser.json());

// 1. PROXY API: Fetch Signals
app.get('/api/signals', async (req, res) => {
    console.log(`[API] Signal Request Received at ${new Date().toLocaleTimeString()}`);
    try {
        // Fetch live signal
        const { data: liveSigs, error: liveErr } = await supabase
            .from('fx_signals')
            .select('*')
            .in('status', ['WAITING_FOR_ENTRY', 'ACTIVE', 'WAITING'])
            .order('generated_at', { ascending: false })
            .limit(1);

        if (liveErr) throw liveErr;

        // Fetch history
        const { data: history, error: histErr } = await supabase
            .from('fx_signals')
            .select('*')
            .in('status', ['CLOSED', 'CANCELLED', 'EXPIRED'])
            .order('generated_at', { ascending: false })
            .limit(50);

        if (histErr) throw histErr;

        res.json({
            success: true,
            active: liveSigs && liveSigs.length > 0 ? liveSigs[0] : null,
            history: history || []
        });
    } catch (err) {
        console.error("Proxy API Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. API: Register Telegram
app.post('/api/register-telegram', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });

    try {
        let recipients = [];
        if (fs.existsSync(DATA_FILE)) {
            recipients = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
        if (!recipients.find(r => r.phone === phone)) {
            recipients.push({ phone, timestamp: new Date().toISOString(), status: 'active' });
            fs.writeFileSync(DATA_FILE, JSON.stringify(recipients, null, 2));
        }
        res.json({ success: true, message: 'Registered successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'File system error' });
    }
});

// 3. Serve Static Files (MUST be after API routes)
app.use(express.static(process.cwd()));

app.listen(PORT, () => {
    console.log(`\n---------------------------------------------------`);
    console.log(`🚀 QUANTIX SECURE SERVER RUNNING ON PORT ${PORT}`);
    console.log(`🔗 API Endpoint: /api/signals`);
    console.log(`---------------------------------------------------\n`);
});
