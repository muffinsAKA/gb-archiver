import ora from 'ora'
import fs from 'fs'
import path from 'path'
import cliProgress from 'cli-progress'
import * as downloader from './downloader.js'
import * as settings from './config.js'
import { VideoItem } from './config.js'
import { writeCsv } from './csvWriter.js'
import { disc } from './discord.js'
import * as util from './util.js'
import { upload } from './ia.js'
import inquirer from 'inquirer'

const spinner = ora('Getting latest API data').start()
spinner.stop()
const multiBar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: `{filename} [{bar}] {percentage}% | {value}/{total} bytes`
  },
  cliProgress.Presets.shades_classic
)

const startSession = async (specifiedDate) => {
  if (!fs.existsSync(settings.cfg.downloadDirectory))
    fs.mkdirSync(settings.cfg.downloadDirectory)

  const date = specifiedDate
    ? util.convertDate(specifiedDate)
    : util.getApiDate()

  spinner.info(`Getting API for ${date}`)
  await disc(`📡 Getting API for ${date}`, 'fix')

  let apiData

  try {
    apiData = await downloader.getApi(date)
    spinner.succeed()
    await disc('✅ API download successful', 'diff')
  } catch (error) {
    spinner.fail('API download failed')
    await disc('❌ API download failed, will retry later.', 'diff')
    console.log(error)
    settings.cfg.retries.push({ date: date, retries: 3 })
  }

  if (apiData?.results?.length) {
    try {
      const count = apiData.results.length
      spinner.info(`${count} shows found`)
      await disc(`🎬 ${count} shows found`, 'yaml')
      console.log(apiData.results)
      spinner.start('Sorting videos')
      const newVideos = await sortNewVideos(apiData.results)
      console.log(newVideos)
      await disc(newVideos.map((v) => `• ${v.filename}`).join('\n'), 'yaml')

      let csvPath
      spinner.succeed()

      if (settings.cfg.adminMode) {
        spinner.start('Creating CSV')
        try {
          csvPath = await writeCsv(newVideos)
        } catch (error) {
          console.error(error)
        }
        spinner.succeed()
      }

      spinner.info('Downloading videos...')
      await disc(`📥 Downloading ${count} videos`, 'fix')
      spinner.stop()

      const results = await Promise.allSettled(
        newVideos.map((video) => downloader.downloadVideo(video, multiBar))
      )

      multiBar.stop()

      for (const [idx, result] of results.entries()) {
        const video = newVideos[idx]
        if (result.status === 'fulfilled') {
          console.log(`✅ Downloaded: ${video.filename}`)
          await disc(`+ ✅ Downloaded: ${video.filename}`, 'diff')
        } else {
          console.error(`❌ Failed: ${video.filename}`, result.reason)
          await disc(`- ❌ Failed: ${video.filename}`, 'diff')
        }
      }

      spinner.succeed('All downloads finished')
      await disc('✅ All downloads finished', 'diff')

      if (settings.cfg.adminMode) {
        console.log(csvPath)
        await upload(csvPath)
      }
    } catch (error) {
      console.error(error)
      spinner.fail('Unexpected error during session')
      await disc(`❌ Unexpected error during session:\n${error}`, 'diff')
    }
  } else {
    spinner.info('No shows found for given date')
    await disc('ℹ️ No shows found. Skipping.', 'fix')
  }

  spinner.info('Cleaning up download folder')
  await util.emptyFolder(settings.cfg.downloadDirectory)
  spinner.succeed('Folder cleaned')
  await disc('🧹 Cleaned download folder', 'bash')

  if (!specifiedDate) {
    const nextRun = util.getNextRunTimeInMs(settings.cfg.runTime)
    const now = new Date()
    const nextTime = new Date(now.getTime() + nextRun)

    spinner.info(`Next archive session: ${nextTime}`)
    await disc(`⏱️ Next archive session: ${nextTime}`, 'yaml')

    setTimeout(async () => {
      await startSession()
    }, nextRun)
  }
}

