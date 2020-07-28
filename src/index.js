const fs = require("fs");
const path = require("path");
const Dropbox = require("dropbox").Dropbox;
const fetch = require("isomorphic-fetch");

const accessToken = "1Z7GgIhHDAgAAAAAAAAtrGz-KGtTF4ogAD-pdCYKSbokkiUIHSni3jYoGZXfpJdW";
const dropbox = new Dropbox({ fetch, accessToken });
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const _destinationRoot = "dropbox-migration";

async function asyncForEach(array, callback) {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array);
  }
}

async function getFolderContents(folderPath = "") {
  try {
    const contents = { files: [], folders: [] };
    let response = await dropbox.filesListFolder({ path: folderPath });
    appendFolderContents(response, contents);
    while (response.has_more) {
      response = await dropbox.filesListFolderContinue({ cursor: response.cursor });
      appendFolderContents(response, contents);
    }
    return contents;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

function appendFolderContents(response, contents) {
  contents.files.push(...filterFiles(response));
  contents.folders.push(...filterFolders(response));
}

function filterFolders(response) {
  return response.entries
    .filter(x => x[".tag"] === "folder")
    .map(x => x.path_display);
}

function filterFiles(response) {
  return response.entries
    .filter(x => x[".tag"] === "file" && x.is_downloadable)
    .map(x => x.path_display);
}

async function downloadFile(filePath) {
  try {
    const fullFilePath = path.join(__dirname, _destinationRoot, filePath);
    if (fs.existsSync(fullFilePath)) {
      console.log(` - skipping file: ${filePath}`);
    } else {
      console.log(` - downloading file: ${filePath}`);
      if (dryRun) {
        fs.writeFileSync(fullFilePath, "");
      } else {
        const response = await dropbox.filesDownload({ path: filePath });
        if (response.fileBinary) {
          fs.writeFileSync(fullFilePath, response.fileBinary, { encoding: "binary" });
        }
      }
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function processFolder(path = "") {
  console.log(`Processing folder: ${path || "/"}`);
  fs.mkdirSync(`./${_destinationRoot}${path}`, { recursive: true });
  const contents = await getFolderContents(path);
  await asyncForEach(contents.files, async file => await downloadFile(file));
  await asyncForEach(contents.folders, async folder => await processFolder(folder)); // recursion!
}

async function run() {
  // fs.rmdirSync(_destinationRoot, { recursive: true });
  await processFolder();
  console.log("DONE!");
}

run();
