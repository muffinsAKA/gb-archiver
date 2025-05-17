import * as settings from './config.js'

const testToken = "REMOVED";
const testChannel = "1079974532166733865";

const getHeaders = () => ({
  "Authorization": `Bot ${testToken}`,
  "Content-Type": "application/json"
});

export const disc = async (message) => {
  try {
    const res = await fetch(`https://discord.com/api/v9/channels/${testChannel}/messages`, {
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
    const res = await fetch(`https://discord.com/api/v9/channels/${testChannel}/messages/${messageId}`, {
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
