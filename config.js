import path from "path";

export const cfg = {
  workingDir: import.meta.dirname,
  lastApiCheck: null,
  downloadDirectory: null,
  apiKey: null,
  retries: [],
  adminMode: false,
  discord: {
    token: null,
    modChannel: null,
    channel: null,
    headersDisc: () => {
      return {
        "Authorization": `Bot ${cfg.discord.token}`,
        "User-Agent": "DiscordBot",
      };
    },
  },
};

export class VideoItem {
  constructor(data) {
    this.videoShow = data.video_show.title;
    this.publishDate = data.publish_date;
    this.guid = data.guid;
    this.site = data.site_detail_url;
    this.deck = data.deck;
    this.hosts = data.hosts;
    this.premium = data.premium;
    this.name = data.name;
    this.filename = data.filename;
    this.filepath = data.filepath;
    this.filesize = null;
    this.urls = {
      low_url: data.low_url,
      high_url: data.high_url,
      hd_url: data.hd_url,
    };
    this.identifier = this.createIdentifier();
    this.downloadUrl = this.getDownloadUrl();
    this.downloaded = false;
  }
  async prepare() {
    await this.getFilesize();
    this.constructFilename();
  }
  getDownloadUrl() {
    const preferredUrls = ["hd_url", "high_url", "low_url"];
    for (const key of preferredUrls) {
      const url = this.urls[key];
      if (url) {
        const fullUrl = url.includes("?exp=")
          ? url
          : `${url}?api_key=${cfg.apiKey}`;
        return fullUrl;
      }
    }
    return null;
  }

  constructFilename() {
    const date = this.publishDate?.slice(0, 10) || "unknown-date";
    const show = this.videoShow || "unknown-show";
    const name = this.name || "unknown-name";
    const suffix = this.premium ? "_Premium.mp4" : ".mp4";

    let base = `${date}-${show}-${name}`;
    base = base.replace(/:/g, "").replace(/\s+/g, "_").replace(/\//g, "-");

    this.filename = base + suffix;
    this.filepath = path.join(
      cfg.downloadDirectory,
      this.videoShow || "",
      this.filename
    );
  }

  async getFilesize() {
    const res = await fetch(this.downloadUrl, { method: "HEAD" });
    const contentLength = res.headers.get("content-length");
    this.filesize = contentLength ? parseInt(contentLength, 10) : null;
  }

  createIdentifier() {
    return `gb-${this.guid}-ID${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  }

  toCsvRow() {
    return {
      identifier: this.createIdentifier(),
      file: path.join(cfg.downloadDirectory, this.filepath),
      title: this.name,
      description: this.deck,
      "subject[0]": "Giant Bomb",
      "subject[1]": this.videoShow,
      hosts: this.hosts,
      creator: "Giant Bomb",
      date: this.publishDate,
      collection: "giant-bomb-archive",
      mediatype: "movies",
      "external-identifier": `gb-guid:${this.guid}`,
    };
  }
}

export function saveConfig() {
  try {
    const savePath = path.join(cfg.workingDir, "config.json");
    const saveData = JSON.stringify(cfg);
    fs.writeFileSync(savePath, saveData);
  } catch (err) {
    console.error("Failed to save config:", err);
  }
}
export function loadConfig() {
  try {
    const loadingPath = path.join(cfg.workingDir, "config.json");
    const loadJson = fs.readFileSync(loadingPath);
    const config = JSON.parse(loadJson);
    Object.assign(cfg, config);
  } catch (e) {
    console.error(`Error loading config:`, e);
  }
}
