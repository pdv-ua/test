const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.on('insert:before', beforeInsert)
me.on('delete:before', beforeDelete)
me.on('insert:after', afterInsert)

function beforeInsert (ctx) {
  const execParams = ctx.mParams.execParams
  if (!execParams.orderN) {
    execParams.orderN = (UB.Repository(__entityName)
      .attrs('MAX([orderN])')
      .where('groupReportID', '=', execParams.groupReportID)
      .selectScalar() || 0) + 1
  }
}

function afterInsert (ctx) {
  const execParams = ctx.mParams.execParams

  const reportParamCode = UB.Repository('hr_dictReportParam')
    .attrs('reportCode')
    .where('dictReportID', '=', execParams.dictReportID)
    .selectAsArrayOfValues()

  if (reportParamCode.length) {
    const storeRepParam = UB.DataStore('hr_reportParam')
    const storeDtParam = UB.DataStore('hr_groupReportParam')
    reportParamCode.forEach(reportCode => {
      const reportParam = UB.Repository('hr_reportParam')
        .attrs('listParamID')
        .where('reportCode', '=', reportCode)
        .selectAsObject()
      reportParam.forEach(param => {
        const reportParamID = storeRepParam.generateID()
        storeRepParam.run('insert', {
          execParams: {
            ID: reportParamID,
            reportCode: `${reportCode}_${execParams.ID}`,
            listParamID: param['listParamID']
          }
        })
        storeDtParam.run('insert', {
          execParams: {
            reportParamID: reportParamID,
            groupReportDtID: execParams.ID
          }
        })
      })
    })
  }
}

function beforeDelete (ctx) {
  const storeParam = UB.DataStore('hr_reportParam')
  const storeDtParam = UB.DataStore('hr_groupReportParam')
  const listParam = UB.Repository('hr_groupReportParam')
    .attrs('ID', 'reportParamID')
    .where('groupReportDtID', '=', ctx.mParams.execParams.ID)
    .selectAsObject()
  listParam.forEach(row => {
    storeDtParam.run('delete', {
      execParams: {
        ID: row['ID']
      }
    })
    storeParam.run('delete', {
      execParams: {
        ID: row['reportParamID']
      }
    })
  })
}
