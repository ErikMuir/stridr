const fs = require("fs");
const path = require("path");
const Dropbox = require("dropbox").Dropbox;
const fetch = require("isomorphic-fetch");
const utils = require('./utils');

const { accessToken } = process.env;
const _dropbox = new Dropbox({ fetch, accessToken });

const _args = process.argv.slice(2);
const _dryRun = _args.includes("--dry-run") || _args.includes("--dry") || _args.includes("-d");
const _cleanRun = _args.includes("--clean-run") || _args.includes("--clean") || _args.includes("-c");
const _destinationRoot = "dropbox-migration";
const _skipFolders = [];

async function getFolderContents(folderPath = "") {
  try {
    const contents = { files: [], folders: [] };
    let response = await _dropbox.filesListFolder({ path: folderPath });
    utils.appendFolderContents(response, contents);
    while (response.has_more) {
      response = await _dropbox.filesListFolderContinue({ cursor: response.cursor });
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
    } else if (_dryRun) {
      console.log(` - would download file: ${filePath}`);
    } else {
      console.log(` - downloading file: ${filePath}`);
      const response = await _dropbox.filesDownload({ path: filePath });
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
  if (_skipFolders.includes(folderPath.toLowerCase())) return;
  const contents = await getFolderContents(folderPath);
  const fullFolderPath = `./${_destinationRoot}${folderPath}`;
  const alreadyExists = fs.existsSync(fullFolderPath);
  if (!alreadyExists) {
    fs.mkdirSync(fullFolderPath, { recursive: true });
    await utils.asyncForEach(contents.files, async file => await downloadFile(file));
  }
  await utils.asyncForEach(contents.folders, async folder => await processFolder(folder)); // recursion!
}

async function run() {
  if (_cleanRun) {
    fs.rmdirSync(_destinationRoot, { recursive: true });
  }
  await processFolder();
  console.log("DONE!");
}

run();
