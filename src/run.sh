#!/bin/bash
accessToken=$( cat secrets.json | jq ".accessTokens.${1:-"erik"}" | xargs ) node ./index.js