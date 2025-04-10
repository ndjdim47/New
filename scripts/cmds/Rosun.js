const axios = require("axios");
const { Readable } = require("stream");

module.exports.config = {
  name: "rosun",
  version: "1.0",
  role: 0,
  author: "YourName",
  description: "Step-1x-Medium Image Generator",
  category: "𝗜𝗠𝗔𝗚𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥",
  premium: true,
  guide: "{pn} [prompt]\nExample: {pn} cute dog",
  countDown: 15,
};

module.exports.onStart = async ({ event, args, api }) => {
  const step1xApi = "https://renzweb.onrender.com/api/step-1x-medium";
  const apiKey = "c464f0a755e3f21fc9dad5a3ae1bfd2b";

  try {
    const prompt = args.join(" ");
    if (!prompt) {
      return api.sendMessage("𝙿𝚕𝚎𝚊𝚜𝚎 𝚙𝚛𝚘𝚟𝚒𝚍𝚎 𝚊 𝚙𝚛𝚘𝚖𝚙𝚝 𝚏𝚘𝚛 𝚝𝚑𝚎 𝚒𝚖𝚊𝚐𝚎 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚘𝚗.", event.threadID, event.messageID);
    }

    const startTime = Date.now();
    const waitMessage = await api.sendMessage("𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚗𝚐, 𝚙𝚕𝚎𝚊𝚜𝚎 𝚠𝚊𝚒𝚝...🪄", event.threadID);
    api.setMessageReaction("⚡", event.messageID, () => {}, true); // New reaction for processing

    const apiUrl = `${step1xApi}?prompt=${encodeURIComponent(prompt)}&apiKey=${encodeURIComponent(apiKey)}`;
    console.log(`Requesting: ${apiUrl}`);

    const response = await axios.get(apiUrl, { responseType: "json" });
    console.log("Full Response:", {
      status: response.status,
      headers: response.headers,
      data: response.data
    });

    let imageStream;
    if (response.data && typeof response.data === "object") {
      const url = response.data.imageUrl || response.data.url || response.data.image || response.data.result;
      if (url && typeof url === "string") {
        console.log("Fetching image from URL:", url);
        imageStream = (await axios.get(url, { responseType: "stream" })).data;
      } else if (response.data.image && response.data.image.startsWith("data:image")) {
        console.log("Processing base64 image");
        const base64Data = response.data.image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        imageStream = Readable.from(buffer);
      } else {
        const rawResponse = JSON.stringify(response.data, null, 2);
        throw new Error(`No recognizable image URL or data in response. Raw response:\n${rawResponse}`);
      }
    } else if (typeof response.data === "string" && response.data.startsWith("http")) {
      console.log("Fetching image from plain text URL:", response.data);
      imageStream = (await axios.get(response.data, { responseType: "stream" })).data;
    } else if (response.headers["content-type"]?.includes("image")) {
      console.log("Processing direct image response");
      imageStream = (await axios.get(apiUrl, { responseType: "stream" })).data;
    } else {
      const rawResponse = typeof response.data === "object" 
        ? JSON.stringify(response.data, null, 2) 
        : String(response.data);
      throw new Error(`Unexpected response format. Raw response:\n${rawResponse}`);
    }

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    api.setMessageReaction("🌈", event.messageID, () => {}, true); // New reaction for success
    api.unsendMessage(waitMessage.messageID);

    // Send initial quick response with modified font
    await api.sendMessage(
      `𝚂𝚝𝚎𝚙-𝟷𝚡-𝙼𝚎𝚍𝚒𝚞𝚖 𝚙𝚛𝚘𝚌𝚎𝚜𝚜 𝚌𝚘𝚖𝚙𝚕𝚎𝚝𝚎𝚍 ✨\n\n𝙶𝚎𝚗𝚎𝚛𝚊𝚝𝚎𝚍 𝚒𝚗 ${timeTaken} 𝚜𝚎𝚌𝚘𝚗𝚍𝚜`,
      event.threadID
    );

    // Send image with modified font
    api.sendMessage(
      {
        body: "𝙷𝚎𝚛𝚎’𝚜 𝚢𝚘𝚞𝚛 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚎𝚍 𝚒𝚖𝚊𝚐𝚎:",
        attachment: imageStream,
      },
      event.threadID,
      event.messageID
    );

  } catch (e) {
    console.error("Error Details:", {
      message: e.message,
      response: e.response ? {
        status: e.response.status,
        data: e.response.data,
        headers: e.response.headers
      } : "No response data"
    });
    
    let errorMessage = "𝙰𝚗 𝚎𝚛𝚛𝚘𝚛 𝚘𝚌𝚌𝚞𝚛𝚛𝚎𝚍 𝚠𝚑𝚒𝚕𝚎 𝚐𝚎𝚗𝚎𝚛𝚊𝚝𝚒𝚗𝚐 𝚝𝚑𝚎 𝚒𝚖𝚊𝚐𝚎.";
    if (e.response && e.response.status === 404) {
      errorMessage = "𝙰𝙿𝙸 𝚎𝚗𝚍𝚙𝚘𝚒𝚗𝚝 𝚗𝚘𝚝 𝚏𝚘𝚞𝚗𝚍 (𝟺𝟶𝟺). 𝙿𝚕𝚎𝚊𝚜𝚎 𝚟𝚎𝚛𝚒𝚏𝚢 '𝚜𝚝𝚎𝚙-𝟷𝚡-𝚖𝚎𝚍𝚒𝚞𝚖' 𝚒𝚜 𝚌𝚘𝚛𝚛𝚎𝚌𝚝.";
    } else if (e.message) {
      errorMessage = `𝙴𝚛𝚛𝚘𝚛: ${e.message}`;
    }

    api.setMessageReaction("💥", event.messageID, () => {}, true); // New reaction for error
    api.unsendMessage(waitMessage.messageID);
    api.sendMessage(errorMessage, event.threadID, event.messageID);
  }
};
