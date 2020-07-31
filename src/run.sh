#!/bin/bash
profile=$1
shift
accessToken=$( cat ../secrets.json | jq ".accessTokens.$profile" | xargs ) node ./index.js $@
