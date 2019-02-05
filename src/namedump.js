const fs = require('fs')
const XLSX = require('xlsx')
const {ncp} = require('ncp')
const parse = require('csv-parse/lib/sync')
const crypto = require('crypto')
const rimraf = require('rimraf')
const extract = require('extract-zip')
const nodePath = require('path')

ncp.limit = 16

const argv = require('yargs')
  .usage('usage $0 <command> [options]')
  .command('transform', 'run transform daemon')
  .example('$0 start')
  .help('h')
  .alias('h', 'help')
  .argv

const [command, ...args] = argv._

const getFiles = (dir, subPath=[], all=false) => {
  let files = []
  const scanDir = subPath.length > 0 ? `${dir}/${subPath.join('/')}` : dir

  const dirFiles = fs.readdirSync(scanDir)
  for (let dirFile of dirFiles) {
    const fullPath = `${scanDir}/${dirFile}`
    if (fs.lstatSync(fullPath).isDirectory()) {
      const innerFiles = getFiles(dir, subPath.concat([dirFile]), all)
      files = files.concat(innerFiles)
    } else {
      const destName = [subPath.slice(0, 2).join('-'), dirFile].join('-')
      const dest = `${dir}/${destName}`

      if (all || subPath.includes('m1') || subPath.includes('m5')) {
        fs.renameSync(fullPath, dest)
        files.push(dest)
      }
    }
  }

  return files
}

