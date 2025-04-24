const http = require('http')
const UB = require('@unitybase/ub')

module.exports = {
  postJson,
  tryPostJson,
  tryPostJsonWithAuth,
  postJsonToUrlList,
  parseUrl,
  getUntransefedPosTypesArray,
  getUntransefedPosTypesStr
}

function postJson (jsonData, url, timeOut) {
  let urlParts = parseUrl(url)

  const options = {
    host: urlParts.host,
    port: urlParts.port,
    useHTTPS: urlParts.protocol === 'https',
    path: urlParts.path,
    method: 'POST',
    sendTimeout: timeOut,
    receiveTimeout: timeOut,
    keepAlive: true,
    compressionEnable: true,
    headers: { 'Content-Type': 'application/json' }
  }
  const req = http.request(options)
  req.write(jsonData)
  const response = req.end()
  return response
}

function tryPostJsonWithAuth (jsonData, url, timeOut, authData) {
  let response
  try {
    let urlParts = parseUrl(url)
    const options = {
      host: urlParts.host,
      path: urlParts.path,
      useHTTPS: urlParts.protocol === 'https',
      sendTimeout: timeOut || 120000,
      receiveTimeout: timeOut || 120000,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'UBIP ' + authData.userLogin }
    }
    const req = http.request(options)
    req.write(jsonData)
    response = req.end()
  } catch (error) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутній зв\'язок з "{0}" або помилка запиту: {1}', url, error.message)}>>>`)
  }
  return response
}

function tryPostJson (jsonData, url, timeOut) {
  let response
  let status = 200
  try {
    response = postJson(jsonData, url, timeOut)
    status = response.statusCode
  } catch (error) {
    throw new UB.UBAbort(`<<<${UB.i18n('Відсутній зв\'язок з "{0}" або помилка запиту: {1}', url, error.message)}>>>`)
  }
  if (status !== 200) {
    throw new UB.UBAbort(`<<<${UB.i18n('Помилка експорту по url "{0}", код відповіді: {1}', url, status)}>>>`)
  }
  return response
}

function postJsonToUrlList (jsonData, configUrl, timeOut) {
  const responses = []
  const urls = configUrl.split(';')
  urls.forEach(url => {
    let response = tryPostJson(jsonData, url, timeOut)
    responses.push(response)
  })
  return responses
}

function parseUrl (url) {
  const expr = /(https?):\/\/([0-9A-Za-z-.@%_~#]+)(:[0-9]+)?\/(.*)/gi
  let regex = new RegExp(expr)
  let groups = regex.exec(url)
  let res = groups && groups.length === 5 && {
    protocol: groups[1],
    host: groups[2],
    port: groups[3],
    path: groups[4]
  }
  if (res.port) {
    res.port = res.port.replace(':', '')
  }
  return res || {}
}

function getUntransefedPosTypesArray () {
  let resStr = UB.Repository('ac_settings')
    .attrs(['value'])
    .where('constantID.code', '=', 'hrExportCfgUntransferedPosTypes')
    .selectScalar() || '0'
  let res = resStr.split(',')
  for (let i = 0; i < res.length; i++) {
    res[i] = res[i].trim()
  }
  return res
}

function getUntransefedPosTypesStr () {
  let resArr = getUntransefedPosTypesArray()
  for (let i = 0; i < resArr.length; i++) {
    let item = resArr[i]
    let fChar = item.charAt(0)
    if (fChar !== `'`) {
      resArr[i] = `'${item}'`
    }
  }
  return resArr
}
