const fs = require("fs");
const path = require("path");
const Dropbox = require("dropbox").Dropbox;
const fetch = require("isomorphic-fetch");
const utils = require('./utils');

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("--dry") || args.includes("-d");
const cleanRun = args.includes("--clean-run") || args.includes("--clean") || args.includes("-c");
const _destinationRoot = "dropbox-migration";
const { accessToken } = process.env;
const dropbox = new Dropbox({ fetch, accessToken });

async function getFolderContents(folderPath = "") {
  try {
    const contents = { files: [], folders: [] };
    let response = await dropbox.filesListFolder({ path: folderPath });
    utils.appendFolderContents(response, contents);
    while (response.has_more) {
      response = await dropbox.filesListFolderContinue({ cursor: response.cursor });
      utils.appendFolderContents(response, contents);
    }
    return contents;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function downloadFile(filePath) {
  try {
    const fullFilePath = path.join(__dirname, _destinationRoot, filePath);
    if (fs.existsSync(fullFilePath)) {
      console.log(` - skipping file: ${filePath}`);
    } else if (dryRun) {
      console.log(` - would download file: ${filePath}`);
      // fs.writeFileSync(fullFilePath, "");
    } else {
      console.log(` - downloading file: ${filePath}`);
      const response = await dropbox.filesDownload({ path: filePath });
      if (response.fileBinary) {
        fs.writeFileSync(fullFilePath, response.fileBinary, { encoding: "binary" });
      } else {
        console.error(`File ${filePath} does not have binary data!`);
      }
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function processFolder(folderPath = "") {
  console.log(`Processing folder: ${folderPath || "/"}`);
  fs.mkdirSync(`./${_destinationRoot}${folderPath}`, { recursive: true });
  const contents = await getFolderContents(folderPath);
  await utils.asyncForEach(contents.files, async file => await downloadFile(file));
  await utils.asyncForEach(contents.folders, async folder => await processFolder(folder)); // recursion!
}

async function run() {
  if (cleanRun) {
    fs.rmdirSync(_destinationRoot, { recursive: true });
  }
  await processFolder();
  console.log("DONE!");
}

run();
