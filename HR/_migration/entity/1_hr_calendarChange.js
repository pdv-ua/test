module.exports = [
  {
    entity: 'hr_calendarChange',
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_calendarChange').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['changeDateFrom', 'changeDateTo'],
    attrs: ['changeDateFrom', 'changeDateTo'],
    items: [
    ]
  }
]
