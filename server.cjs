const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'recipients.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files (index.html, etc.)

// API: Register Telegram
app.post('/api/register-telegram', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Read existing file
    let recipients = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            const raw = fs.readFileSync(DATA_FILE);
            recipients = JSON.parse(raw);
        } catch (e) {
            console.error("Error reading file:", e);
        }
    }

    // Check duplicate
    if (recipients.find(r => r.phone === phone)) {
        return res.json({ success: true, message: 'Phone already registered.' });
    }

    // Add new recipient
    const newRecipient = {
        phone,
        timestamp: new Date().toISOString(),
        status: 'active'
    };
    recipients.push(newRecipient);

    // Save to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(recipients, null, 2));
    console.log(`[New user] Registered: ${phone}`);

    res.json({ success: true, message: 'Successfully registered to file.' });
});

app.listen(PORT, () => {
    console.log(`\n---------------------------------------------------`);
    console.log(`🚀 QUANTIX SERVER RUNNING ON PORT ${PORT}`);
    console.log(`👉 Access App: http://localhost:${PORT}`);
    console.log(`📁 Recipients File: ${DATA_FILE}`);
    console.log(`---------------------------------------------------\n`);
});
