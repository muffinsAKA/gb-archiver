// downloader.js

import { createWriteStream } from 'fs'
import * as settings from './config.js'
import fs from 'fs'
import path from 'path'

let apiShowRetries = 3

export const getApi = async (apiDate) => {
  const apiUrl =
    `https://www.giantbomb.com/api/videos/?api_key=${settings.cfg.apiKey}&format=json` +
    `&field_list=publish_date,video_show,name,hd_url,high_url,low_url,` +
    `guid,deck,hosts,premium,site_detail_url` +
    `&filter=publish_date:${apiDate};00:00:00|${apiDate};23:59:59`

  const res = await fetch(apiUrl)
  const data = await res.json()
  return data
}

export const testApiKey = async (key) => {
  const url = `https://www.giantbomb.com/api/videos/?api_key=${key}&format=json&limit=1`

  try {
    const response = await fetch(url)
    const data = await response.json()
    return data
  } catch (e) {
    console.error(e)
  }
}
export const getShowList = async () => {
  const url = `https://www.giantbomb.com/api/video_shows/?api_key=${settings.cfg.apiKey}&format=json`
  const delay = 5000
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url)
      const data = await response.json()
      return data.results
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err)
      if (attempt < 3) await new Promise((r) => setTimeout(r, delay))
    }
  }

  console.warn('All attempts failed.')
  return []
}

export const downloadVideo = async (video, multiBar) => {
  if (!video.downloadUrl || !video.filepath) {
    throw new Error(`Missing download URL or filepath for ${video.name}`)
  }
  console.log('Saving video to:', video.filepath)
  const dir = path.dirname(video.filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const response = await fetch(video.downloadUrl)
  if (!response.ok) {
    throw new Error(`Failed to download ${video.name}: ${response.statusText}`)
  }

  const totalBytes = Number(response.headers.get('content-length')) || 0

  const progressBar = multiBar.create(totalBytes, 0, {
    filename: video.filename
  })

  const writeStream = createWriteStream(video.filepath)
  let downloaded = 0

  for await (const chunk of response.body) {
    writeStream.write(chunk)
    downloaded += chunk.length
    progressBar.update(downloaded)
  }

  await new Promise((resolve, reject) => {
    writeStream.end(() => {
      progressBar.stop()
      video.downloaded = true
      resolve()
    })
    writeStream.on('error', reject)
  })
}
