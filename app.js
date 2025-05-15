import dotenv from "dotenv";
dotenv.config();
import ora from "ora";
import cliProgress from "cli-progress";
import * as downloader from "./downloader.js";
import * as settings from "./config.js";
import { VideoItem } from "./config.js";
import { writeCsv } from "./csvWriter.js";

const spinner = ora("Getting latest API data").start();

const multiBar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: `{filename} [{bar}] {percentage}% | {value}/{total} bytes`,
  },
  cliProgress.Presets.shades_classic
);

const getDate = () => {
  const date = new Date();
  //   const formattedDate = date.toISOString().slice(0, 10);
  const formattedDate = "2025-05-12";
  return formattedDate;
};

const startSession = async () => {
  const date = getDate();
  spinner.info(`Getting API for ${date}`);
  let apiData;

  try {
    apiData = await downloader.getApi(date);
    spinner.succeed();
  } catch (error) {
    console.log(error);
    settings.cfg.retries.push({ date: date, retries: 3 });
  }

  if (apiData?.results?.length) {
    try {
      spinner.info(`${apiData.results.length} shows found`);
      spinner.start("Sorting videos");
      const newVideos = await sortNewVideos(apiData.results);
      spinner.succeed();
      spinner.start("Creating CSV");
      await writeCsv(newVideos, date);
      spinner.succeed();
      spinner.info("Downloading videos...");
      spinner.stop();
      const results = await Promise.allSettled(
        newVideos.map((video) => downloader.downloadVideo(video, multiBar))
      );

      multiBar.stop(); 

      results.forEach((result, idx) => {
        const video = newVideos[idx];
        if (result.status === "fulfilled") {
          console.log(`✅ Downloaded: ${video.filename}`);
        } else {
          console.error(`❌ Failed: ${video.filename}`, result.reason);
        }
      });

      spinner.succeed("All downloads finished");
    } catch (error) {
      console.error(error);
      spinner.fail("Unexpected error during session");
    }
  } else {
    spinner.info("No shows found for given date");
  }
};

async function sortNewVideos(results) {
  const newVideos = [];
  for (const result of results) {
    const video = new VideoItem(result);
    await video.prepare();
    newVideos.push(video);
  }

  return newVideos;
}

startSession();
