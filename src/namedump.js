const fs = require('fs')
const XLSX = require('xlsx')
const {ncp} = require('ncp')
const parse = require('csv-parse/lib/sync')
const crypto = require('crypto')
const rimraf = require('rimraf')
const jewels = require('./jewels')
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

      if (all || subPath.includes('m1') || subPath.includes('m2') || subPath.includes('m3') || subPath.includes('m4') || subPath.includes('m5')) {
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
      await jewels.flatten(targetFolder)
      break
    }

    case 'flattenall': {
      const [targetFolder] = args
      await jewels.flatten(targetFolder, true)
      break
    }

    case 'truncate': {
      const [targetFolder] = args
      await jewels.truncate(targetFolder)
      break
    }

    case 'dump': {
      const [targetFolder, outputFolder] = args
      await jewels.dump(targetFolder, outputFolder)
      break
    }

    case 'unpack': {
      const [targetFolder] = args
      await jewels.unpack(targetFolder)

      break
    }

    case 'seqcheck': {
      const [targetFolder] = args
      await jewels.seqCheck(targetFolder)
      break
    }

    case 'compare': {
      const [target] = args
      await jewels.compare(target)

      break
    }

    case 'rename': {
      let [targetFolder, inputPath] = args
      await jewels.rename(targetFolder, inputPath)
      break
    }

    case 'validate': {
      let [targetFolder] = args
      await jewels.validateParentFolder(targetFolder)
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