#!/usr/bin/env bash

cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericFolderIcon.icns .
cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns .
cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/OpenFolderIcon.icns .
cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/LibraryFolderIcon.icns .
cp /Applications/Chocolat.app/Contents/Resources/*.icns .

for i in *.icns; do sips -s format png $i --out $i.png;done

rm *.icns