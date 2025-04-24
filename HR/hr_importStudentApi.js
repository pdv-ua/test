const UB = require('@unitybase/ub')
const iconv = require('iconv-lite')
const App = UB.App
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

const importStudentService = require('../HR/modules/import/importStudentService')
const storeService = require('../AC/modules/entityServices/storeService')
const dateService = require('../AC/modules/dataServices/dateService')
const queryString = require('querystring')
const http = require('http')
const URL = require('url')

App.registerEndpoint('loadImportStudentJson', loadJsonFile, true)

const loginEndpoint = '/api/auth/login'
const activeStudEndpoint = '/api/a5/activeStudents'
const dismissStudEndpoint = '/api/a5/dismissStudents'

const timeout = 3000
const pageSize = 100

me.entity.addMethod('doImport')
me.entity.addMethod('doProcess')
me.entity.addMethod('checkConfig')
me.entity.addMethod('saveConfig')

/**
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
function loadJsonFile (req, resp) {
  if (req.method !== 'POST') {
    return resp.badRequest('invalid HTTP verb' + req.method)
  }
  let params = queryString.parse(req.parameters)
  let data = req.read('bin')
  const jsonStr = iconv.decode(Buffer.from(data), params.encoding || 'utf8')

  let result = ''
  let studentData = []
  let noError = true

  try {
    studentData = JSON.parse(jsonStr)
  } catch (err) {
    noError = false
    result = {
      error: UB.i18n('Помилка опрацювання файлу: "{0}"', err.message)
    }
  }
  if (noError) {
    const dateFromStipend = params.dateFromStipend ? dateService.shiftDate(Number(params.dateFromStipend)) : null
    const loadParams = {
      typeStudy: params.typeStudy || null,
      formStudy: params.formStudy || null,
      semester: params.semester ? params.semester.split(',') : null
    }
    importStudentService.importStudData(studentData, params.orgID, params.mode, loadParams, dateFromStipend, 'json')
  }

  resp.statusCode = 200
  resp.writeHead('Content-Type: application/json;charset=UTF-8')
  resp.writeEnd(result)
  data = null
}

function postJson (data, url, timeOut, authToken) {
  let urlParts = URL.parse(url)

  const headers = {
    'Content-Type': 'application/json-patch+json',
    'Accept': 'text/plain'
  }

  if (authToken) {
    headers['Authorization'] = authToken
  }

  const options = {
    host: urlParts.host,
    port: urlParts.port,
    useHTTPS: urlParts.protocol === 'https:',
    path: urlParts.path,
    method: 'POST',
    sendTimeout: timeOut,
    receiveTimeout: timeOut,
    keepAlive: true,
    compressionEnable: true,
    headers
  }
  let result = null
  try {
    const req = http.request(options)
    req.write(data)
    const response = req.end()
    const status = response.statusCode
    const dataRead = response.read()
    if (status !== 200) {
      result = {
        error: true,
        message: UB.i18n('Помилка отримання даних. Url: "{0}", status: {1}, data: {2}', url, status, dataRead)
      }
    } else {
      try {
        result = JSON.parse(dataRead)
      } catch (err) {
        result = {
          error: true,
          message: UB.i18n('Помилка опрацювання відповіді: "{0}', err.message)
        }
      }
    }
  } catch (error) {
    result = {
      error: true,
      message: UB.i18n('Відсутній зв\'язок з "{0}" або помилка запиту, error: {1}', url, error.message)
    }
  }
  return result
}

me.doImport = function (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams

  const apiConfigJson = UB.Repository('ac_importConfig')
    .attrs('params')
    .where('orgID', '=', mParams.orgID)
    .where('code', '=', 'importStudent')
    .selectScalar() || null
  if (apiConfigJson) {
    const apiConfig = JSON.parse(apiConfigJson) || {}
    if (!apiConfig.url || !apiConfig.userName || !apiConfig.password) {
      throw new UB.UBAbort(`<<<${UB.i18n('Не налаштовано параметри доступу')}>>>`)
    }

    const store = UB.DataStore('hr_importStudentLog')

    let url = apiConfig.url + loginEndpoint
    const authData = {
      userName: apiConfig.userName,
      password: apiConfig.password
    }
    let response = postJson(authData, url, timeout)
    let accessToken = null
    if (response && typeof response === 'object' && !response.error) {
      accessToken = response['access_token']
      const tokenType = response['token_type'] || 'Bearer'
      if (accessToken) {
        const authToken = `${tokenType} ${accessToken}`
        let page = 1
        let isLoad = true
        const params = {
          currentPage: 1,
          pageSize,
          typeStudy: execParams.typeStudy,
          formStudy: execParams.formStudy,
          studentEd: null
        }
        if (execParams.semester && Array.isArray(execParams.semester) && execParams.semester.length) {
          params.semester = execParams.semester.map(o => Number(o))
        }
        if (mParams.mode === 'dismiss') {
          url = apiConfig.url + dismissStudEndpoint
          params.dateFrom = dateService.shiftDate(execParams.dateFrom).toISOString()
          params.dateTo = dateService.shiftDate(execParams.dateTo).toISOString()
        } else {
          url = apiConfig.url + activeStudEndpoint
        }

        const studentData = []
        while (isLoad) {
          response = postJson(params, url, timeout, authToken)
          if (Array.isArray(response)) {
            if (response.length) {
              studentData.push(...response)
              page += 1
              params.currentPage = page
              if (response.length < pageSize) {
                isLoad = false
              }
            } else {
              isLoad = false
            }
          } else {
            isLoad = false
          }
        }
        if (response && typeof response === 'object' && !response.error) {
          mParams.result = importStudentService.importStudData(studentData, mParams.orgID, mParams.mode, execParams, dateService.shiftDate(execParams.dateFromStipend), 'api')
        } else {
          mParams.result = response
        }
      }
    } else {
      store.run('insert', {
        execParams: {
          orgID: mParams.orgID,
          importDate: new Date(),
          params: JSON.stringify(execParams),
          result: JSON.stringify(response),
          resultMessage: response && typeof response === 'object' ? response.message : '',
          type: 'api'
        }
      })
      mParams.result = response
    }
  } else {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутні налаштування імпорту')}>>>`)
  }
}

me.doProcess = function (ctx) {
  const recID = ctx.mParams.recID
  if (recID) {
    const orgID = ctx.mParams.orgID
    const data = storeService.loadDocumentAsString('hr_importStudentLog', 'document', recID)
    const importData = JSON.parse(data)
    if (Array.isArray(importData)) {
      ctx.mParams.result = importStudentService.doImport(importData, orgID)
    }
  }
}

me.checkConfig = function (ctx) {
  const orgID = ctx.mParams.orgID || 0
  ctx.mParams.config = UB.Repository('ac_importConfig')
    .attrs('params')
    .where('orgID', '=', orgID)
    .where('code', '=', 'importStudent')
    .selectScalar() || null
}

me.saveConfig = function (ctx) {
  const execParams = ctx.mParams.execParams
  const orgID = ctx.mParams.orgID
  if (orgID && execParams.url && execParams.username && execParams.password) {
    const config = {
      userName: execParams.username,
      password: execParams.password,
      url: execParams.url
    }
    if (config.url.slice(-1) === '/') {
      config.url = config.url.slice(0, -1)
    }
    const store = UB.DataStore('ac_importConfig')
    const rowID = UB.Repository('ac_importConfig')
      .attrs('ID')
      .where('orgID', '=', orgID)
      .where('code', '=', 'importStudent')
      .selectScalar() || null
    if (rowID) {
      store.run('update', {
        __skipOptimisticLock: true,
        execParams: {
          ID: rowID,
          params: JSON.stringify(config)
        }
      })
    } else {
      store.run('insert', {
        __skipOptimisticLock: true,
        execParams: {
          orgID: orgID,
          code: 'importStudent',
          params: JSON.stringify(config)
        }
      })
    }
  }
}
