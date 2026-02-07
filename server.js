import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nodemailer from 'nodemailer';
import TelegramBot from 'node-telegram-bot-api';
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

const supabase = (SUPABASE_URL && SUPABASE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

if (!supabase) {
    console.warn("⚠️  Supabase Not Initialized (Missing URL/KEY). Local API routes will return errors, but Static Server will work.");
}

// Email Setup (SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App Password if using Gmail
    }
});

// Telegram Bot Setup
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_ID; // Optional: The group you want users to join

const bot = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN, { polling: false }) : null;

async function sendTelegramNotification(phone) {
    if (!bot || !ADMIN_CHAT_ID) {
        console.warn("⚠️ Telegram Bot or Admin Chat ID missing. Skipping notification.");
        return;
    }

    // 1. Notify Admin
    const adminMsg = `🚀 *New Telegram Registration*\n\n📱 *Phone:* \`${phone}\`\n⏰ *Time:* ${new Date().toLocaleString()}\n\n_Please verify and add to group if necessary._`;

    try {
        await bot.sendMessage(ADMIN_CHAT_ID, adminMsg, { parse_mode: 'Markdown' });
        console.log(`[Telegram] Admin notified for ${phone}`);

        // 2. Generate Invite Link (Optional - if the bot is admin in the group)
        if (GROUP_CHAT_ID) {
            const invite = await bot.createChatInviteLink(GROUP_CHAT_ID, {
                member_limit: 1,
                expire_date: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
            });
            return invite.invite_link;
        }
    } catch (err) {
        console.error("Telegram Notification Error:", err.message);
    }
    return null;
}

async function sendEmailNotification(phone) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("⚠️ Email credentials missing. Skipping notification.");
        return;
    }
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'vuquangcuong@gmail.com',
        subject: '🚀 New Telegram Registration - Tele Signal',
        text: `New registration detected:\n\nPhone: ${phone}\nTime: ${new Date().toLocaleString()}\n\nRegards,\nQuantix AI Core`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Notification sent for ${phone}`);
    } catch (err) {
        console.error("Email Error:", err.message);
    }
}

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
        if (!supabase) {
            console.warn('Supabase not connected. Returning empty data.');
            return res.json({ success: true, active: null, history: [] });
        }
        console.log('Fetching signals from Supabase...');

        const START_DATE = '2026-02-01T00:00:00Z';

        const { data: liveSigs, error: liveErr } = await supabase
            .from('fx_signals')
            .select('*')
            .in('status', ['WAITING_FOR_ENTRY', 'ACTIVE', 'WAITING'])
            .gte('generated_at', START_DATE)
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
            .gte('generated_at', START_DATE)
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
app.post('/api/register-telegram', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

    try {
        let recipients = [];
        if (fs.existsSync(DATA_FILE)) {
            recipients = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }

        let inviteLink = null;
        if (!recipients.find(r => r.phone === phone)) {
            recipients.push({ phone, timestamp: new Date().toISOString(), status: 'active' });
            fs.writeFileSync(DATA_FILE, JSON.stringify(recipients, null, 2));

            // 1. Send Email Notification
            await sendEmailNotification(phone);

            // 2. Send Telegram Notification to Admin & Get Invite Link
            inviteLink = await sendTelegramNotification(phone);
        }

        res.json({
            success: true,
            message: 'Registered',
            inviteLink: inviteLink // Return the link to the frontend
        });
    } catch (e) {
        console.error("Registration Error:", e);
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
