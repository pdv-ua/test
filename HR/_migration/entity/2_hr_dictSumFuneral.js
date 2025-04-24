module.exports = [
  {
    entity: 'hr_dictSumFuneral',
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_dictSumFuneral').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    identifier: ['dateFromEmpty'],
    attrs: ['dateFromEmpty', 'dateToEmpty', 'suma'],
    items: [
      ['2012-01-01T00:00:00Z', '2017-02-28T00:00:00Z', 2200],
      ['2017-03-01T00:00:00Z', null, 4100]
    ]
  }
]
