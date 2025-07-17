// === TOOL COMMANDS MODULE ===
// This file contains all the tool command handlers for the WhatsApp bot

const fetch = require('node-fetch');
const { createHash } = require('crypto');

// We'll pass the reply function from the main bot
let replyFunction = null;

function setReplyFunction(reply) {
    replyFunction = reply;
}

async function reply(sock, msg, text) {
    if (replyFunction) {
        return await replyFunction(sock, msg, text);
    }
    // Fallback if reply function not set
    console.log('Reply function not set, logging message:', text);
}

// IP Info
async function handleIp(sock, msg, ip) {
    if (!ip) return await reply(sock, msg, 'Usage: !ip <ip address>');
    try {
        const res = await fetch(`https://ipinfo.io/${ip}/json`);
        const data = await res.json();
        if (data.error) return await reply(sock, msg, '❌ Invalid IP address.');
        await reply(sock, msg, `🌐 *IP Info:*\nIP: ${data.ip}\nCity: ${data.city}\nRegion: ${data.region}\nCountry: ${data.country}\nOrg: ${data.org}\nLoc: ${data.loc}`);
    } catch {
        await reply(sock, msg, '❌ Error fetching IP info.');
    }
}

// DNS Lookup
async function handleDns(sock, msg, domain) {
    if (!domain) return await reply(sock, msg, 'Usage: !dns <domain>');
    try {
        const res = await fetch(`https://dns.google/resolve?name=${domain}`);
        const data = await res.json();
        await reply(sock, msg, '```json\n' + JSON.stringify(data, null, 2) + '\n```');
    } catch {
        await reply(sock, msg, '❌ Error fetching DNS info.');
    }
}

// HTTP Headers
async function handleHeaders(sock, msg, url) {
    if (!url) return await reply(sock, msg, 'Usage: !headers <url>');
    try {
        const res = await fetch(url);
        const headers = {};
        res.headers.forEach((v, k) => headers[k] = v);
        await reply(sock, msg, '```json\n' + JSON.stringify(headers, null, 2) + '\n```');
    } catch {
        await reply(sock, msg, '❌ Error fetching headers.');
    }
}

// Ping URL
async function handlePingUrl(sock, msg, url) {
    if (!url) return await reply(sock, msg, 'Usage: !pingurl <url>');
    try {
        const start = Date.now();
        await fetch(url);
        const ms = Date.now() - start;
        await reply(sock, msg, `✅ ${url} responded in ${ms} ms.`);
    } catch {
        await reply(sock, msg, `❌ ${url} is unreachable.`);
    }
}

// Color Info
async function handleColorInfo(sock, msg, hex) {
    if (!hex) return await reply(sock, msg, 'Usage: !colorinfo <hex>');
    try {
        const response = await fetch(`https://www.thecolorapi.com/id?hex=${hex.replace('#','')}`);
        const data = await response.json();
        await reply(sock, msg, `🎨 *Color Information*\n\n🔴 Hex: #${hex.toUpperCase()}\n📝 Name: ${data.name.value}\n🎯 RGB: ${data.rgb.value}\n🌐 HSL: ${data.hsl.value}`);
    } catch {
        await reply(sock, msg, '❌ Error fetching color info.');
    }
}

// Font Converter (simple Unicode fonts)
const fontStyles = {
    bold: str => str.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x1D400 - 0x41)),
    italic: str => str.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x1D434 - 0x41)),
    monospace: str => str.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x1D670 - 0x41)),
};

async function handleFont(sock, msg, style, text) {
    if (!style || !text) return await reply(sock, msg, 'Usage: !font <bold|italic|monospace> <text>');
    if (!fontStyles[style]) return await reply(sock, msg, 'Available styles: bold, italic, monospace');
    await reply(sock, msg, fontStyles[style](text));
}

// ASCII Art (text only)
async function handleAscii(sock, msg, text) {
    if (!text) return await reply(sock, msg, 'Usage: !ascii <text>');
    try {
        const res = await fetch(`https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}`);
        const art = await res.text();
        await reply(sock, msg, '```\n' + art + '\n```');
    } catch {
        await reply(sock, msg, '❌ Error generating ASCII art.');
    }
}

