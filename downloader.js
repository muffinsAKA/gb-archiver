// downloader.js

import { createWriteStream } from "fs";
import * as settings from "./config.js";

export const getApi = async (apiDate) => {
  const apiUrl =
    `https://www.giantbomb.com/api/videos/?api_key=${settings.cfg.apiKey}&format=json` +
    `&field_list=publish_date,video_show,name,hd_url,high_url,low_url,` +
    `guid,deck,hosts,premium,site_detail_url` +
    `&filter=publish_date:${apiDate};00:00:00|${apiDate};23:59:59`;

  const res = await fetch(apiUrl);
  const data = await res.json();
  return data;
};

export const downloadVideo = async (video, multiBar) => {
  if (!video.downloadUrl || !video.filepath) {
    throw new Error(`Missing download URL or filepath for ${video.name}`);
  }

  const response = await fetch(video.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${video.name}: ${response.statusText}`);
  }

  const totalBytes = Number(response.headers.get("content-length")) || 0;

  const progressBar = multiBar.create(totalBytes, 0, {
    filename: video.filename,
  });

  const writeStream = createWriteStream(video.filepath);
  let downloaded = 0;

  for await (const chunk of response.body) {
    writeStream.write(chunk);
    downloaded += chunk.length;
    progressBar.update(downloaded);
  }

  writeStream.end();
  progressBar.stop();
  video.downloaded = true;
};
