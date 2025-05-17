import * as settings from './config.js'

const getHeaders = () => ({
  "Authorization": `Bot ${settings.cfg.discord.token}`,
  "Content-Type": "application/json"
});

const disc = async (message) => {
  try {
    const res = await fetch(`https://discord.com/api/v9/channels/${settings.cfg.discord.channel}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content: message })
    });

  } catch (err) {
    console.error("Fetch error:", err);
  }
};

disc("test");
