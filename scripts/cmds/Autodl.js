const fs = require("fs-extra");
const axios = require("axios");

module.exports.config = {
    name: "autodl",
    version: "1.0.1",
    hasPermission: 0,
    credits: "ayanokoji",
    description: "Auto download videos from Instagram, Facebook, and TikTok",
    commandCategory: "media",
    usages: "Paste a video URL",
    cooldowns: 5
};

module.exports.onStart = async function ({ api, event }) {
    const { threadID, messageID, body } = event;

    console.log(`Message received: ${body}`);

    if (body.toLowerCase().includes('autolink')) {
        return api.sendMessage("AutoLink is active.", threadID, messageID);
    }

    const urlInfo = checkLink(body);
    if (!urlInfo) {
        console.log("No valid URL found in message");
        return;
    }

    const { url } = urlInfo;
    console.log(`Found URL: ${url}`);
    
    api.setMessageReaction("⏳", messageID, (err) => {if(err) console.error(err)}, true);
    await download(url, api, event);
};

function checkLink(message) {
    const regex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(regex);
    if (!urls) return null;

    const url = urls[0];
    console.log(`Checking URL: ${url}`);
    if (
        url.includes("instagram.com") ||
        url.includes("facebook.com") ||
        url.includes("fb.watch") ||
        url.includes("tiktok.com")
    ) {
        return { url };
    }
    return null;
}

async function download(url, api, event) {
    const time = Date.now();
    const path = `${__dirname}/cache/${time}.mp4`;

    try {
        if (!fs.existsSync(__dirname + '/cache')) {
            fs.mkdirSync(__dirname + '/cache');
            console.log("Created cache directory");
        }

        if (url.includes("instagram.com")) {
            await downloadInstagram(url, api, event, path);
        } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
            await downloadFacebook(url, api, event, path);
        } else if (url.includes("tiktok.com")) {
            await downloadTikTok(url, api, event, path);
        }
    } catch (err) {
        console.error("Download error:", err);
        api.setMessageReaction("❎", event.messageID, (err) => {}, true);
        api.sendMessage(`Error: ${err.message}`, event.threadID, event.messageID);
    }
}

async function downloadInstagram(url, api, event, path) {
    try {
        const downloadUrl = await getLink(url, "instagram");
        console.log(`Instagram download URL: ${downloadUrl}`);
        await downloadFile(downloadUrl, path);

        if (fs.statSync(path).size / 1024 / 1024 > 25) {
            fs.unlinkSync(path);
            return api.sendMessage("The file is too large to be sent (>25MB).", event.threadID, event.messageID);
        }

        const messageBody = `✅ Downloaded from Instagram`;
        api.sendMessage({
            body: messageBody,
            attachment: fs.createReadStream(path)
        }, event.threadID, () => fs.unlinkSync(path), event.messageID);
        api.setMessageReaction("✅", event.messageID, (err) => {}, true);
    } catch (err) {
        throw new Error(`Instagram download failed: ${err.message}`);
    }
}

async function downloadFacebook(url, api, event, path) {
    try {
        const downloadUrl = await getLink(url, "facebook");
        console.log(`Facebook download URL: ${downloadUrl}`);
        await downloadFile(downloadUrl, path);

        if (fs.statSync(path).size / 1024 / 1024 > 25) {
            fs.unlinkSync(path);
            return api.sendMessage("The file is too large to be sent (>25MB).", event.threadID, event.messageID);
        }

        const messageBody = `✅ Downloaded from Facebook`;
        api.sendMessage({
            body: messageBody,
            attachment: fs.createReadStream(path)
        }, event.threadID, () => fs.unlinkSync(path), event.messageID);
        api.setMessageReaction("✅", event.messageID, (err) => {}, true);
    } catch (err) {
        throw new Error(`Facebook download failed: ${err.message}`);
    }
}

async function downloadTikTok(url, api, event, path) {
    try {
        const downloadUrl = await getLink(url, "tiktok");
        console.log(`TikTok download URL: ${downloadUrl}`);
        await downloadFile(downloadUrl, path);

        if (fs.statSync(path).size / 1024 / 1024 > 25) {
            fs.unlinkSync(path);
            return api.sendMessage("The file is too large to be sent (>25MB).", event.threadID, event.messageID);
        }

        const messageBody = `✅ Downloaded from TikTok`;
        api.sendMessage({
            body: messageBody,
            attachment: fs.createReadStream(path)
        }, event.threadID, () => fs.unlinkSync(path), event.messageID);
        api.setMessageReaction("✅", event.messageID, (err) => {}, true);
    } catch (err) {
        throw new Error(`TikTok download failed: ${err.message}`);
    }
}

async function getLink(url, platform) {
    let apiUrl;
    switch(platform) {
        case "instagram":
            apiUrl = `https://api.snapinsta.app/v1/download?url=${encodeURIComponent(url)}`;
            break;
        case "facebook":
            apiUrl = `https://fbdownloader-api.vercel.app/facebook?url=${encodeURIComponent(url)}`;
            break;
        case "tiktok":
            apiUrl = `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`;
            break;
        default:
            throw new Error("Unsupported platform");
    }
    
    try {
        const response = await axios.get(apiUrl);
        console.log(`API response for ${platform}:`, response.data);
        
        // Handle different API response formats
        if (platform === "instagram") {
            return response.data.url[0].url; // SnapInsta returns array
        } else if (platform === "facebook") {
            return response.data.hd || response.data.sd; // FB returns hd/sd options
        } else if (platform === "tiktok") {
            return response.data.download_url;
        }
    } catch (err) {
        throw new Error(`API request failed: ${err.message}`);
    }
}

async function downloadFile(url, path) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    const writer = fs.createWriteStream(path);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log(`File saved to ${path}`);
            resolve();
        });
        writer.on('error', (err) => {
            console.error("File write error:", err);
            reject(err);
        });
    });
      }
