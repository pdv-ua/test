/* global $App AC UB HR */

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
      entity: 'hr_empListRank',
      method: 'search',
      fieldList: ['employeeID', 'tabNum', 'taxCode', 'posCategory', 'rankCur', 'addDescrPerson', 'dismDate', 'rankComment',
        'rankDateFrom', 'rankDateNext', 'sexType', 'posName', 'depName', 'ID', 'depTree', 'depFirst', 'orgName', 'fullFIO', 'rankNext'],
      ...reportParams
    }).then(response => {
      // return (response)
      return me.getAllData(response, reportParams.onDate, reportParams.organizationID, reportParams.departmentID)
    })
  },

  getAllData: async function (result, onDate, organizationID, departmentID) {
    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, organizationID)
    result.departmentName = await HR.reportUtils.getNameDepartment(onDate, organizationID, departmentID)
    result.showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', organizationID)
    return result
  },

  getParams: function (data) {
    let resData = data.resultData.data

    const params = {
      listName: data.rankGroup === 'AR' ? UB.i18n(`мають дiючий ранг`)
        : data.rankGroup === 'PR' ? UB.i18n(`присвоєно ранг`)
          : data.rankGroup === 'NR' ? UB.i18n(`присвоєння чергового рангу`) : '',
      showNextRank: data.showNextRank,
      showAddDescrPerson: data.showAddDescrPerson,
      colSpan: data.showAddDescrPerson ? 13 : 12,
      tableWidth: data.showAddDescrPerson ? 1950 : 1750,
      rankTable: [],
      period: data.rankGroup !== 'AR' && data.dateFrom && data.dateTo ? UB.i18n(`за перiод з {0} по {1}`, AC.dateService.formatDate(data.dateFrom), AC.dateService.formatDate(data.dateTo)) : '',
      onDate: data.onDate ? AC.dateService.formatDate(data.onDate) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || ''
    }

    if (params.showNextRank) {
      params.colSpan++
    }

    let tableFields = data.resultData.fields

    // set fields names
    /*
    data.resultData.fields.forEach(item => {
      params[item] = item
    })
     */

    // set data for rankTable
    if (!resData) {
      for (let i = 1; i < 6; i++) {
        let obj = {}
        obj['pn'] = i
        tableFields.forEach(item => {
          obj[item] = ' '
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        obj.hideNextRank = data.hideNextRank
        params.rankTable.push(obj)
      }
    } else {
      let k = 1
      resData.forEach(item => {
        let obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          attr === 'rankDateFrom' || attr === 'rankDateNext' || attr === 'dateFrom' || attr === 'dateNext' || attr === 'dismDate'
            ? obj[attr] = AC.dateService.formatDate(item[j])
            : attr === 'fullFIO'
              ? obj[attr] = item[j] ? item[j].trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : ''
              : obj[attr] = item[j]
          if (attr === 'depName') obj['depName'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depName'])
          if (attr === 'depFirst') obj['depFirst'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['depFirst'])
          j++
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        obj.showNextRank = data.showNextRank
        obj['rankDateFrom'] = obj['rankDateFrom'] || obj['dateFrom']
        obj['rankDateNext'] = obj['rankDateNext'] || obj['dateNext']
        params.rankTable.push(obj)
        k++
      })
    }
    return AC.reportService.removeEmptyValues(params)
  }

}
