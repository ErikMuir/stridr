#!/bin/bash
set -e

temp_path="${1:-"dropbox-migration"}"

echo ""
echo "Downloading all files from Dropbox"
echo ""
./download-dropbox.sh "$temp_path"

echo ""
echo "Uploading all files to Google Drive"
echo ""
./upload-google-drive.sh "$temp_path"

echo ""
echo "Successfully migrated all files!"
echo ""
