import ora from "ora";
import fs from "fs";
import path from 'path'
import cliProgress from "cli-progress";
import * as downloader from "./downloader.js";
import * as settings from "./config.js";
import { VideoItem } from "./config.js";
import { writeCsv } from "./csvWriter.js";
import * as util from "./util.js";
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
  const mode = await inquirer.prompt([
    {
      type: "confirm",
      name: "archive",
      message: "GB Preservation Mode? (Admins only)",
      default: "false",
    },
  ]);

  if (mode.archive) {
    const discordInfo = await inquirer.prompt([
      {
        type: "input",
        name: "token",
        message: "Discord token:",
        validate: (input) => {
          if (util.trimInput(input) != "") {
            return true;
          } else {
            return "Input required";
          }
        },
      },
      {
        type: "input",
        name: "channelId",
        message: "Discord channel id:",
        validate: (input) => {
          if (util.trimInput(input) != "") {
            return true;
          } else {
            return "Input required";
          }
        },
      },
      {
        type: "input",
        name: "modChannelId",
        message: "Mod Channel ID",
        validate: (input) => {
          if (util.trimInput(input) != "") {
            return true;
          } else {
            return "Input required";
          }
        },
      },
    ]);
    settings.cfg.discord.enabled = true;
    settings.cfg.discord.token = discordInfo.token;
    settings.cfg.discord.channel = discordInfo.channelId;
    settings.cfg.discord.modChannel = discordInfo.modChannelId;
  }

  const keyPrompt = await inquirer.prompt([
    {
      type: "input",
      name: "apiKey",
      message: "Input your Giant Bomb API key (https://giantbomb.com/api/)",
      default: null,
      validate: async (input) => {
        if (!input || typeof input !== "string" || input.trim() === "") {
          return "API key is invalid.";
        }
        const cleanInput = util.trimInput(input);
        const testResult = await downloader.testApiKey(cleanInput);
        if (testResult.status_code === 1) {
          return true;
        } else {
          return "API key test failed.";
        }
      },
    },
  ]);

  settings.cfg.apiKey = util.trimInput(keyPrompt.apiKey);

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "downloadDirectory",
      message: "Where should videos be saved?",
      default: "./downloads",
    },
    {
      type: "input",
      name: "runTime",
      message:
        "What time should the archiver run each day? (24h format: HH:MM)",
      validate: (input) => {
        return /^([01]?\d|2[0-3]):[0-5]\d$/.test(input)
          ? true
          : "Enter a valid time in HH:MM (24-hour) format.";
      },
      default: "03:00",
    },
  ]);

  settings.cfg.downloadDirectory = util.trimInput(answers.downloadDirectory);

  settings.cfg.runTime = answers.runTime;
  settings.saveConfig();
};

async function startup() {
  const configPath = path.join(settings.cfg.workingDir, "config.json");

  if (fs.existsSync(configPath)) {
    settings.loadConfig();
    await startSession();
  } else {
    await init();
  }
}

startup()