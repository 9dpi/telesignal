const TOKEN = '8557915866:AAHU2B4iHXRiMYJ_pWezOsHDUXMNUxpjdZE';
const CHAT_ID = '7985984228';

async function sendTestMessage() {
    const msg = `🚀 *QUANTIX AI CORE - TEST MESSAGE*\n\n✅ *Status:* System Linked Successfully\n🤖 *Bot:* @Quantix_Tele_Bot\n⏰ *Time:* ${new Date().toLocaleString()}\n\nCongratulations! Your Telegram notification system is now fully operational.`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: msg,
                parse_mode: 'Markdown'
            })
        });
        const data = await response.json();
        if (data.ok) {
            console.log("✅ Test message sent successfully!");
        } else {
            console.error("❌ Failed to send message:", data.description);
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

sendTestMessage();
