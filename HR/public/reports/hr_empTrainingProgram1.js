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
      employeeName1: '',
      employeeName2: '',
      items: []
    }

    const trainingProgramQ = await $App.connection.run({
      entity: 'hr_empTrainingProgram',
      method: 'selectDataByID',
      trainingID,
      onDate
    })
    const trainingProgram = JSON.parse(trainingProgramQ.resultData)[0]

    result.orgName = me.makeNames(trainingProgram.orgName, [50, 80, 80, 80, 80, 80])
    result.positionName = me.makeNames(trainingProgram.positionName, [50, 80, 80, 80, 80, 80])

    if (trainingProgram.employeeName) {
      const arr = HR.reportUtils.getSliceStrArr(trainingProgram.employeeName, [50])
      result.employeeName1 = arr.length ? arr[0] || '' : ''
      result.employeeName2 = arr.length > 1 ? arr[1] || '' : ''
    }

    const trainingProgramDet = await UB.Repository('hr_empTrainingProgramDet')
      .attrs(['ID', 'itemIdx', 'dictProfCompetencyID.name', 'dictTrainingFormID.name', 'dictTrainingTopicID.name', 'comment'])
      .where('empTrainingProgramID', '=', trainingID)
      .orderBy('itemIdx')
      .selectAsObject()

    trainingProgramDet.forEach(item => {
      result.items.push({
        itemIdx: item.itemIdx,
        dictProfCompetency: item['dictProfCompetencyID.name'],
        dictTrainingForm: item['dictTrainingFormID.name'],
        dictTrainingTopic: item['dictTrainingTopicID.name'],
        comment: item['comment']
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