const run = async () => {

  switch (command) {
    case 'flatten': {
      const [targetFolder] = args
      const files = getFiles(targetFolder)
      console.log(`flattened ${files.length} files`)
      break
    }

    case 'flattenall': {
      const [targetFolder] = args
      const files = getFiles(targetFolder, [], true)
      console.log(`flattened ${files.length} files`)
      break
    }

    case 'truncate': {
      const [targetFolder] = args
      const files = getFiles(targetFolder, [], true)
      for (let file of files) {
        if (fs.lstatSync(source).isDirectory(source)) {
          await new Promise((resolve, reject) => {
            ncp(source, dest, (err) => {
              err ? reject(err) : resolve()
            })
          })

          rimraf.sync(source)
        }
      }
      break
    }

    case 'dump': {
      const [targetFolder, outputFolder] = args
      const folderPath = require('path').resolve(process.cwd(), targetFolder)
      const outPath = require('path').resolve(process.cwd(), outputFolder || targetFolder) + '/out.xlsx'
      
      const files = fs.readdirSync(folderPath)

      const data = [['file', 'target']]
      for (let file of files) {
        data.push([file, ' '])
      }

      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(data)

      XLSX.utils.book_append_sheet(workbook, worksheet, 'files')
      XLSX.writeFile(workbook, outPath)
      break
    }

    case 'unpack': {
      const [targetFolder] = args
      const folderPath = nodePath.resolve(process.cwd(), targetFolder)
      const files = fs.readdirSync(folderPath)

      const outputDir = folderPath + '/out'
      const receiptsDir = folderPath + '/out/receipts'
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir)
      }
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir)
      }

      for (let file of files) {
        const fullPath = `${folderPath}/${file}`
        if (fs.lstatSync(fullPath).isDirectory() && !isNaN(file)) {
          const fileNum = file

          const contents = fs.readdirSync(fullPath)
          for (let folderItem of contents) {
            const ext = nodePath.extname(folderItem)
            if (ext === '.zip') {
              const dest = `${outputDir}`

              await new Promise((resolve, reject) => {
                extract(`${fullPath}/${folderItem}`, {dir: dest}, (err) => {
                  err ? reject(err) : resolve()
                })
              })
            } else {
              const receiptItemDir = `${receiptsDir}/${fileNum}`
              if (!fs.existsSync(receiptItemDir)) {
                fs.mkdirSync(receiptItemDir)
              }

              const contents = fs.readFileSync(`${fullPath}/${folderItem}`)
              fs.writeFileSync(`${receiptItemDir}/${folderItem}`, contents)
            }
          }
        }
      }

      break
    }

    case 'seqcheck': {
      const [targetFolder] = args
      const folderPath = require('path').resolve(process.cwd(), targetFolder)
      const files = fs.readdirSync(folderPath)

      const found = []
      for (let file of files) {
        const fullPath = `${folderPath}/${file}`
        if (fs.lstatSync(fullPath).isDirectory() && !isNaN(file)) {
          const fileNum = Number(file)
          found.push(fileNum)
        }
      }

      found.sort()

      console.log("FOUND", found)

      let hasMissing = false
      for (let iItem in found) {
        iItem = Number(iItem)
        const val = found[iItem]
        if (iItem < found.length - 1) {
          const nextVal = found[iItem + 1]
          if (nextVal > val + 1) {
            for (let iAlert=val+1; iAlert < nextVal; ++iAlert) {
              console.log("ALERT! MISSING", iAlert)
            }

            hasMissing = true
          }
        }
      }

      if (!hasMissing) {
        console.log("\n Green light - all folders are sequential")
      }

      break
    }

    case 'compare': {
      const [firstTarget, secondTarget] = args
      const checksums = {}

      const fileHash = async (filename, algorithm = 'md5') => {
        return new Promise((resolve, reject) => {
          // Algorithm depends on availability of OpenSSL on platform
          // Another algorithms: 'sha1', 'md5', 'sha256', 'sha512' ...
          let shasum = crypto.createHash(algorithm)
          try {
            let s = fs.ReadStream(filename)
            s.on('data', function (data) {
              shasum.update(data)
            })
            // making digest
            s.on('end', function () {
              const hash = shasum.digest('hex')
              return resolve(hash)
            })
          } catch (error) {
            return reject('calc fail')
          }
        })
      }

      const getFolderChecksums = async (folderPath) => {
        const files = fs.readdirSync(folderPath)

        for (let file of files) {
          const fullPath = `${folderPath}/${file}`
          if (fs.lstatSync(fullPath).isDirectory()) {
            await getFolderChecksums(fullPath)
          } else {
            const checksum = await fileHash(fullPath)

            if (checksums[checksum] === undefined) {
              checksums[checksum] = []
            }

            checksums[checksum].push(fullPath)
          }
        }
      }

      await getFolderChecksums(require('path').resolve(process.cwd(), firstTarget))
      await getFolderChecksums(require('path').resolve(process.cwd(), secondTarget))

      let hasDupe = false
      for (let key in checksums) {
        const val = checksums[key]
        if (val.length > 1) {
          console.log("DUMPLICATE", val.join(' - '))
          hasDupe = true
        }
      }

      if (!hasDupe) {
        console.log("\n no duplicates found")
      }

      break
    }

    case 'rename': {
      let [targetFolder, inputPath] = args

      if (inputPath === undefined) {
        inputPath = process.cwd() + '/input.xlsx'
      }

      const workbook = XLSX.readFile(inputPath)

      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]

      const input = XLSX.utils.sheet_to_json(sheet)

      const folderPath = require('path').resolve(process.cwd(), targetFolder)
      const files = fs.readdirSync(folderPath)

      const inputMap = {}
      for (let inputLine of input) {
        const target = inputLine.target.trim()

        if (target !== undefined && target !== '') {
          inputMap[inputLine.file] = target
        }
      }

      console.log("INPUT MAP", inputMap)

      for (let file of files) {
        if (inputMap[file]) {
          const ext = require('path').extname(file)
          let newPath = inputMap[file]

          if (newPath.indexOf(ext) === -1) {
            newPath += ext
          }

          const source = nodePath.resolve(folderPath, file)
          const dest = nodePath.resolve(folderPath, newPath)

          if (fs.lstatSync(source).isDirectory(source)) {
            console.log("MOVING FOLDER", source, dest)
            await new Promise((resolve, reject) => {
              ncp(source, dest, (err) => {
                err ? reject(err) : resolve()
              })
            })

            rimraf.sync(source)
          } else {
            console.log("RENAMING FILE", source, dest)
            fs.renameSync(source, dest)
          }
        }
      }

      break
    }

    default: {
      console.log("UNKNOWN COMMAND", command)
      break
    }
  }

  console.log("\nall done <3")

}

run()

process.on('unhandledRejection', (err) => {
  console.log("INFO unhandledRejection", err)
  process.exit()
})

process.on('unhandledException', (err) => {
  console.log("INFO unhandledException", err)
  process.exit()
})