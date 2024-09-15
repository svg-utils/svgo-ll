#!/bin/bash

ver="$1"

packageVer=`npm pkg get version`
if [ $packageVer != '"'"$ver"'"' ]; then
  echo "package.json: expected version $ver, got $packageVer"
  exit 1
fi

npm pack git://github.com/svg-utils/svgo-ll.git#v$ver