async function sortNewVideos(results) {
  const newVideos = []
  for (const result of results) {
    const video = new VideoItem(result)
    await video.prepare()
    newVideos.push(video)
  }

  return newVideos
}

const init = async () => {
  const mode = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'archive',
      message: 'Archive.org Mode? (Admins only)',
      default: 'false'
    }
  ])

  if (mode.archive) {
    const discordInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'token',
        message: 'Discord token:',
        validate: (input) => {
          if (util.trimInput(input) != '') {
            return true
          } else {
            return 'Discord token required'
          }
        }
      },
      {
        type: 'input',
        name: 'channelId',
        message: 'Discord channel id:',
        validate: (input) => {
          if (util.trimInput(input) != '') {
            return true
          } else {
            return 'Channel ID required'
          }
        }
      },
      {
        type: 'input',
        name: 'modChannelId',
        message: 'Mod Channel ID',
        validate: (input) => {
          if (util.trimInput(input) != '') {
            return true
          } else {
            return 'Mod Channel ID required'
          }
        }
      }
    ])
    settings.cfg.adminMode = true
    settings.cfg.discord.token = discordInfo.token
    settings.cfg.discord.channel = discordInfo.channelId
    settings.cfg.discord.modChannel = discordInfo.modChannelId
  }

  const keyPrompt = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiKey',
      message: 'Input your Giant Bomb API key (https://giantbomb.com/api/)',
      default: null,
      validate: async (input) => {
        if (!input || typeof input !== 'string' || input.trim() === '') {
          return 'API key is invalid.'
        }
        const cleanInput = util.trimInput(input)
        const testResult = await downloader.testApiKey(cleanInput)
        if (testResult.status_code === 1) {
          return true
        } else {
          return 'API key test failed.'
        }
      }
    }
  ])

  settings.cfg.apiKey = util.trimInput(keyPrompt.apiKey)

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'downloadDirectory',
      message: 'Where should videos be saved?',
      default: './downloads'
    },
    {
      type: 'input',
      name: 'runTime',
      message:
        'What time should the archiver run each day? (24h format: HH:MM)',
      validate: (input) => {
        return /^([01]?\d|2[0-3]):[0-5]\d$/.test(input)
          ? true
          : 'Enter a valid time in HH:MM (24-hour) format.'
      },
      default: '03:00'
    }
  ])

  settings.cfg.downloadDirectory = util.trimInput(answers.downloadDirectory)

  settings.cfg.runTime = answers.runTime
  settings.saveConfig()
}

async function startup() {
  const configPath = path.join(settings.cfg.workingDir, 'config.json')

  if (fs.existsSync(configPath)) {
    settings.loadConfig()
    const runType = await util.promptWithTimeout(
      {
        type: 'confirm',
        name: 'auto',
        message: 'Auto-mode? (Timeout in 10s)',
        default: true
      },
      10000,
      false
    )

    if (runType.auto) {
      await startSession()
    } else {
      const specifiedDate = await inquirer.prompt([
        {
          type: 'input',
          name: 'date',
          message: 'Which date would you like to archive?',
          validate: function (input) {
            const dateRegex =
              /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(19|20)\d{2}$/
            return (
              dateRegex.test(input) ||
              'Please enter a date in MM-DD-YYYY format (e.g., 04-20-1969).'
            )
          }
        }
      ])

      startSession(specifiedDate)
    }
  } else {
    await init()
    const runType = await inquirer.prompt([
      {
        type: 'confirrm',
        name: 'auto',
        message: 'Auto-mode?',
        default: 'true'
      }
    ])

    if (runType.auto) {
      await startSession()
    } else {
      const specifiedDate = await inquirer.prompt([
        {
          type: 'input',
          name: 'date',
          message: 'Which date would you like to archive?',
          validate: function (input) {
            const dateRegex =
              /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(19|20)\d{2}$/
            return (
              dateRegex.test(input) ||
              'Please enter a date in MM-DD-YYYY format (e.g., 04-20-1969).'
            )
          }
        }
      ])

      startSession(specifiedDate)
    }
  }
}

startup()
