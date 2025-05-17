import * as settings from './config.js'

const getHeaders = () => ({
  "Authorization": `Bot ${settings.cfg.discord.token}`,
  "Content-Type": "application/json"
});

export const disc = async (message) => {
  if (!settings.cfg.adminMode) return

  try {
    const res = await fetch(`https://discord.com/api/v9/channels/${settings.cfg.discord.channel}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ content: message })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Discord POST failed:", res.status, text);
      return null;
    }

    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
};

export const editDisc = async (messageId, newMessage) => {
  try {
    const res = await fetch(`https://discord.com/api/v9/channels/${settings.cfg.discord.channel}/messages/${messageId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ content: newMessage })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Discord PATCH failed:", res.status, text);
    }
  } catch (err) {
    console.error("Edit fetch error:", err);
  }
};
