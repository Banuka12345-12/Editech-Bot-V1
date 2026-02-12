const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    downloadMediaMessage, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const Tesseract = require('tesseract.js');
const fs = require('fs');

// --- Details ---
const BOT_NAME = "🔰 EDITECH BOT 🔰";
const OWNER_NAME = "Bhanuka Bandaranayaka";
const FB_PAGE_LINK = "https://www.facebook.com/profile.php?id=61587049310859";
const WA_CHANNEL = "https://whatsapp.com/channel/0029Vb7lsm8E50UbDGZW7w2U";
const MY_NUMBER = "94750700533"; // ⚠️ මෙතනට උඹේ නම්බර් එක දාපන්

let verifiedUsers = fs.existsSync('./verified.json') ? JSON.parse(fs.readFileSync('./verified.json', 'utf-8')) : [];

async function startEditechBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Auto Pairing Code for Hugging Face
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(MY_NUMBER.trim());
            console.log(`\n\n************************************`);
            console.log(`✅ YOUR PAIRING CODE: ${code}`);
            console.log(`************************************\n\n`);
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') console.log('EDITECH BOT IS ONLINE ✅');
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();
        const isImage = msg.message.imageMessage;
        const footer = `\n\n👨‍💻 Owner: ${OWNER_NAME}\n📢 Channel: ${WA_CHANNEL}`;

        // --- Verification System (Screenshot OCR) ---
        if (!verifiedUsers.includes(from)) {
            if (isImage) {
                await sock.sendMessage(from, { text: '🔍 ඔබේ Screenshot එක පරීක්ෂා කරමින් පවතී...' });
                try {
                    const buffer = await downloadMediaMessage(msg, 'buffer', {});
                    const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'eng');
                    const cleanText = ocrText.toLowerCase();

                    if (cleanText.includes('following') || cleanText.includes('followed') || cleanText.includes('liked')) {
                        verifiedUsers.push(from);
                        fs.writeFileSync('./verified.json', JSON.stringify(verifiedUsers));
                        await sock.sendMessage(from, { text: `✅ ස්තූතියි! තහවුරු කිරීම සාර්ථකයි. දැන් ඔබට සේවාව විවෘතයි.${footer}` });
                    } else {
                        await sock.sendMessage(from, { text: `❌ කරුණාකර පේජ් එක Follow කර ඇති බව පෙනෙන Screenshot එකක් එවන්න.${footer}` });
                    }
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ දෝෂයක්. නැවත එවන්න.' });
                }
                return;
            }
            await sock.sendMessage(from, { text: `ආයුබෝවන්! 🙏 ${BOT_NAME} භාවිතා කිරීමට පෙර:\n\n1. පේජ් එක Follow කරන්න: ${FB_PAGE_LINK}\n2. එහි Screenshot එකක් එවන්න.${footer}` });
            return;
        }

        // --- Commands / FB Downloader ---
        if (text.includes('facebook.com') || text.includes('fb.watch')) {
            await sock.sendMessage(from, { text: '📥 වීඩියෝව සූදානම් කරමින් පවතී...' });
            try {
                const res = await axios.get(`https://api.botcahlx.live/api/download/fbdown?url=${text}&apikey=beta`);
                const result = res.data.result;
                if (result?.Normal_Video) {
                    await sock.sendMessage(from, { video: { url: result.Normal_Video }, caption: `✅ සාර්ථකයි!${footer}` });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ දෝෂයක් සිදුවුණා.' });
            }
        }
    });
}

startEditechBot();
