/* global UB AC _ HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    // const onDate = appAC.globalApplicationDate()
    const assessmentID = reportParams.instanceID
    const result = {
      periodName: '',
      orgName: '',
      orgNames: [],
      positionName: '',
      positionCategory1: '',
      positionCategory2: '',
      employeeName: '',
      departmentName: '',
      departmentNames: [],
      departmentName2: '',
      departmentNames2: [],
      taskType1: '',
      taskType2: '',
      period1: '',
      period2: '',
      period3: '',
      tasks: [],
      positionSecretary: null,
      positionCategoryBV: 1,
      positionCategoryA: null
    }

    let requestData = await UB.Repository('hr_empAssessment')
      .attrs(['periodTypeID.code', 'periodTypeID', 'year', 'organizationID', 'organizationID.name', 'employeeID.fullFIO',
        'positionID.name', 'positionID.psCategory', 'departmentID.name', 'departmentID', 'assessmentTaskType'])
      .selectById(assessmentID)

    const period = requestData['periodTypeID.code'] || 0
    switch (period) {
      case 4:
        result.period1 = 'x'
        result.periodName = UB.i18n('січень - березень')
        break
      case 8:
        result.period2 = 'x'
        result.periodName = UB.i18n('квітень - червень')
        break
      case 13:
        result.period3 = 'x'
        result.periodName = UB.i18n('липень - вересень')
        break
      case 16:
        result.periodName = UB.i18n('жовтень - грудень')
        break
    }

    result.periodName += ' ' + (requestData['year'] || '')
    result.orgName = requestData['organizationID.name'] || ''
    if (result.orgName.length > 50) {
      const arr = HR.reportUtils.getSliceStrArr(result.orgName, [45, 85, 85, 85])
      result.orgName = arr.length ? arr[0] || '' : ''
      for (let k = 1; k < 3; k++) {
        if (arr.length > k && arr[k]) {
          result.orgNames.push({ name: arr[k] })
        }
      }
    }

    result.employeeName = requestData['employeeID.fullFIO'] || ''
    result.positionName = requestData['positionID.name'] || ''
    result.departmentName = requestData['departmentID.name'] || ''
    if (result.departmentName.length > 50) {
      const arr = HR.reportUtils.getSliceStrArr(result.departmentName, [45, 85, 85, 85])
      result.departmentName = arr.length ? arr[0] || '' : ''
      for (let k = 1; k < 3; k++) {
        if (arr.length > k && arr[k]) {
          result.departmentNames.push({ name: arr[k] })
        }
      }
    }

    result.taskType1 = (requestData['assessmentTaskType'] || '') === 'NEW' ? 'x' : ''
    result.taskType2 = (requestData['assessmentTaskType'] || '') === 'REVIEW' ? 'x' : ''

    if ((requestData['positionID.name'] || '').toLowerCase() === UB.i18n('державний секретар')) {
      result.positionSecretary = 1
    } else {
      result.positionCategory1 = (requestData['positionID.psCategory'] || '0') === '2' ? 'x' : ''
      result.positionCategory2 = (requestData['positionID.psCategory'] || '0') === '3' ? 'x' : ''
      result.positionCategoryA = (requestData['positionID.psCategory'] || '0') === '1' ? 1 : null
    }
    result.positionCategoryBV = result.positionSecretary || result.positionCategoryA ? null : 1

    if (requestData.departmentID && result.positionCategoryBV) {
      result.departmentName2 = await HR.reportUtils.getDepartmentStructName([requestData.departmentID], requestData.organizationID)
      result.departmentName2 = result.departmentName2[requestData.departmentID] ? result.departmentName2[requestData.departmentID].name || '' : ''
      if (result.departmentName2.length > 50) {
        const arr = HR.reportUtils.getSliceStrArr(result.departmentName2, [45, 85, 85, 85])
        result.departmentName2 = arr.length ? arr[0] || '' : ''
        for (let k = 1; k < 3; k++) {
          if (arr.length > k && arr[k]) {
            result.departmentNames2.push({ name: arr[k] })
          }
        }
      }
    }

    requestData = await UB.Repository('hr_empAssessmentTask')
      .attrs(['ID', 'number', 'taskText', 'deadlineDate'])
      .where('empAssessmentID', '=', assessmentID)
      .orderBy('number')
      .selectAsObject()

    let valueData = await UB.Repository('hr_empAssessmentTaskValue')
      .attrs(['empAssessmentTaskID', 'valueText', 'deadlineDate'])
      .where('empAssessmentTaskID.empAssessmentID', '=', assessmentID)
      .orderBy('number')
      .selectAsObject()
    valueData = valueData ? _.groupBy(valueData, 'empAssessmentTaskID') : []

    const borderTRL =
        'border-top-width: 1px; border-top-style: solid; ' +
        'border-right-width: 1px; border-right-style: solid; ' +
        'border-left-width: 1px; border-left-style: solid;'
    const borderBRL =
        'border-bottom-width: 1px; border-bottom-style: solid; ' +
        'border-right-width: 1px; border-right-style: solid; ' +
        'border-left-width: 1px; border-left-style: solid;'
    const borderRL =
        'border-right-width: 1px; border-right-style: solid; ' +
        'border-left-width: 1px; border-left-style: solid;'
    requestData.forEach((item, index) => {
      result.tasks.push({
        number: item.number,
        taskText: item['taskText'],
        border: valueData[item.ID] && valueData[item.ID].length > 1 ? borderTRL : 'border: 1px solid;',
        valueText: valueData[item.ID] && valueData[item.ID].length > 0 ? valueData[item.ID][0].valueText : '',
        deadlineDate: valueData[item.ID] && valueData[item.ID].length > 0 && valueData[item.ID][0].deadlineDate ? AC.dateService.formatDate(valueData[item.ID][0].deadlineDate) : '',
        isChange: valueData[item.ID] && valueData[item.ID].length > 0 ? UB.i18n('Ні') : ''
      })
      if (valueData[item.ID] && valueData[item.ID].length > 1) {
        for (let k = 1; k < valueData[item.ID].length; k++) {
          result.tasks.push({
            number: '',
            taskText: '',
            border: index === requestData.length - 1 && k === valueData[item.ID].length - 1 ? borderBRL : borderRL,
            valueText: valueData[item.ID][k].valueText || '',
            deadlineDate: valueData[item.ID][k].deadlineDate ? AC.dateService.formatDate(valueData[item.ID][k].deadlineDate) : '',
            isChange: UB.i18n('Ні')
          })
        }
      }
    })
    return result
  }
}
