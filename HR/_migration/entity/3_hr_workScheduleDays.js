module.exports = [
  {
    entity: 'hr_workScheduleDays',
    notDelete: true,
    notUpdate: true,
    identifier: ['numDay'],
    // localeAttr: ['dictTimeCostID'],
    modifyWhere: (conn) => {
      return !conn.Repository('hr_workScheduleDays').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      workScheduleID: { associatedEntity: 'hr_workSchedule', codeAttr: 'code' },
      dictTimeCostID: { associatedEntity: 'hr_dictTimeCost', codeAttr: 'code' }
    },
    attrs: ['workScheduleID', 'numDay', 'dictTimeCostID', 'hoursWork', 'hoursWorkNight', 'hoursWorkEvening', 'hoursWorkHarm', 'hoursWorkDop'],
    items: [
      ['Std', 1, 'РбДн', 8, 0, 0, 0, 0],
      ['Std', 2, 'РбДн', 8, 0, 0, 0, 0],
      ['Std', 3, 'РбДн', 8, 0, 0, 0, 0],
      ['Std', 4, 'РбДн', 8, 0, 0, 0, 0],
      ['Std', 5, 'РбДн', 8, 0, 0, 0, 0],
      ['Std', 6, 'Вих', 0, 0, 0, 0, 0],
      ['Std', 7, 'Вих', 0, 0, 0, 0, 0]
    ]
  }
]
