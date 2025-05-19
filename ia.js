import { spawn } from 'child_process'
import { disc, editDisc } from './discord.js'

let uploadStartMsgId = null
let uploadProgressMsgId = null
let currentFilename = ''
let currentFileProgress = 0

const UPDATE_THRESHOLD = 4
let lastReportedPercent = 0

export const upload = async (csvPath) => {
  await disc('Uploading to Archive.org')
  const proc = spawn('ia', ['upload', `--spreadsheet=${csvPath}`])

  proc.stderr.on('data', (data) => {
    process.stderr.write(data)

    const lines = data.toString().split(/\r/)
    for (const line of lines) {
      if (line.trim().startsWith('uploading ')) {
        const fileMatch = line.match(/^\s*uploading (.*?):/)
        const percentMatch = line.match(/:\s+(\d+)%\|/)

        if (fileMatch && fileMatch[1] !== currentFilename) {
          currentFilename = fileMatch[1]
          currentFileProgress = -1
          lastReportedPercent = 0

          disc(`📤 Uploading: **${currentFilename}**`).then((id) => {
            uploadStartMsgId = id
          })

          disc(`🔄 **${currentFilename}** — 0%`).then((id) => {
            uploadProgressMsgId = id
          })
        }

        if (percentMatch) {
          const percent = parseInt(percentMatch[1], 10)
          if (
            percent >= lastReportedPercent + UPDATE_THRESHOLD &&
            uploadProgressMsgId
          ) {
            lastReportedPercent = percent
            editDisc(
              uploadProgressMsgId,
              `🔄 **${currentFilename}** — ${percent}%`
            )
          }
        }
      }
    }
  })

  proc.on('close', (code) => {
    if (code === 0) {
      disc('✅ All uploads complete.')
    } else {
      disc(`❌ Upload failed with code ${code}`)
    }
  })
}
