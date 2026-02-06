const TOKEN = '8557915866:AAHU2B4iHXRiMYJ_pWezOsHDUXMNUxpjdZE';

async function checkUpdates() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
        const data = await response.json();
        if (data.result && data.result.length > 0) {
            console.log("--- FOUND RECENT MESSAGES ---");
            data.result.forEach(update => {
                if (update.message) {
                    console.log(`From: ${update.message.from.first_name} (@${update.message.from.username})`);
                    console.log(`ID: ${update.message.from.id}`);
                    console.log(`Text: ${update.message.text}`);
                    console.log("----------------------------");
                }
            });
        } else {
            console.log("No recent messages found. Please send /start to your bot @Quantix_Tele_Bot");
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkUpdates();
