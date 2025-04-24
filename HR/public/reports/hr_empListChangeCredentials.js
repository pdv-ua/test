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
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    const fieldList = ['firstNameOld', 'fullFIO', 'fullFIOOld', 'orderDate', 'firstNameOld', 'taxCode', 'additInform']
    return $App.connection.run({
      entity: 'hr_employeeChange',
      method: 'search',
      fieldList: fieldList,
      organizationID: reportParams.organizationID,
      dateFrom: reportParams.dateFrom,
      dateTo: reportParams.dateTo
    }).then(response => {
      response.useActualPositionName = useActualPositionName
      return me.getAllData(response, reportParams.onDate, reportParams.organizationID)
    })
  },

  getAllData: async function (result, onDate, organizationID, departmentID) {
    result.organizationName = await HR.reportUtils.getNameOrganization(onDate, organizationID)
    return result
  },

  getParams: function (data) {
    const resData = data.resultData.data

    const params = {
      personTable: [],
      colSpan: 6,
      tableWidth: 900,
      period: (data.dateFrom ? UB.i18n(`з {0}`, AC.dateService.formatDate(data.dateFrom)) : '') +
        (data.dateTo ? UB.i18n(` по {0}`, AC.dateService.formatDate(data.dateTo)) : ''),
      organizationName: data.organizationName || ''
    }

    const tableFields = data.resultData.fields
    // set data for personTable
    if (resData.length === 0) {
      for (let i = 1; i < 6; i++) {
        const obj = {}
        obj['pn'] = i
        tableFields.forEach(item => {
          obj[item] = ' '
        })
        params.personTable.push(obj)
      }
    } else {
      let k = 1
      resData.forEach(item => {
        const obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          attr === 'orderDate'
            ? obj[attr] = (item[j] ? AC.dateService.formatDate(item[j]) : '')
            : obj[attr] = item[j]

          j++
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        obj.useActualPositionName = data.useActualPositionName
        params.personTable.push(obj)
        k++
      })
    }
    return AC.reportService.removeEmptyValues(params)
  }

}
