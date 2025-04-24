/* global UB AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    // const pDate = appAC.globalApplicationDate()
    const assessmentResultID = reportParams.instanceID
    const result = {
      year: '',
      orgName: '',
      positionName: '',
      positionCategory1: '',
      positionCategory2: '',
      positionCategoryA: '',
      employeeName: '',
      departmentName: '',
      departmentName2: '',
      taskType1: '',
      taskType2: '',
      assessmentValue1: '',
      assessmentValue2: '',
      assessmentValue3: '',
      assessmentDescription: '',
      b1: '',
      b2: '',
      b3: '',
      b4: '',
      b5: '',
      b6: '',
      b7: '',
      v1: '',
      v2: '',
      v3: '',
      v4: '',
      v5: '',
      v6: '',
      v7: '',
      tasks: []
    }

    const requestData = await UB.Repository('hr_empAssessmentResult')
      .attrs(['organizationID.name', 'assessmentID.employeeID.fullFIO', 'assessmentID.positionID.name', 'comment',
        'assessmentID.positionID.psCategory', 'assessmentID.departmentID.name', 'assessmentID.departmentID',
        'assessmentValue', 'assessmentDescription', 'dictCompetencyID', 'avgValue', 'assessmentID', 'assessmentID.year'])
      .selectById(assessmentResultID)

    result.year = requestData['assessmentID.year'] || '____'
    result.orgName = requestData['organizationID.name'] || ''
    result.employeeName = requestData['assessmentID.employeeID.fullFIO'] || ''
    result.positionName = requestData['assessmentID.positionID.name'] || ''
    result.positionCategory1 = (requestData['assessmentID.positionID.psCategory'] || '0') === '2' ? 'x' : ''
    result.positionCategory2 = (requestData['assessmentID.positionID.psCategory'] || '0') === '3' ? 'x' : ''
    result.positionCategoryA = (requestData['assessmentID.positionID.psCategory'] || '0') === '1' ? 'x' : ''
    result.departmentName = requestData['assessmentID.departmentID.name'] || ''
    result.departmentName2 = ''
    result.assessmentValue1 = (requestData['assessmentValue'] || '') === 'PERFECT' ? 'x' : ''
    result.assessmentValue2 = (requestData['assessmentValue'] || '') === 'POSITIVE' ? 'x' : ''
    result.assessmentValue3 = (requestData['assessmentValue'] || '') === 'NEGATIVE' ? 'x' : ''
    result.assessmentDescription = requestData['assessmentDescription'] || ''
    result.avgValue = requestData['avgValue'] ? HR.reportUtils.formatAsCurrencyStr(requestData['avgValue'], 2) : ''

    if (requestData['dictCompetencyID']) {
      const val = requestData['dictCompetencyID'].split(',')
      const dictCompetency = await UB.Repository('hr_dictCompetency')
        .attrs(['code', 'psCategory'])
        .whereIf(val.length === 1, 'ID', '=', val[0])
        .whereIf(val.length > 1, 'ID', 'in', val)
        .selectAsObject()
      dictCompetency.forEach(item => {
        if ((item.psCategory || '0') === '2' && (item.code || '0') === '1') result.b1 = 'x'
        if ((item.psCategory || '0') === '3' && (item.code || '0') === '2') result.v1 = 'x'

        if ((item.psCategory || '0') === '2' && (item.code || '0') === '3') result.b2 = 'x'
        if ((item.psCategory || '0') === '3' && (item.code || '0') === '4') result.v2 = 'x'

        if ((item.psCategory || '0') === '2' && (item.code || '0') === '5') result.b3 = 'x'
        if ((item.psCategory || '0') === '3' && (item.code || '0') === '6') result.v3 = 'x'

        if ((item.psCategory || '0') === '2' && (item.code || '0') === '7') result.b4 = 'x'
        if ((item.psCategory || '0') === '3' && (item.code || '0') === '8') result.v4 = 'x'

        if ((item.psCategory || '0') === '2' && (item.code || '0') === '9') result.b5 = 'x'
        if ((item.psCategory || '0') === '3' && (item.code || '0') === '10') result.v5 = 'x'

        if ((item.psCategory || '0') === '2' && (item.code || '0') === '11') result.b6 = 'x'
        if ((item.psCategory || '0') === '3' && (item.code || '0') === '12') result.v6 = 'x'

        if ((item.psCategory || '0') === '2' && (item.code || '0') === '13') result.b7 = 'x'
        if ((item.psCategory || '0') === '3' && (item.code || '0') === '15') result.v7 = 'x'
      })
    }
    const requestTask = await UB.Repository('hr_empAssessmentTask')
      .attrs(['number', 'doneDate', 'resultDescription', 'dictTaskScoreID.score', 'resultComment', 'taskText'])
      .where('empAssessmentID', '=', requestData.assessmentID)
      .orderBy('number')
      .selectAsObject()

    requestTask.forEach(item => {
      result.tasks.push({
        number: item.number,
        taskComment: item['resultComment'] || item['taskText'] || '',
        doneDate: item.doneDate ? AC.dateService.formatDate(item.doneDate) : '',
        score: item['dictTaskScoreID.score'] || '',
        resultDescription: item.resultDescription || ''
      })
    })
    return result
  }
}
