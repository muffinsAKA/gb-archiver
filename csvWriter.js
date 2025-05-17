// csvwriter

import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as settings from './config.js'

if (!fs.existsSync(settings.cfg.downloadDirectory)) fs.mkdirSync(settings.cfg.downloadDirectory);

export async function writeCsv(videoItems, dateStr) {
  const rows = videoItems.map(v => v.toCsvRow());
  
  const csvPath = path.join(settings.cfg.downloadDirectory, 'upload.csv');

  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: Object.keys(rows[0]).map(key => ({ id: key, title: key })),
  });

  await csvWriter.writeRecords(rows);
  return csvPath;
}
