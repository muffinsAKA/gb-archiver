import dotenv from "dotenv";
dotenv.config();
import ora from "ora";
import cliProgress from "cli-progress";
import * as downloader from "./downloader.js";
import * as settings from "./config.js";
import { VideoItem } from "./config.js";
import { writeCsv } from "./csvWriter.js";
import inquirer from "inquirer";

const spinner = ora("Getting latest API data").start();
spinner.stop();
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

const init = async () => {
  const keyPrompt = await inquirer.prompt([
    {
      type: "input",
      name: "apiKey",
      message: "Input your Giant Bomb API key (https://giantbomb.com/api/)",
      default: null,
    },
  ]);
  settings.cfg.apiKey = keyPrompt.apiKey.trim().replace(/\s/g, "");
  // spinner.start("Downloading show list...");
  // const shows = await downloader.getShowList();
  // const showChoices = shows.map((show) => ({
  //   name: `${show.title})`,
  //   value: show.id,
  // }));
  // spinner.succeed();
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "downloadDirectory",
      message: "Where should videos be saved?",
      default: "./downloads",
    },
  ]);

  settings.cfg.downloadDirectory = answers.downloadDirectory.trim().replace(/\s/g, "");
};

init();