// RemindMe (simple, per session)
const reminders = {};
async function handleRemindMe(sock, msg, seconds, text) {
    const s = parseInt(seconds);
    if (isNaN(s) || s < 1 || s > 3600 || !text) return await reply(sock, msg, 'Usage: !remindme <seconds> <text> (1-3600)');
    const user = msg.key.participant || msg.key.remoteJid;
    await reply(sock, msg, `⏰ Reminder set for ${s} seconds.`);
    setTimeout(() => {
        reply(sock, msg, `⏰ Reminder: ${text}`);
    }, s * 1000);
}

// Simple TODO and Note (per session, per user)
const userTodos = {};
const userNotes = {};

async function handleTodo(sock, msg, text) {
    const user = msg.key.participant || msg.key.remoteJid;
    if (!text) {
        const todos = userTodos[user] || [];
        return await reply(sock, msg, '📝 *Your TODOs:*\n' + (todos.length ? todos.map((t,i)=>`${i+1}. ${t}`).join('\n') : 'No todos.'));
    }
    if (!userTodos[user]) userTodos[user] = [];
    userTodos[user].push(text);
    await reply(sock, msg, `✅ Added to your TODOs: ${text}`);
}

async function handleNote(sock, msg, text) {
    const user = msg.key.participant || msg.key.remoteJid;
    if (!text) {
        return await reply(sock, msg, '🗒️ *Your Note:*\n' + (userNotes[user] || 'No note.'));
    }
    userNotes[user] = text;
    await reply(sock, msg, `✅ Note saved.`);
}

// Unit Conversion (simple)
async function handleUnit(sock, msg, from, to, value) {
    if (!from || !to || !value) return await reply(sock, msg, 'Usage: !unit <from> <to> <value>\nExample: !unit cm in 10');
    try {
        // Simple conversion examples
        const conversions = {
            'cm in': (v) => v / 2.54,
            'in cm': (v) => v * 2.54,
            'km mi': (v) => v * 0.621371,
            'mi km': (v) => v * 1.60934,
            'kg lb': (v) => v * 2.20462,
            'lb kg': (v) => v * 0.453592,
            'c f': (v) => (v * 9/5) + 32,
            'f c': (v) => (v - 32) * 5/9
        };
        
        const key = `${from} ${to}`;
        if (conversions[key]) {
            const result = conversions[key](parseFloat(value));
            await reply(sock, msg, `${value} ${from} = ${result.toFixed(2)} ${to}`);
        } else {
            await reply(sock, msg, '❌ Conversion not supported. Try: cm in, km mi, kg lb, c f');
        }
    } catch {
        await reply(sock, msg, '❌ Error converting units.');
    }
}

// WHOIS Lookup (simplified)
async function handleWhois(sock, msg, domain) {
    if (!domain) return await reply(sock, msg, 'Usage: !whois <domain>');
    try {
        // Use a free WHOIS API
        const res = await fetch(`https://api.domainsdb.info/v1/domains/search?domain=${domain}`);
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
            const domainInfo = data.domains[0];
            await reply(sock, msg, `🌐 *WHOIS Info:*\nDomain: ${domainInfo.domain}\nCreate Date: ${domainInfo.create_date}\nUpdate Date: ${domainInfo.update_date}\nExpiry Date: ${domainInfo.expiry_date}\nRegistrar: ${domainInfo.registrar || 'Unknown'}`);
        } else {
            await reply(sock, msg, '❌ Domain not found or no WHOIS data available.');
        }
    } catch {
        await reply(sock, msg, '❌ Error fetching WHOIS info.');
    }
}

// Export all functions
module.exports = {
    setReplyFunction,
    handleIp,
    handleDns,
    handleHeaders,
    handlePingUrl,
    handleColorInfo,
    handleFont,
    handleAscii,
    handleRemindMe,
    handleTodo,
    handleNote,
    handleUnit,
    handleWhois
}; 