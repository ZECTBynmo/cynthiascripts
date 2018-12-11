# <3

## setup

1. Find your node executable (it'll be on your USB drive, and you'll have to navigate there in the terminal or somehow find the exact path of node.exe)
2. Install the dependences
  a. Navigate to the cynthiascripts folder on your usb drive in terminal
  b. run `[node path]/npm install csv-parse`

## Usage

### Dump contents of a folder (ex. C:/somefolder)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js dump [targetFolder]`

This will create out.csv within the folder that you're currently in (in terminal)

### Rename folder contents

First, create an input.csv (maybe using out.csv)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js rename [targetFolder] (input.csv path)` 

If you leave input.csv blank, it will default to `[current terminal path]/input.csv`

### "Flatten" directory (print all recursive contents)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js flattenall [targetFolder]` 

### "Flatten" directory (print recursive contents of m1 and m5 folders)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js flatten [targetFolder]` 
