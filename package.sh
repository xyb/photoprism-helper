#!/bin/sh

rm -f photoprism-helper.zip
zip -r photoprism-helper.zip . -x "*.git*" -x "*.DS_Store" -x ".claude/*" -x "*.md" -x "icons/*.svg" -x "*.sh"
