import { spawn } from "child_process";

export const upload = async (csvPath) => {
  const proc = spawn("ia", ["upload", `--spreadsheet=${csvPath}`]);

  proc.stdout.on("data", (data) => {
    console.log(data.toString());
  });
  proc.stderr.on("data", (data) => {
    console.error(data.toString());
  });
  proc.on("close", (code) => {
    if (code === 0) console.log("Upload complete.");
    else console.error(`Upload failed with code ${code}`);
  });
};
