module.exports = [
  {
    entity: 'hr_calendarHoliday',
    notUpdate: true,
    localeAttr: ['name'],
    notDelete: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_calendarHoliday').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      monthHoliday: { associatedEntity: 'ac_dictMonth', codeAttr: 'code' }
    },
    identifier: ['name', 'dayHoliday', 'monthHoliday', 'yearHoliday'],
    attrs: ['name', 'dayHoliday', 'monthHoliday', 'yearHoliday', 'shortDay', 'dateFromEmpty', 'dateToEmpty'],
    items: [
      [ 'Новий рік', 1, '1', null, 1, null, null ],
      [ 'Різдво Христове', 7, '1', null, 1, null, null ],
      [ 'Міжнародний жіночий день', 8, '3', null, 1, null, null ],
      [ 'День праці', 1, '5', null, 1, null, null ],
      [ 'День праці', 2, '5', null, 1, null, '2017-05-02T00:00:00Z' ],
      [ 'День перемоги', 9, '5', null, 1, null, null ],
      [ 'День Конституції України', 28, '6', null, 1, null, null ],
      [ 'День незалежності України', 24, '8', null, 1, null, null ],
      [ 'День захисника України', 14, '10', null, 1, '2015-10-01T00:00:00Z', null ],
      [ 'Різдво Христове (католицьке)', 25, '12', null, 1, '2019-12-01T00:00:00Z', null ],
      [ 'Великдень', 16, '4', 2017, 1, null, null ],
      [ 'Трійця', 4, '6', 2017, 1, null, null ],
      [ 'Великдень', 8, '4', 2018, 1, null, null ],
      [ 'Трійця', 27, '5', 2018, 1, null, null ],
      [ 'Великдень', 28, '4', 2019, 1, null, null ],
      [ 'Трійця', 16, '6', 2019, 1, null, null ],
      [ 'Великдень', 19, '4', 2020, 1, null, null ],
      [ 'Трійця', 7, '6', 2020, 1, null, null ]
    ]
  }
]
