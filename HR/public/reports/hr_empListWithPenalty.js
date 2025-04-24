/* global $App AC HR */

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
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID)
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    const fieldList = ['fullFIO', 'sexType', 'posCategory', 'rankCur', 'posName', 'depName', 'depFirst', 'depID', 'orgName',
      'dictPenaltyReasonName', 'dictPenaltyName', 'docIssuedDate', 'dateClosed', 'appealDate']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')

    return $App.connection.run({
      entity: 'hr_empListWithPenalty',
      method: 'search',
      fieldList: fieldList,
      ...reportParams
    }).then(response => {
      response.showAddDescrPerson = showAddDescrPerson
      response.useActualPositionName = useActualPositionName
      return me.getAllData(response, reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    })
  },

  getAllData: async function (result, onDate, organizationID, departmentID) {
    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, organizationID, departmentID)
    return result
  },

  getParams: function (data) {
    let resData = data.resultData.data

    const params = {
      penaltyTable: [],
      showAddDescrPerson: data.showAddDescrPerson,
      useActualPositionName: data.useActualPositionName,
      colSpan: 13 + (data.showAddDescrPerson ? 1 : 0) + (data.useActualPositionName ? 1 : 0),
      tableWidth: 1530 + (data.showAddDescrPerson ? 200 : 0) + (data.useActualPositionName ? 200 : 0),
      dateFrom: data.onDate ? AC.dateService.formatDate(data.dateFrom) : '',
      onDate: data.onDate ? AC.dateService.formatDate(data.onDate) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || ''
    }

    let tableFields = data.resultData.fields

    // set fields names
    /*
    data.resultData.fields.forEach(item => {
      params[item] = item
    })
     */

    if (resData) {
      resData.forEach((item, k) => {
        let obj = {}
        obj['pn'] = k + 1
        tableFields.forEach((attr, j) => {
          attr === 'docIssuedDate' || attr === 'dateClosed' || attr === 'appealDate' ? obj[attr] = AC.dateService.formatDate(item[j])
            : attr === 'fullFIO' ? obj[attr] = item[j] ? item[j].trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : ''
              : obj[attr] = item[j]
          if (attr === 'depName') obj['depName'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depName'])
          if (attr === 'depFirst') obj['depFirst'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depFirst'])
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        obj.useActualPositionName = data.useActualPositionName
        params.penaltyTable.push(obj)
      })
    }
    return AC.reportService.removeEmptyValues(params)
  }

}
