const fs = require('fs')
const XLSX = require('xlsx')
const {ncp} = require('ncp')
const parse = require('csv-parse/lib/sync')
const crypto = require('crypto')
const rimraf = require('rimraf')
const extract = require('extract-zip')
const nodePath = require('path')
const {parseString} = require('xml2js')

const getFiles = (dir, subPath=[], all=false, withDetails=false) => {
  let files = []
  const scanDir = subPath.length > 0 ? `${dir}/${subPath.join('/')}` : dir

  const dirFiles = fs.readdirSync(scanDir)
  for (let dirFile of dirFiles) {
    const fullPath = nodePath.resolve(`${scanDir}/${dirFile}`)
    if (fs.lstatSync(fullPath).isDirectory()) {
      const innerFiles = getFiles(dir, subPath.concat([dirFile]), all, withDetails)
      files = files.concat(innerFiles)
    } else {
      if (all || subPath.includes('m1') || subPath.includes('m2') || subPath.includes('m3') || subPath.includes('m4') || subPath.includes('m5')) {
        if (withDetails) {
          files.push([fullPath, subPath, dirFile])
        } else {
          files.push(fullPath)
        }
      }
    }
  }

  return files
}

const checkExistsFuzzy = (dir, substring, ext) => {
  const allFiles = getFiles(dir, [], true)
  for (let file of allFiles) {
    if (file.indexOf(substring) != -1 && nodePath.extname(file) === ext) {
      return true
    }
  }

  return false
}

exports.fdast = async (targetFolder) => {
  const allFiles = getFiles(targetFolder, [], false, true)
  const labels = ['submission type', 'type label', 'submission ID', 'submission sub type', 'sub type label', 'sequence number', 'folder number', 'file path']
  const output = [labels]

  const translations = {
    fdasst4: 'Amendment',
    fdasst3: 'Application',
    fdasst7: 'Correspondence',
    fdasst1: 'Original',
    fdasst2: 'Presubmission',
    fdasst6: 'Report',
    fdasst5: 'Resubmission',
    fdaat9: 'Premarket Approval Application (PMA)',
    fdast5: 'Annual Report',
    fdast3: 'Chemistry Manufacturing Controls Supplement',
    fdast2: 'Efficacy Supplement',
    fdast9: 'IND Safety Reports',
    fdast4: 'Labeling Supplement',
    fdast1: 'Original Application',
    fdast10: 'Periodic Safety Reports',
    fdast7: 'Postmarketing Requirements or Postmarketing Commitments',
    fdast6: 'Product Correspondence',
    fdast8: 'Promotional Labeling Advertising'
  }

  for (let [file, subPath, dirFile] of allFiles) {
    if (file.indexOf('us-regional.xml') !== -1) {
      console.log("FOUND XML", file)

      const contents = fs.readFileSync(file).toString()
      
      const data = await new Promise((resolve, reject) => {
        parseString(contents, (err, results) => {
          err ? reject(err) : resolve(results)
        })
      })

      const version = data['fda-regional:fda-regional']['$']['dtd-version']

      if (version !== '3.3') {
        output.push(['xxx', 'xxx', 'xxx', 'xxx', 'xxx', 'xxx', 'xxx', file])
        continue
      }

      const applicationSet = data['fda-regional:fda-regional'].admin[0]['application-set']
      
      for (let item of applicationSet) {
        const application = item.application[0]
        const app = application['application-information'][0]
        const sub = application['submission-information'][0]
        const appNumber = app['application-number'][0]

        const applicationType = appNumber['$']['application-type']
        const applicationNumber = appNumber._

        const subId = sub['submission-id'][0]
        const submissionId = subId._
        const submissionType = subId['$']['submission-type']

        const sequenceNumber = sub['sequence-number'][0]
        const subType = sequenceNumber['$']['submission-sub-type']

        const newRow = [submissionType, translations[submissionType], submissionId, subType, translations[subType], sequenceNumber._, subPath[0], file]

        output.push(newRow)
      }
    }
  }

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(output)

  const outPath = require('path').resolve(process.cwd(), targetFolder) + '/fdast_out.xlsx'
  XLSX.utils.book_append_sheet(workbook, worksheet, 'fdast_out')
  XLSX.writeFile(workbook, outPath)
}

