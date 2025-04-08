const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  config: {
    name: "x",
    version: "1.0",
    author: "ayanokoji",
    category: "AI",
    role: 0,
    description: "Generate anime images via Waifu Diffusion API",
    usage: "[character description]"
  },

  onStart: async ({ args, message }) => {
    const prompt = args.join(" ") || "Gojo Satoru, blue eyes, white hair, blindfold, jujutsu kaisen style";
    
    try {
      const loadingMsg = await message.reply("🌀 Creating your anime image...");

      const apiUrl = `https://api.waifu.im/search?included_tags=waifu&many=true&text=${encodeURIComponent(prompt)}`;
      const response = await axios.get(apiUrl);

      const imageUrl = response.data.images[0].url;
      const imagePath = path.join(__dirname, 'cache', `anime_${Date.now()}.jpg`);
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

      fs.writeFileSync(imagePath, imageResponse.data);
      
      await message.reply({
        body: `🎌 Generated:\n"${prompt}"`,
        attachment: fs.createReadStream(imagePath)
      });

      fs.unlinkSync(imagePath);
      await message.unsend(loadingMsg.messageID);

    } catch (error) {
      console.error(error);
      message.reply("❌ Failed to generate. Try again later.");
    }
  }
}; 
