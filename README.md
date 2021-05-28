# <3

## setup

1. Find your node executable (it'll be on your USB drive, and you'll have to navigate there in the terminal or somehow find the exact path of node.exe)
2. Install the dependences
  a. Navigate to the cynthiascripts folder on your usb drive in terminal
  b. run `[node path]/npm install`

## Usage

### Dump (dump file name contents of a folder (ex. C:/somefolder))

`[node path]/node.exe [cynthiascripts path]/src/namedump.js dump [targetFolder]`

This will create out.csv within the target folder

### Receipt Dump (dump with more stuff for receipts? I dunno)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js receiptDump [targetFolder]`

This will create out.csv within the target folder

### Rename folder contents (also applies to folders)

First, create an input.csv (maybe using out.csv)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js rename [targetFolder] (input.csv path)` 

If you leave input.csv blank, it will default to `[current terminal path]/input.csv`

### "Fdast" directory (Print DTD 3.3 fdast submission type and sub-type with decoding)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js fdast [targetFolder]` 

### "Flatten" directory (print all recursive contents of multiple submissions, adding 1st level folder name to file name)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js flattenall [targetFolder]` 

### "Flatten" directory (print all recursive contents of multiple submissions, adding submission # and m1-m5 to the file name)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js flatten [targetFolder]` 

### Sequence Check (make sure folders with names like 0056, 0057, etc. are sequential with none missing)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js seqcheck [targetFolder]` 

### Validate (make sure folder contents has the right structure/files/etc.)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js validate [targetFolder]` 

### File Compare (Examine all folders within some parent directory and look for duplicate files based on checksums)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js compare [target]` 

### Unpack (unzip submissions uploaded to Sharefile to provide receipts and submissions folders)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js unpack [targetFolder]` 

### Pathcheck (finds links in index.xml and us-regional.xml and confirms that the targets exist)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js pathcheck [targetFolder]` 

### Pathcheck simple (given a csv list of file paths (no starting /), checks that all files exist)

`[node path]/node.exe [cynthiascripts path]/src/namedump.js pathcheck-simple [csvFilePath]` 

### Triple (given any csv, triple each row and then write to an excel file)