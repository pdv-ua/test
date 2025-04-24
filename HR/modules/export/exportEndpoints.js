// const queryString = require('querystring')
const UB = require('@unitybase/ub')
const App = UB.App
const expPosContest = require('./posContest')
const publicData = require('./publicData')

function initEndpoints () {
  App.registerEndpoint('getPosContest', (req, resp) => {
    const srcPrm = req.read()
    const params = JSON.parse(srcPrm)
    const resultData = expPosContest.exportPosContest({
      onDate: params.onDate,
      createDateFrom: params.createDateFrom,
      createDateTo: params.createDateTo,
      states: params.states
    })
    resp.statusCode = 200
    resp.writeHead('Content-Type: application/json;charset=UTF-8')
    resp.writeEnd(resultData)
  }, false)

  App.registerEndpoint('getOrgStructure', (req, resp) => {
    const srcPrm = req.read()
    const params = JSON.parse(srcPrm)
    const resultData = publicData.getOrgStructure(params.onDate, params.edrpou)
    resp.statusCode = 200
    resp.writeHead('Content-Type: application/json;charset=UTF-8')
    resp.writeEnd(resultData)
  }, true)
}

exports.initEndpoints = initEndpoints
