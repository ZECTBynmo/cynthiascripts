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

    // case 'truncate': {
    //   const [targetFolder] = args
    //   await jewels.truncate(targetFolder)
    //   break
    // }

    case 'dump': {
      const [targetFolder, outputFolder] = args
      await jewels.dump(targetFolder, outputFolder)
      break
    }

    // case 'unpack': {
    //   const [targetFolder] = args
    //   await jewels.unpack(targetFolder)

    //   break
    // }

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