exports.flatten = async (targetFolder, flattenAll=false) => {
  const files = getFiles(targetFolder, [], flattenAll, true)

  for (let [fullPath, subPath, dirFile] of files) {
    let destName
    if (subPath.length > 0) {
      destName = [subPath.slice(0, 2).join('-'), dirFile].join('-')
    } else {
      destName = dirFile
    }
    
    const dest = nodePath.resolve(`${process.cwd()}/${destName}`)

    console.log("DEST PATH", fullPath, dest)

    fs.renameFileSync(fullPath, dest)
  }

  console.log(`flattened ${files.length} files`)
}


exports.truncate = async (targetFolder) => {
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
}

exports.pathCheck = async (targetFolder) => {
  const folderPath = require('path').resolve(process.cwd(), targetFolder)
  console.log("CHECKING PATH", folderPath)

  const topLevelItems = fs.readdirSync(folderPath)

  for (item of topLevelItems) {
    const filePath = `${folderPath}/${item}`
    if (fs.lstatSync(filePath).isDirectory()) {
      const allFiles = getFiles(filePath, [], true)

      for (let file of allFiles) {
        if (file.indexOf('index.xml') !== -1 || file.indexOf('us-regional.xml') !== -1) {
          const contents = fs.readFileSync(file).toString()
          
          const data = await new Promise((resolve, reject) => {
            parseString(contents, (err, results) => {
              err ? reject(err) : resolve(results)
            })
          })

          const checkObject = (obj, nesting=[]) => {
            for (let key in obj) {
              const val = obj[key]
              
              if (val.constructor === String) {
                if (key === 'xlink:href') {
                  let finalPath = `${nodePath.dirname(file)}/${val}`

                  if (fs.existsSync(finalPath)) {
                    // console.log("EXISTS")
                  } else {
                    console.log("DOES NOT EXIST", file, finalPath)
                  }
                }
              } else {
                const newPath = nesting.slice()
                newPath.push(key)
                checkObject(val, newPath)
              }
            }
          }

          for (let key in data) {
            if (key === '$') {
              continue
            }

            const val = data[key]
            // console.log("KEYVAL", key, val)
            checkObject(val)
          }
        }
      }
    }
  }
}

exports.dump = async (targetFolder, outputFolder) => {
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
}

exports.unpack = async (targetFolder) => {
  const folderPath = nodePath.resolve(process.cwd(), targetFolder)
  const files = fs.readdirSync(folderPath)

  const outputName = 'unpacked'
  const outputDir = `${folderPath}/${outputName}`
  const receiptsDir = `${folderPath}/${outputName}/receipts`
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
}

exports.seqCheck = async (targetFolder) => {
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

  found.sort((a, b) => {return a - b})

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
}

exports.compare = async (target) => {
  const checksums = {}

  const parentDir = require('path').resolve(process.cwd(), target)
  const files = fs.readdirSync(target)

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

  for (let file of files) {
    const fullPath = `${parentDir}/${file}`
    if (fs.lstatSync(fullPath).isDirectory()) {
      await getFolderChecksums(fullPath)
    }
  }

  let hasDupe = false
  for (let key in checksums) {
    const val = checksums[key]
    if (val.length > 1) {
      console.log("\nDUMPLICATE\n", val.join('\n'))
      hasDupe = true
    }
  }

  if (!hasDupe) {
    console.log("\n no duplicates found")
  }
}

