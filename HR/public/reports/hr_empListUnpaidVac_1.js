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
    const showAddDescrPerson = AC.settings.get('hrShowAddDescrPerson', reportParams.organizationID) === true
    const useActualPositionName = AC.settings.get('hrOrderActualPositionName', reportParams.organizationID) === true
    const fieldList = ['tabNum', 'fullFIO', 'posName', 'dictVacationKindName', 'dayCount', 'workPlace', 'orgName',
      'vdateFrom', 'vdateTo', 'vacDescription', 'selfStructDepName', 'depID']
    if (showAddDescrPerson) fieldList.push('addDescrPerson')
    if (useActualPositionName) fieldList.push('actualPositionName')
    return $App.connection.run({
      entity: 'hr_empListUnpaidVac',
      method: 'search',
      fieldList: fieldList,
      organizationID: reportParams.organizationID,
      includeChildOrgs: reportParams.includeChildOrgs,
      departmentID: reportParams.departmentID,
      includeChildDepts: reportParams.includeChildDepts,
      onDate: reportParams.onDate,
      dateFrom: reportParams.dateFrom,
      dateTo: reportParams.dateTo,
      workPlace: reportParams.workPlace,
      fullPosName: reportParams.fullPosName
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
    const resData = data.resultData.data

    const params = {
      personTable: [],
      showAddDescrPerson: data.showAddDescrPerson,
      useActualPositionName: data.useActualPositionName,
      colSpan: 12 + (data.showAddDescrPerson ? 1 : 0) + (data.useActualPositionName ? 1 : 0),
      colSpan2: 11 + (data.showAddDescrPerson ? 1 : 0) + (data.useActualPositionName ? 1 : 0),
      tableWidth: 1500 + (data.showAddDescrPerson ? 200 : 0) + (data.useActualPositionName ? 200 : 0),
      period: data.dateFrom && data.dateTo ? UB.i18n(`з {0} по {1}`, AC.dateService.formatDate(data.dateFrom), AC.dateService.formatDate(data.dateTo)) : '',
      onDate: data.onDate ? AC.dateService.formatDate(data.onDate) : '',
      organizationName: data.organizationName || '',
      departmentName: data.departmentName || '',
      daySum: 0
    }

    const tableFields = data.resultData.fields

    // set fields names
    /*
    data.resultData.fields.forEach(item => {
      params[item] = item
    })
     */

    // set data for personTable
    if (resData.length === 0) {
      for (let i = 1; i < 6; i++) {
        const obj = {}
        obj['pn'] = i
        tableFields.forEach(item => {
          obj[item] = ' '
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        params.personTable.push(obj)
      }
      params.daySum = '0'
    } else {
      let k = 1
      resData.forEach(item => {
        const obj = {}
        let j = 0
        obj['pn'] = k
        tableFields.forEach(attr => {
          attr === 'vdateFrom' || attr === 'vdateTo' ? obj[attr] = (item[j] ? AC.dateService.formatDate(item[j]) : '')
            : attr === 'fullFIO' ? obj[attr] = item[j] ? item[j].trim().replace(/^(.*?)\s(.*)/g, (match, p1, p2) => [p1.toUpperCase(), p2].join(' ')) : ''
              : obj[attr] = item[j]

          if (attr === 'selfStructDepName') obj['selfStructDepName'] = HR.reportUtils.getReportDepStructFld(obj['depID'], obj['selfStructDepName'])
          if (attr === 'dayCount') params.daySum += item[j]
          j++
        })
        obj.showAddDescrPerson = data.showAddDescrPerson
        params.personTable.push(obj)
        k++
      })

      if (params.daySum === 0) params.daySum = '0'
    }
    return AC.reportService.removeEmptyValues(params)
  }

}
