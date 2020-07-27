const fs = require("fs");
const Dropbox = require("dropbox").Dropbox;
const fetch = require("isomorphic-fetch");

const accessToken = "1Z7GgIhHDAgAAAAAAAAtrGz-KGtTF4ogAD-pdCYKSbokkiUIHSni3jYoGZXfpJdW";
const dropbox = new Dropbox({ fetch, accessToken });
const args = process.argv.slice(2);
const _destinationRoot = args[0] || "dropbox-migration";
const dryRun = args.includes('--dry-run');

async function getFolderContents(path = "") {
  const contents = { files: [], folders: [] };

  let response = await dropbox.filesListFolder({ path });
  populateFolderContents(response, contents);

  while (response.has_more) {
    response = await dropbox.filesListFolderContinue({ cursor: response.cursor });
    populateFolderContents(response, contents);
  }
  return contents;
}

function populateFolderContents(response, contents) {
  contents.files = [...contents.files, ...filterFiles(response)];
  contents.folders = [...contents.folders, ...filterFolders(response)];
}

function filterFolders(response) {
  return response.entries
    .filter((x) => x[".tag"] === "folder")
    .map((x) => x.path_display);
}

function filterFiles(response) {
  return response.entries
    .filter((x) => x[".tag"] === "file" && x.is_downloadable)
    .map((x) => x.path_display);
}

async function downloadFile(path) {
  console.log(` - downloading file: ${path}`);
  if (dryRun) {
    fs.writeFileSync(path.substring(1), "");
  } else {
    const response = await dropbox.filesDownload({ path });
    if (response.fileBinary) {
      fs.writeFileSync(path.substring(1), response.fileBinary, { encoding: 'binary' });
    }
  }
}

async function processFolder(path = '') {
  console.log(`Processing folder: ${path || "/"}`);
  fs.mkdirSync(`./${_destinationRoot}${path}`, { recursive: true });
  const contents = await getFolderContents(path);
  await contents.files.forEach(async (file) => await downloadFile(file));
  await contents.folders.forEach(async (folder) => await processFolder(folder));
}

async function run() {
  fs.rmdirSync(_destinationRoot, { recursive: true });
  await processFolder();
  console.log("DONE!");
}

run();
