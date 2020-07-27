#!/bin/bash
set -e

destination_path="${1:-"dropbox-migration"}"
#access_token="rtozMTxVEioAAAAAAAAH4qqoZVlx_2Al9fEA39D8hkx__IAIqA1iNqdigbyYgjX9"
access_token="1Z7GgIhHDAgAAAAAAAAtrGz-KGtTF4ogAD-pdCYKSbokkiUIHSni3jYoGZXfpJdW"

function list_folder_contents {
  curl -s -X POST https://api.dropboxapi.com/2/files/list_folder \
    --header "Authorization: Bearer $access_token" \
    --header "Content-Type: application/json" \
    --data "{\"path\": \"$1\",\"recursive\": false}"
}

function filter_files {
  echo $1 | jq '[ .entries[] | select(.[".tag"] == "file") | select(.is_downloadable == true) | .path_display ]'
}

function filter_folders {
  echo $1 | jq '[ .entries[] | select(.[".tag"] == "folder") | .path_display ]'
}

function clean_item {
  local item=$1
  item=$( echo ${item//\"} ) # remove double quotes
  # item=$( echo ${item//\r} ) # remove carriage returns (doesn't work, actually removes the letter 'r' ??)
  echo "$item"
}

function download_file {
  local file=$1
  echo "   - downloading file: $file"
  curl -s -X POST https://content.dropboxapi.com/2/files/download \
    --header "Authorization: Bearer $access_token" \
    --header "Dropbox-API-Arg: {\"path\": \"$file\"}" \
    --output "${file:1}" # strip leading slash
}

function process_folder {
  local path=$1
  echo " - Processing folder: ${path:-"/"}"

  if [ ! -z "$path" ] ; then
    mkdir -p "${path:1}" # strip leading slash
  fi

  local contents=$( list_folder_contents "$path" )
  local folders=$( filter_folders "$contents" )
  local files=$( filter_files "$contents" )

  echo $files | jq -c '.[]' | while read file ; do
    file=$( clean_item "$file" )
    download_file "$file"
  done

  echo $folders | jq -c '.[]' | while read folder ; do
    folder=$( clean_item "$folder" )
    process_folder "$folder" # recursion!
  done
}

rm -rf "$destination_path"
mkdir "$destination_path"
cd "$destination_path"
process_folder
