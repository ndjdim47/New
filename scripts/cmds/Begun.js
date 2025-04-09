const axios = require("axios");
const { Readable } = require("stream");

module.exports.config = {
  name: "begun",
  version: "1.1",
  role: 0,
  author: "YourName",
  description: "AnimagineXL Image Generator",
  category: "𝗜𝗠𝗔𝗚𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥",
  premium: true,
  guide: "{pn} [prompt]\nExample: {pn} cute anime girl",
  countDown: 15,
};

module.exports.onStart = async ({ event, args, api }) => {
  const animagineApi = "https://renzweb.onrender.com/api/animaginexl";
  const apiKey = "c464f0a755e3f21fc9dad5a3ae1bfd2b";

  try {
    const prompt = args.join(" ");
    if (!prompt) {
      return api.sendMessage("Please provide a prompt for the image generation.", event.threadID, event.messageID);
    }

    const startTime = Date.now();
    const waitMessage = await api.sendMessage("𝐺𝑒𝑛𝑒𝑟𝑎𝑡𝑖𝑛𝑔, 𝑝𝑙𝑒𝑎𝑠𝑒 𝑤𝑎𝑖𝑡...🪄", event.threadID);
    api.setMessageReaction("⌛", event.messageID, () => {}, true);

    const apiUrl = `${animagineApi}?prompt=${encodeURIComponent(prompt)}&apiKey=${encodeURIComponent(apiKey)}`;
    console.log(`Requesting: ${apiUrl}`);

    const response = await axios.get(apiUrl, { responseType: "json" });
    console.log("Response:", response.data);

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
      imageStream = (await axios.get(apiUrl, { responseType: "stream" })).data;
    } else {
      throw new Error("Unexpected response format. Check console logs for details.");
    }

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    api.setMessageReaction("✅", event.messageID, () => {}, true);
    api.unsendMessage(waitMessage.messageID);

    // Send initial quick response
    await api.sendMessage(
      `AnimagineXL process completed ✨\n\n𝐺𝑒𝑛𝑒𝑟𝑎𝑡𝑒𝑑 𝑖𝑛 ${timeTaken} 𝑠𝑒𝑐𝑜𝑛𝑑𝑠`,
      event.threadID
    );

    // Send image
    api.sendMessage(
      {
        body: "Here’s your generated image:",
        attachment: imageStream,
      },
      event.threadID,
      event.messageID
    );

  } catch (e) {
    console.error("Error:", e.response ? { status: e.response.status, data: e.response.data } : e.message);
    api.sendMessage(`Error: ${e.message}`, event.threadID, event.messageID);
  }
};
