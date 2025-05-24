import fs from 'fs'
import path from 'path'

export const trimInput = (input) => {
  return input.trim().replace(/\s/g, '')
}

export const convertDate = (input) => {
  const [month, day, year] = input.split('-')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export const getApiDate = () => {
  const date = new Date()
  date.setDate(date.getDate() - 2)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const emptyFolder = async (folder) => {
  fs.readdirSync(folder).forEach((file) => {
    const filePath = path.join(folder, file)
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }
  })
}

export const getNextRunTimeInMs = (runTime) => {
  const [hour, minute] = runTime.split(':').map(Number)

  const nextRunTime = new Date()
  nextRunTime.setHours(hour, minute, 0, 0)

  if (nextRunTime < new Date()) {
    nextRunTime.setDate(nextRunTime.getDate() + 1)
  }

  return nextRunTime.getTime() - Date.now()
}
export function promptWithTimeout(
  promptConfig,
  timeout = 10000,
  defaultValue = false
) {
  return Promise.race([
    inquirer.prompt([promptConfig]),
    new Promise((resolve) =>
      setTimeout(() => resolve({ [promptConfig.name]: defaultValue }), timeout)
    )
  ])
}
