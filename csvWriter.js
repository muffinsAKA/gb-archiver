// csvwriter

import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { cfg } from './config.js';

const dailyDir = path.join(process.cwd(), 'daily-files');
if (!fs.existsSync(dailyDir)) fs.mkdirSync(dailyDir);

export async function writeCsv(videoItems, dateStr) {
  const rows = videoItems.map(v => v.toCsvRow());

  const csvPath = path.join(dailyDir, 'upload.csv');

  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: Object.keys(rows[0]).map(key => ({ id: key, title: key })),
  });

  await csvWriter.writeRecords(rows);
  return csvPath;
}
