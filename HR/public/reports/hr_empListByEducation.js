/* global $App AC UB */

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getData(reportParams).then(data => {
      return AC.reportService.generateReport(me.getParams(data), me)
    })
  },

  getData (reportParams) {
    const me = this
    return $App.connection.run({
      entity: 'hr_empListByEducation',
      method: 'search',
      fieldList: ['firstName', 'lastName', 'middleName', 'sexType', 'posCategory', 'rankCur', 'posName', 'depTree', 'depFirst',
        'dictEducationLevelName', 'dictSpecialtyName', 'qualification', 'dictDegreeName', 'docSeries', 'docNumber', 'dateIssue', 'educationName'],
      orgID: reportParams.orgID,
      onDate: reportParams.onDate,
      dictEducationLevelID: reportParams.dictEducationLevelID
    }).then(response => {
      return me.getAllData(response, reportParams.orgID)
    })
  },

  getAllData: async function (result, orgID) {
    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName'])
      .where('mi_data_id', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .selectScalar()
    result.orgName = orgName

    return result
  },

  getParams: function (data) {
    let resData = data.resultData.data
    const params = {
      resultTable: [],
      onDate: data.onDate ? AC.dateService.formatDate(data.onDate) : '',
      org: data.orgName || ''
    }

    let tableFields = data.resultData.fields

    // set fields names
    data.resultData.fields.forEach(item => {
      params[item] = item
    })

    if (resData) {
      resData.forEach((item, k) => {
        let obj = {}
        obj['pn'] = k + 1
        tableFields.forEach((attr, j) => {
          if (attr === 'dateIssue') {
            obj[attr] = item[j] ? AC.dateService.formatDate(item[j]) : ''
          } else if (attr === 'lastName') {
            obj[attr] = item[j] ? item[j].toUpperCase() : ''
          } else {
            obj[attr] = item[j]
          }
        })

        obj.fullName = `${obj.lastName || ''} ${obj.firstName || ''} ${obj.middleName || ''}`
        obj.docInfo = `${obj.docSeries || ''} ${obj.docNumber || ''} ${(obj.dateIssue || obj.docNumber ? 'від' : '')} ${obj.dateIssue}`

        params.resultTable.push(obj)
      })
    }
    return AC.reportService.removeEmptyValues(params)
  }

}
