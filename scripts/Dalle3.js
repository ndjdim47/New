const axios = require("axios");

module.exports.config = {
  name: "dalle3",
  version: "1.0",
  role: 0,
  author: "YourName",
  description: "DALL-E 3 Image Generator",
  category: "𝗜𝗠𝗔𝗚𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥",
  premium: true,
  guide: "{pn} [prompt] --ratio 1:1\n{pn} [prompt]",
  countDown: 15,
};

module.exports.onStart = async ({ event, args, api }) => {
  const dalleApi = "https://renzweb.onrender.com/api/dalle3";
  const apiKey = "c464f0a755e3f21fc9dad5a3ae1bfd2b";

  try {
    // Join arguments to form the prompt and handle ratio
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

    // Construct API URL with prompt, ratio, and API key
    const apiUrl = `${dalleApi}?prompt=${encodeURIComponent(promptText)}&ratio=${encodeURIComponent(ratio)}&apiKey=${encodeURIComponent(apiKey)}`;
    console.log("Request URL:", apiUrl);

    // Make the API request (initially as JSON to inspect response)
    const response = await axios.get(apiUrl, {
      responseType: "json",
    });

    console.log("API Response:", response.data);

    // Handle the response
    let imageStream;
    if (response.data && typeof response.data === "object" && response.data.imageUrl) {
      // If JSON with an image URL, fetch the image
      console.log("Fetching image from URL:", response.data.imageUrl);
      imageStream = (await axios.get(response.data.imageUrl, { responseType: "stream" })).data;
    } else if (response.headers["content-type"]?.includes("image")) {
      // If direct image response, fetch as stream
      imageStream = (await axios.get(apiUrl, { responseType: "stream" })).data;
    } else {
      throw new Error("Unexpected response format. Check console logs for details.");
    }

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

    api.setMessageReaction("✅", event.messageID, () => {}, true);
    api.unsendMessage(waitMessage.messageID);

    api.sendMessage(
      {
        body: `𝐻𝑒𝑟𝑒'𝑠 𝑦𝑜𝑢𝑟 𝑖𝑚𝑎𝑔𝑒 (𝑔𝑒𝑛𝑒𝑟𝑎𝑡𝑒𝑑 𝑖𝑛 ${timeTaken} 𝑠𝑒𝑐𝑜𝑛𝑑𝑠)`,
        attachment: imageStream,
      },
      event.threadID,
      event.messageID
    );
  } catch (e) {
    console.error("Error Details:", e.response ? { status: e.response.status, data: e.response.data } : e.message);
    api.sendMessage(`Error: ${e.message}`, event.threadID, event.messageID);
  }
};
