const filterFolders = response => {
  return response.entries
    .filter(x => x[".tag"] === "folder")
    .map(x => x.path_display);
};

const filterFiles = response => {
  return response.entries
    .filter(x => x[".tag"] === "file" && x.is_downloadable)
    .map(x => x.path_display);
};

const appendFolderContents = (response, contents) => {
  contents.files.push(...filterFiles(response));
  contents.folders.push(...filterFolders(response));
};

const asyncForEach = async (array, callback) => {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array);
  }
}

module.exports = { asyncForEach, appendFolderContents };
