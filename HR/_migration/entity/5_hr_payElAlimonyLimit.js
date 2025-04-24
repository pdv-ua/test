module.exports = [
  {
    entity: 'hr_payElAlimonyLimit',
    identifier: ['payElID', 'dateFrom'],
    notUpdate: true,
    notDelete: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_payElAlimonyLimit').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      payElID: { associatedEntity: 'hr_payEl', codeAttr: 'code' }
    },
    attrs: ['payElID', 'dateFrom', 'coefficientMin', 'coefficientMax'],
    items: [
      ['31', '2016-10-05T00:00:00Z', 0.5, 10]
    ]
  }
]
