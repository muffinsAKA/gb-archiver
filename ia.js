import { spawn } from "child_process";

let currentFilename = "";
let currentFileProgress = 0;

export const upload = async (csvPath) => {
  const proc = spawn("ia", [
    "upload",
    "test-upload-001",
    `--spreadsheet=${csvPath}`,
  ]);

  proc.stdout.on("data", (data) => {
  const raw = data.toString();
  console.log("[STDOUT CHUNK]", JSON.stringify(raw));
});

  proc.stderr.on("data", (data) => {
    console.error(data.toString());
  });
  proc.on("close", (code) => {
    if (code === 0) console.log("Upload complete.");
    else console.error(`Upload failed with code ${code}`);
  });
};

upload("./test.csv");
