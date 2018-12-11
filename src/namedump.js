const fs = require('fs')
const parse = require('csv-parse/lib/sync')

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
  console.log("GET FILES", dir, subPath, all, dirFiles)
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

    case 'dump': {
      const [targetFolder] = args
      const folderPath = require('path').resolve(process.cwd(), targetFolder)
      const files = fs.readdirSync(folderPath)
      fs.writeFileSync('./out.csv', files.join('\n'))
      break
    }

    case 'rename': {
      let [targetFolder, inputPath] = args

      if (inputPath === undefined) {
        inputPath = process.cwd() + '/input.csv'
      }

      const folderPath = require('path').resolve(process.cwd(), targetFolder)
      const files = fs.readdirSync(folderPath)

      const inputFile = fs.readFileSync(inputPath).toString()
      const input = parse(inputFile)

      const inputMap = {}
      for (let inputLine of input) {
        const [key, val] = inputLine
        inputMap[key] = val
      }

      for (let file of files) {
        if (inputMap[file]) {
          const ext = require('path').extname(file)
          let newPath = inputMap[file]

          if (newPath.indexOf(ext) === -1) {
            newPath += ext
          }

          const source = `${folderPath}/${file}`
          const dest = `${folderPath}/${newPath}`

          fs.renameSync(source, dest)
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