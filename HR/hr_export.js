const UB = require('@unitybase/ub')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const argv = require('@unitybase/base').argv
const path = require('path')
const fs = require('fs')
const requestService = require('./modules/export/requestService.js')
const dateService = require('../AC/modules/dataServices/dateService')
const expPublicData = require('./modules/export/publicData')
const expPosContest = require('./modules/export/posContest')

module.exports = {
  getExportPath,
  getUploadUrl
}

me.entity.addMethod('exportPublicData')
me.entity.addMethod('getJsonFile')
me.entity.addMethod('exportPosContest')
me.entity.addMethod('setPosContestResult')
me.entity.addMethod('requestPosContestResultByID')
me.entity.addMethod('uploadPublicData')
me.entity.addMethod('schedulerUploadPublicData')
me.entity.addMethod('schedulerRequestPosContest')

function getExportPath () {
  const configDir = process.configPath
  let exportPath = path.join(configDir, 'models', 'UBScripts', 'export')
  if (App.serverConfig.application.customSettings && App.serverConfig.application.customSettings.exportPath) {
    exportPath = App.serverConfig.application.customSettings.exportPath
  }
  return exportPath
}

function getUploadUrl () {
  return UB.Repository('ac_settings')
    .attrs(['value'])
    .where('constantID.code', '=', 'hrExportCfgConnect')
    .selectScalar()
}

me.exportPublicData = function (ctx) {
  const mParams = ctx.mParams
  mParams.path = mParams.path || getExportPath()
  mParams.result = expPublicData.exportPublicData(mParams.onDate, mParams.path)
  return true
}

me.getJsonFile = function (ctx) {
  const mParams = ctx.mParams
  mParams.path = mParams.path || getExportPath()
  mParams.resultData = fs.readFileSync(path.join(mParams.path, mParams.fileName), 'utf8')
  return true
}

me.exportPosContest = function (ctx) {
  const mParams = ctx.mParams
  const onDate = mParams.onDate || dateService.currentDate()
  const states = mParams.states || ['AGREED']
  const createDateFrom = mParams.createDateFrom || null
  const createDateTo = mParams.createDateTo || null

  const dataTable = expPosContest.exportPosContest({
    onDate: onDate,
    states: states,
    createDateFrom: createDateFrom,
    createDateTo: createDateTo
  })
  const resultData = JSON.stringify(dataTable)

  mParams.resultData = resultData
  return true
}

me.setPosContestResult = function (ctx) {
  const mParams = ctx.mParams
  const data = mParams.data
  const json = JSON.parse(data)
  expPosContest.setPosContestResult(json)
  return true
}

/**
 *
 * @param {number} posContestID
 * @return {posContestTypes.PosContestResult}
 */
function requestPosContestResultInternalByID (posContestID) {
  const url = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('constantID.code', '=', 'posContestResultUrl')
    .selectScalar()
  const fullUrl = `${url}/${posContestID}`
  const jsonData = {
    // id: posContestID
  }

  try {
    const timeout = 1000
    const response = requestService.postJson(jsonData, fullUrl, timeout)
    const status = response.statusCode
    const dataRead = response.read()
    if (status !== 200) {
      throw new UB.UBAbort(`<<<${UB.i18n('Помилка експорту по url "{0}", status: {1}, data: {2}', fullUrl, status, dataRead)}>>>`)
    }
    return dataRead
  } catch (error) {
    console.error(error)
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутній зв\'язок з "{0}" або помилка запиту, error: {1}', url, error.message)}>>>`)
  }
}

me.requestPosContestResultByID = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  const ID = execParams.ID

  const json = requestPosContestResultInternalByID(ID)
  expPosContest.setPosContestResult(json)
  return true
}

me.uploadPublicData = function (ctx) {
  const mParams = ctx.mParams
  mParams.path = mParams.path || getExportPath()
  mParams.uploadFileName = mParams.uploadFileName || 'uploadData.json'
  expPublicData.uploadPublicData(mParams.path, mParams.groups, mParams.uploadFileName)
  const jsonData = fs.readFileSync(path.join(mParams.path, mParams.uploadFileName), 'utf8')
  const jsonDataObj = JSON.parse(jsonData)
  const uploadUrl = getUploadUrl()
  if (uploadUrl) {
    const timeout = 30000
    requestService.postJsonToUrlList(jsonDataObj, uploadUrl, timeout)
    return true
  }
  return false
}

me.schedulerUploadPublicData = schedulerUploadPublicData
function schedulerUploadPublicData (ctx) {
  const exportPath = getExportPath()
  const uploadFileName = 'uploadData.json'

  const onDate = dateService.shiftDate(new Date())
  const result = expPublicData.exportPublicData(onDate, exportPath)

  expPublicData.uploadPublicData(exportPath, result.filesGroup, uploadFileName)
  const jsonData = fs.readFileSync(path.join(result.path, uploadFileName), 'utf8')
  const jsonDataObj = JSON.parse(jsonData)
  const uploadUrl = getUploadUrl()
  if (uploadUrl) {
    const timeout = 5000
    requestService.postJsonToUrlList(jsonDataObj, uploadUrl, timeout)
    return true
  }
  return false
}

function posContestItemsFill (state) {
  // const onDate = new Date()
  const items = UB.Repository('hr_listPosContest')
    .attrs([
      'ID',
      'orderID.description',
      'paraID.description',
      'organizationID.description',
      'positionID.name',
      'state',
      'dateFrom',
      'dateTo',
      'result',
      'portalCode',
      'dateClose'
    ])
    .orderBy('dateFrom')
    .where('state', '=', state)
    .selectAsObject()
  return items
}

me.schedulerRequestPosContest = schedulerRequestPosContest
function schedulerRequestPosContest (ctx) {
  const state = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('constantID.code', '=', 'posContestResultState')
    .selectScalar()
  if (!state || state.length < 1) {
    throw new UB.UBAbort(`<<<${UB.i18n('Invalid settings posContestResultState: "{0}" is null or undefined', state)}>>>`)
  }

  const items = posContestItemsFill(state)
  const itemsError = []
  items.forEach(posContest => {
    try {
      const json = requestPosContestResultInternalByID(posContest.ID)
      expPosContest.setPosContestResult(json)
    } catch (error) {
      console.error(error)
      itemsError.push({
        error: error,
        posContest: posContest
      })
    }
  })

  if (itemsError.length > 0) {
    const itemError = itemsError[0]
    throw itemError.error
  }
}
