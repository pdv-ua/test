/* global appAC UB $App AC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    reportParams = (typeof reportParams === 'string') ? JSON.parse(reportParams) : reportParams
    return me.getReportData(reportParams.caller).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },

  getReportData: async function (reportParams) {
    const me = this
    const onDate = appAC.globalApplicationDate()
    const trainingID = reportParams.instanceID
    const result = {
      year: onDate.getFullYear(),
      orgName: {
        text: '',
        array: []
      },
      positionName: {
        text: '',
        array: []
      },
      positionCategory1: '',
      positionCategory2: '',
      employeeName1: '',
      employeeName2: '',
      departmentName: {
        text: '',
        array: []
      },
      departmentName2: {
        text: '',
        array: []
      },
      items: []
    }

    const trainingProgramQ = await $App.connection.run({
      entity: 'hr_empTrainingProgram',
      method: 'selectDataByID',
      trainingID,
      onDate
    })
    const trainingProgram = JSON.parse(trainingProgramQ.resultData)[0]

    result.positionCategory1 = (trainingProgram.psCategory || '0') === '2' ? 'x' : ''
    result.positionCategory2 = (trainingProgram.psCategory || '0') === '3' ? 'x' : ''
    if (trainingProgram.employeeName) {
      const arr = HR.reportUtils.getSliceStrArr(trainingProgram.employeeName, [35])
      result.employeeName1 = arr.length ? arr[0] || '' : ''
      result.employeeName2 = arr.length > 1 ? arr[1] || '' : ''
    }

    result.orgName = me.makeNames(trainingProgram.orgName, [50, 80, 80, 80, 80, 80])
    result.positionName = me.makeNames(trainingProgram.positionName, [result.employeeName2 ? 80 : 40, 80, 80, 80, 80, 80])
    result.departmentName = me.makeNames(trainingProgram.departmentName, [40, 80, 80, 80, 80, 80])
    let structDepName = ''
    if (trainingProgram.departmentID) {
      structDepName = await HR.reportUtils.getDepartmentStructName([trainingProgram.departmentID], trainingProgram.organizationID)
      structDepName = structDepName[trainingProgram.departmentID] ? structDepName[trainingProgram.departmentID].name || '' : ''
    }

    result.departmentName2 = me.makeNames(structDepName, [30, 80, 80, 80, 80, 80])
    // result.departmentName2 = me.makeNames(trainingProgram.structDepName, [30, 80, 80, 80, 80, 80])

    const trainingProgramDet = await UB.Repository('hr_empTrainingProgramDet')
      .attrs(['ID', 'itemIdx', 'dictProfCompetencyID.name', 'dictTrainingFormID.name', 'dictTrainingTopicID.name', 'comment'])
      .where('empTrainingProgramID', '=', trainingID)
      .orderBy('itemIdx')
      .selectAsObject()

    trainingProgramDet.forEach(item => {
      result.items.push({
        itemIdx: item.itemIdx,
        dictProfCompetency: item['dictProfCompetencyID.name'] || '',
        dictTrainingForm: item['dictTrainingFormID.name'] || '',
        dictTrainingTopic: item['dictTrainingTopicID.name'] || '',
        comment: item['comment'] || ''
      })
    })

    return result
  },
  makeNames: function (name, array) {
    const result = {
      text: '',
      array: []
    }
    if (name) {
      const arr = HR.reportUtils.getSliceStrArr(name, array)
      if (arr.length) {
        result.text = arr[0] || ''
        for (let i = 1; i < arr.length; i++) {
          if (arr[i] && arr[i].length) {
            result.array.push({ text: arr[i] || '' })
          }
        }
      }
    }
    result.array = result.array.length ? result.array : null
    return result
  }
}
