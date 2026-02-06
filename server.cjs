const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'recipients.json');

// Supabase Setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// PROXY API: Fetch Signals
app.get('/api/signals', async (req, res) => {
    try {
        // 1. Fetch live/waiting signal
        const { data: liveSigs, error: liveErr } = await supabase
            .from('fx_signals')
            .select('*')
            .in('status', ['WAITING_FOR_ENTRY', 'ACTIVE', 'WAITING'])
            .order('generated_at', { ascending: false })
            .limit(1);

        if (liveErr) throw liveErr;

        // 2. Fetch history
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
            history: history
        });
    } catch (err) {
        console.error("Proxy Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// API: Register Telegram
app.post('/api/register-telegram', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    let recipients = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            const raw = fs.readFileSync(DATA_FILE);
            recipients = JSON.parse(raw);
        } catch (e) {
            console.error("Error reading file:", e);
        }
    }

    if (recipients.find(r => r.phone === phone)) {
        return res.json({ success: true, message: 'Phone already registered.' });
    }

    const newRecipient = {
        phone,
        timestamp: new Date().toISOString(),
        status: 'active'
    };
    recipients.push(newRecipient);

    fs.writeFileSync(DATA_FILE, JSON.stringify(recipients, null, 2));
    console.log(`[New user] Registered: ${phone}`);

    res.json({ success: true, message: 'Successfully registered to file.' });
});

app.listen(PORT, () => {
    console.log(`\n---------------------------------------------------`);
    console.log(`🚀 QUANTIX SECURE SERVER RUNNING ON PORT ${PORT}`);
    console.log(`👉 Access App: http://localhost:${PORT}`);
    console.log(`---------------------------------------------------\n`);
});
