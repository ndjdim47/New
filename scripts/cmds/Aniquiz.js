const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const cacheDir = path.join(__dirname, 'cache');
const userDataFile = path.join(__dirname, 'anime.json');

module.exports = {
  config: {
    name: "aniquiz",
    aliases: ["animequiz"],
    version: "1.0",
    author: "Kshitiz",
    role: 0,
    shortDescription: "Guess the anime character",
    longDescription: "Guess the name of the anime character based on provided traits and tags.",
    category: "game",
    guide: {
      en: "{p}aniquiz"
    }
  },

  onStart: async function ({ event, message, usersData, api, args }) {
    try {
      if (!event || !message) return;
      if (args.length === 1 && args[0] === "top") {
        return await this.showTopPlayers({ message, usersData, api });
      }

      const characterData = await this.fetchCharacterData();
      if (!characterData || !characterData.data) {
        console.error("Error fetching character data");
        message.reply("Error fetching character data.");
        return;
      }

      const { image, traits, tags, fullName, firstName } = characterData.data;

      const imageStream = await this.downloadImage(image);

      if (!imageStream) {
        console.error("Error downloading image");
        message.reply("An error occurred.");
        return;
      }

      const audiobody = `
      𝐆𝐮𝐞𝐬𝐬 𝐭𝐡𝐞 𝐚𝐧𝐢𝐦𝐞 𝐜𝐡𝐚𝐫𝐚𝐜𝐭𝐞𝐫!!
      𝐓𝐫𝐚𝐢𝐭𝐬: ${traits}
      𝐓𝐚𝐠𝐬: ${tags}
      `;

      const replyMessage = { body: audiobody, attachment: imageStream };
      const sentMessage = await message.reply(replyMessage);

      global.GoatBot.onReply.set(sentMessage.messageID, {
        commandName: this.config.name,
        messageID: sentMessage.messageID,
        correctAnswer: [fullName, firstName],
        senderID: event.senderID,
        sentMessageId: sentMessage.messageID 
      });

      setTimeout(async () => {
        await api.unsendMessage(sentMessage.messageID);
      }, 15000);
    } catch (error) {
      console.error("Error in onStart:", error);
      message.reply("An error occurred.");
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    try {
      if (!event || !message || !Reply) return; 
      const userAnswer = event.body.trim().toLowerCase();
      const correctAnswers = Reply.correctAnswer.map(name => name.toLowerCase());

      if (event.senderID !== Reply.senderID) return;

      if (correctAnswers.includes(userAnswer)) {
        await this.addCoins(event.senderID, 1000);
        await message.reply("🎉🎊 Congratulations! Your answer is correct.\nYou have received 1000 coins.");

        try {
          await api.unsendMessage(Reply.sentMessageId); 
        } catch (error) {
          console.error("Error unsending original message:", error);
        }
      } else {
        await message.reply(`🥺 Oops! Wrong answer.\nThe correct answer was:\n${Reply.correctAnswer.join(" or ")}`);
      }

      await api.unsendMessage(event.messageID); 
    } catch (error) {
      console.error("Error in onReply:", error);
    }
  },

  showTopPlayers: async function ({ message, usersData, api }) {
    try {
      const topUsers = await this.getTopUsers(usersData, api);
      if (topUsers.length === 0) {
        return message.reply("No users found.");
      } else {
        const topUsersString = topUsers.map((user, index) => `${index + 1}. ${user.username}: ${user.money} coins`).join("\n");
        return message.reply(`Top 5 pro players:\n${topUsersString}`);
      }
    } catch (error) {
      console.error("Error in showTopPlayers:", error);
      message.reply("An error occurred.");
    }
  },

  fetchCharacterData: async function () {
    try {
      const response = await axios.get('https://animequiz-mu.vercel.app/kshitiz');
      return response;
    } catch (error) {
      console.error("Error fetching character data:", error);
      return null;
    }
  },

  downloadImage: async function (imageUrl) {
    try {
      const imagePath = path.join(cacheDir, 'anime_character.jpg');

      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      if (!response.data || response.data.length === 0) {
        console.error("Empty image data received from the API.");
        return null;
      }

      await fs.ensureDir(cacheDir); 
      await fs.writeFile(imagePath, response.data, 'binary');

      return fs.createReadStream(imagePath);
    } catch (error) {
      console.error("Error downloading image:", error);
      return null;
    }
  },

  addCoins: async function (userId, amount) {
    try {
      const data = await this.readUserData();
      const userData = data[userId] || { money: 0 }; 
      userData.money += amount;

      data[userId] = userData; 

      await fs.writeFile(userDataFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  },

  readUserData: async function () {
    try {
      const data = await fs.readFile(userDataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.writeFile(userDataFile, '{}');
        return {};
      } else {
        console.error("Error reading user data:", error);
        return {};
      }
    }
  },

  getTopUsers: async function (usersData, api) {
    try {
      const userData = await this.readUserData();
      const userIds = Object.keys(userData);
      const topUsers = [];

      const getUserInfo = util.promisify(api.getUserInfo);

      await Promise.all(userIds.map(async (userId) => {
        try {
          const userInfo = await getUserInfo(userId);
          const username = userInfo[userId].name;
          if (username) {
            const userMoney = userData[userId].money;
            topUsers.push({ username: username, money: userMoney });
          }
        } catch (error) {
          console.error("Failed to retrieve user information:", error);
        }
      }));

      topUsers.sort((a, b) => b.money - a.money);
      return topUsers.slice(0, 5); 
    } catch (error) {
      console.error("Error getting top users:", error);
      return [];
    }
  }
};
