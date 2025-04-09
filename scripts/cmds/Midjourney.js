const axios = require("axios");
const { Readable } = require("stream");

module.exports.config = {
  name: "midjourney",
  version: "1.6",
  role: 0,
  author: "YourName",
  description: "MidJourney Image Generator",
  category: "𝗜𝗠𝗔𝗚𝗘 𝗚𝗘�_N𝗘𝗥𝗔𝗧𝗢𝗥",
  premium: true,
  guide: "{pn} [prompt] --ratio 1:1\n{pn} [prompt]\nReply with U1, U2, U3, or U4 to select an image",
  countDown: 15,
};

module.exports.onStart = async ({ event, args, api }) => {
  const midJourneyApi = "https://api.zetsu.xyz/api/midjourney";
  const apiKey = "c464f0a755e3f21fc9dad5a3ae1bfd2b";

  try {
    const prompt = args.join(" ");
    const [promptText, ratio = "1:1"] = prompt.includes("--ratio")
      ? prompt.split("--ratio").map(s => s.trim())
      : [prompt, "1:1"];

    if (!promptText) {
      return api.sendMessage("Please provide a prompt for the image generation.", event.threadID, event.messageID);
    }

    const startTime = Date.now();
    const waitMessage = await api.sendMessage("𝐺𝑒𝑛𝑒𝑟𝑎𝑡𝑖𝑛𝑔, 𝑝𝑙𝑒𝑎𝑠𝑒 𝑤𝑎𝑖𝑡...🪄", event.threadID);
    api.setMessageReaction("⌛", event.messageID, () => {}, true);

    const attempts = [
      { name: "Bearer Token", url: `${midJourneyApi}?prompt=${encodeURIComponent(promptText)}&ratio=${encodeURIComponent(ratio)}`, config: { headers: { Authorization: `Bearer ${apiKey}` } } },
      { name: "x-api-key Header", url: `${midJourneyApi}?prompt=${encodeURIComponent(promptText)}&ratio=${encodeURIComponent(ratio)}`, config: { headers: { "x-api-key": apiKey } } },
      { name: "API Key in Query", url: `${midJourneyApi}?prompt=${encodeURIComponent(promptText)}&ratio=${encodeURIComponent(ratio)}&apiKey=${encodeURIComponent(apiKey)}`, config: {} },
    ];

    let response, successfulMethod = "";
    for (const attempt of attempts) {
      console.log(`Trying ${attempt.name} - URL: ${attempt.url}`);
      try {
        response = await axios.get(attempt.url, { ...attempt.config, responseType: "json" });
        successfulMethod = attempt.name;
        console.log(`Success with ${attempt.name} - Response:`, response.data);
        break;
      } catch (err) {
        console.error(`${attempt.name} failed:`, err.response ? { status: err.response.status, data: err.response.data } : err.message);
        if (err.response && err.response.status !== 401) throw err;
      }
    }

    if (!response) throw new Error("All authentication attempts failed with status 401.");

    let imageStreams = [];
    let imageUrls = [];
    
    if (response.data && typeof response.data === "object") {
      if (response.data.images && Array.isArray(response.data.images)) {
        console.log("Fetching multiple images from URLs:", response.data.images);
        imageUrls = response.data.images;
        imageStreams = await Promise.all(
          response.data.images.map(async (url) => {
            const imageResponse = await axios.get(url, { responseType: "stream" });
            return imageResponse.data;
          })
        );
      }
      else if (response.data.imageUrl || response.data.url || response.data.image || response.data.result) {
        const url = response.data.imageUrl || response.data.url || response.data.image || response.data.result;
        console.log("Fetching single image from URL:", url);
        imageUrls = [url];
        imageStreams = [(await axios.get(url, { responseType: "stream" })).data];
      }
      else if (response.data.image && response.data.image.startsWith("data:image")) {
        console.log("Processing base64 image");
        const base64Data = response.data.image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        imageStreams = [Readable.from(buffer)];
        imageUrls = ["Base64 Image"];
      }
      else {
        const rawResponse = JSON.stringify(response.data, null, 2);
        throw new Error(`No recognizable image data in JSON response. Raw response:\n${rawResponse}`);
      }
    } 
    else if (typeof response.data === "string" && response.data.startsWith("http")) {
      console.log("Fetching image from plain text URL:", response.data);
      imageUrls = [response.data];
      imageStreams = [(await axios.get(response.data, { responseType: "stream" })).data];
    } 
    else if (response.headers["content-type"]?.includes("image")) {
      imageStreams = [(await axios.get(attempts.find(a => a.name === successfulMethod).url, {
        ...attempts.find(a => a.name === successfulMethod).config,
        responseType: "stream",
      })).data];
      imageUrls = ["Direct Image"];
    } 
    else {
      throw new Error("Unexpected response format. Check console logs for details.");
    }

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    api.setMessageReaction("✅", event.messageID, () => {}, true);
    api.unsendMessage(waitMessage.messageID);

    // Send all images with selection options
    const messageBody = `Midjourney process completed ✨\n\n❏ Action: ${imageStreams.length > 1 ? 'U1, U2, U3, U4' : 'U1'}\n\n𝐺𝑒𝑛𝑒𝑟𝑎𝑡𝑒𝑑 𝑖𝑛 ${timeTaken} 𝑠𝑒𝑐𝑜𝑛𝑑𝑠 via ${successfulMethod}\nReply with U1${imageStreams.length > 1 ? ', U2, U3, or U4' : ''} to select an image`;
    
    api.sendMessage(
      {
        body: messageBody,
        attachment: imageStreams,
      },
      event.threadID,
      (err, messageInfo) => {
        if (!err) {
          global.client.handleReply.push({
            name: module.exports.config.name,
            messageID: messageInfo.messageID,
            author: event.senderID,
            imageUrls: imageUrls,
          });
        }
      }
    );
  } catch (e) {
    console.error("Final Error:", e.response ? { status: e.response.status, data: e.response.data } : e.message);
    api.sendMessage(`Error: ${e.message}`, event.threadID, event.messageID);
  }
};

module.exports.handleReply = async ({ api, event, handleReply }) => {
  if (event.senderID !== handleReply.author) return;

  const selection = event.body.toUpperCase();
  const validOptions = ['U1', 'U2', 'U3', 'U4'];
  
  if (!validOptions.includes(selection)) {
    return api.sendMessage("Please reply with a valid option (U1, U2, U3, or U4)", event.threadID, event.messageID);
  }

  const imageIndex = parseInt(selection[1]) - 1;
  
  if (imageIndex >= handleReply.imageUrls.length || imageIndex < 0) {
    return api.sendMessage(`Invalid selection. Please choose between U1${handleReply.imageUrls.length > 1 ? ` and U${handleReply.imageUrls.length}` : ''}`, event.threadID, event.messageID);
  }

  const selectedImageUrl = handleReply.imageUrls[imageIndex];
  const imageStream = await axios.get(selectedImageUrl, { responseType: "stream" });
  
  api.sendMessage(
    {
      body: `Selected image ${selection}`,
      attachment: imageStream.data
    },
    event.threadID,
    event.messageID
  );

  // Remove the handleReply entry after processing
  const index = global.client.handleReply.findIndex(e => e.messageID === handleReply.messageID);
  if (index !== -1) global.client.handleReply.splice(index, 1);
};
