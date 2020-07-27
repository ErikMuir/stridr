const fs = require("fs");
const Dropbox = require("dropbox").Dropbox;
const fetch = require("isomorphic-fetch");
const accessToken =
  "1Z7GgIhHDAgAAAAAAAAtrGz-KGtTF4ogAD-pdCYKSbokkiUIHSni3jYoGZXfpJdW";
const dropbox = new Dropbox({ fetch, accessToken });
const args = process.argv.slice(2);
const _destinationRoot = args[0] || "dropbox-migration";

async function listFolderContents(path = "") {
  return await dropbox.filesListFolder({ path });
}

function filterFolders(contents) {
  return contents.entries
    .filter((x) => x[".tag"] === "folder")
    .map((x) => x.path_display);
}

function filterFiles(contents) {
  return contents.entries
    .filter((x) => x[".tag"] === "file" && x.is_downloadable)
    .map((x) => x.path_display);
}

async function downloadFile(file) {
  console.log(` - downloading file: ${file}`);
  // curl -s -X POST https://content.dropboxapi.com/2/files/download \
  //   --header "Authorization: Bearer $access_token" \
  //   --header "Dropbox-API-Arg: {\"path\": \"$file\"}" \
  //   --output "${file:1}" # strip leading slash
}

async function processFolder(path = '') {
  console.log(`Processing folder: ${path || "/"}`);
  fs.mkdirSync(`./${_destinationRoot}${path}`, { recursive: true });
  const contents = await listFolderContents(path);
  const files = filterFiles(contents);
  const folders = filterFolders(contents);
  await files.forEach(async (file) => await downloadFile(file));
  await folders.forEach(async (folder) => await processFolder(folder));
}

async function run() {
  fs.rmdirSync(_destinationRoot, { recursive: true });
  await processFolder();
}

run();
