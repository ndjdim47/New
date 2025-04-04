const axios = require("axios");

module.exports.config = {
  name: "flux",
  version: "2.0",
  role: 0,
  author: "saidul",
  description: "Flux Image Generator",
  category: "𝗜𝗠𝗔𝗚𝗘 𝗚𝗘𝗡𝗘𝗥𝗔𝗧𝗢𝗥",
  premium: true,
  guide: "{pn} [prompt] --ratio 1024x1024\n{pn} [prompt]",
  countDown: 15,
};

module.exports.onStart = async ({ event, args, api }) => {
  const dipto = "https://www.noobs-api.rf.gd/dipto";

  try {
    const prompt = args.join(" ");
    const [prompt2, ratio = "1:1"] = prompt.includes("--ratio")
      ? prompt.split("--ratio").map(s => s.trim())
      : [prompt, "1:1"];

    const startTime = Date.now();
    
    const waitMessage = await api.sendMessage("𝐺𝑒𝑛𝑒𝑟𝑎𝑡𝑖𝑛𝑔, 𝑝𝑙𝑒𝑎𝑠𝑒 𝑤𝑎𝑖𝑡...🪄", event.threadID);
    api.setMessageReaction("⌛", event.messageID, () => {}, true);

    const apiurl = `${dipto}/flux?prompt=${encodeURIComponent(prompt2)}&ratio=${encodeURIComponent(ratio)}`;
    const response = await axios.get(apiurl, { responseType: "stream" });

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

    api.setMessageReaction("✅", event.messageID, () => {}, true);
    api.unsendMessage(waitMessage.messageID);

    api.sendMessage({
      body: `𝐻𝑒𝑟𝑒'𝑠 𝑦𝑜𝑢𝑟 𝑖𝑚𝑎𝑔𝑒 (𝑔𝑒𝑛𝑒𝑟𝑎𝑡𝑒𝑑 𝑖𝑛 ${timeTaken} 𝑠𝑒𝑐𝑜𝑛𝑑𝑠)`,
      attachment: response.data,
    }, event.threadID, event.messageID);
    
  } catch (e) {
    console.error(e);
    api.sendMessage("Error: " + e.message, event.threadID, event.messageID);
  }
};