exports.rename = async (targetFolder, inputPath) => {
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
      let newPath = inputMap[file]

      const source = nodePath.resolve(folderPath, file)
      const dest = nodePath.resolve(folderPath, newPath)

      if (fs.lstatSync(source).isDirectory()) {
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
}

exports.validateFormat = async (targetFolder) => {
  const folderPath = require('path').resolve(process.cwd(), targetFolder)
  const files = fs.readdirSync(folderPath)

  let didFail = false
  let output = 'structure checks\n'

  if (files.includes('index.xml')) {
    ouptut += 'index.xml file exists and is in root folder...pass\n'
  } else {
    ouptut += 'index.xml file exists and is in root folder...FAIL\n'
    didFail = true
  }

  if (files.includes('index-md5.txt')) {
    ouptut += 'index-md5.txt file exists and is in root folder...pass\n'
  } else {
    ouptut += 'index-md5.txt file exists and is in root folder...FAIL\n'
    didFail = true
  }

  try {
    const dtdFiles = fs.readdirSync(folderPath + '/util/dtd')
    let has
  } catch (err) {

  }
}

exports.validateParentFolder = async (parentFolder) => {
  const folderPath = require('path').resolve(process.cwd(), parentFolder)
  const files = fs.readdirSync(folderPath)

  const allFails = {}

  for (let file of files) {
    const fullPath = `${folderPath}/${file}`
    if (fs.lstatSync(fullPath).isDirectory()) {
      const failures = await exports.validateFolder(fullPath)

      if (failures && failures.length > 0) {
        allFails[fullPath] = failures
      }
    }
  }

  let fileStr = ''

  for (let failPath in allFails) {
    fileStr += `\n************** START ${failPath} **************\n\n`

    for (let fail of allFails[failPath]) {
      fileStr += `- ${fail}`
    }

    fileStr += `\n\n************** END ${failPath} **************\n\n`
  }

  fs.writeFileSync(`${folderPath}/failures.txt`, fileStr)
}

exports.validateFolder = async (targetFolder) => {
  console.log("VALIDATING", targetFolder)
  const fails = []
  const passes = []

  const checkExists = (file, report=true) => {
    if (!fs.existsSync(file)) {
      if (report) {
        fails.push(`Missing ${file}`)
      }
      return false
    } else {
      if (report) {
        passes.push(`Has extact ${file}`)
      }
      return true
    }
  }

  const checkFuzzy = (dir, file, ext) => {
    if (!checkExistsFuzzy(dir, file, ext)) {
      fails.push(`Missing ${dir} ${file} ${ext}`)
    } else {
      passes.push(`Has fuzzy ${dir} ${file} ${ext}`)
    }
  }

  checkExists(`${targetFolder}/index.xml`)
  checkExists(`${targetFolder}/index-md5.txt`)
  
  checkExists(`${targetFolder}/util/dtd`)
  checkExists(`${targetFolder}/util/style`)
  
  checkFuzzy(`${targetFolder}/util/dtd`, 'ich-ectd', '.dtd')
  checkFuzzy(`${targetFolder}/util/style`, 'ectd', '.xsl')

  checkFuzzy(`${targetFolder}/m1`, 'us-regional', '.xml')
  checkFuzzy(`${targetFolder}/m1`, 'cover', '.pdf')
  checkFuzzy(`${targetFolder}/m1`, '1571', '.pdf')

  const allowedFormats = {
    m1: ['.pdf','.doc','.docx','.bmp','.gif','.png','.jpg','.jpeg','.au','.avi','.flv','.fla','.f4v','.mpg','.mpeg','.mp2','.mp3','.mp4','.swf','.wav','.wma','.wmv','.css','.dtd','.htm','.html','.xml','.xsl'],
    m2: ['.pdf', '.gif', '.png', '.jpg', '.jpeg'],
    m3: ['.pdf', '.txt', '.xls', '.xlsx', '.gif', '.png', '.jpg', '.jpeg', '.svg', '.xpt', '.sas', '.r'],
    m4: ['.pdf', '.txt', '.xls','.xlsx','.gif', '.png', '.jpg', '.jpeg', '.css', '.xml', '.xsl', '.svg', '.xpt', '.sas', '.r'],
    m5: ['.pdf','.txt','.xls','.xlsx','.gif','.png','.jpg','.jpeg','.css','.xml','.xsl','.csv','.svg','.xpt','.cmp','.wks','.lbr','.lua','.sas','.r','.ctl']
  }

  for (let folderName in allowedFormats) {
    if (checkExists(`${targetFolder}/${folderName}`, false)) {
      const allFiles = getFiles(`${targetFolder}/${folderName}`, [], true)
      for (let file of allFiles) {
        const formats = allowedFormats[folderName]
        const ext = nodePath.extname(file)
        if (!formats.includes(ext) && ext !== '.db') {
          fails.push(`illegal format ${ext} on file ${file}`)
        }
      }
    }
  }

  // console.log("PASSES\n", passes.join('\n'))

  // if (fails.length) {
  //   console.log("FAILURES:\n\n", fails.join('\n'))
  // } else {
  //   console.log("FOLDER IS OK")
  // }

  return fails
}