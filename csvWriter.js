// csvwriter

import fs from 'fs'
import path from 'path'
import { createObjectCsvWriter } from 'csv-writer'
import * as settings from './config.js'

export async function writeCsv(videoItems) {
  const rows = videoItems.map((v) => v.toCsvRow())

  const csvPath = path.join(
    process.cwd(),
    settings.cfg.downloadDirectory,
    'upload.csv'
  )
  console.log('Writing CSV to:', csvPath)
  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: Object.keys(rows[0]).map((key) => ({ id: key, title: key }))
  })

  await csvWriter.writeRecords(rows)
  return csvPath
}
