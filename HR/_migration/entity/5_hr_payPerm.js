module.exports = [
  {
    entity: 'hr_payPerm',
    notDelete: true,
    notUpdate: true,
    modifyWhere: (conn) => {
      return !conn.Repository('hr_payPerm').attrs(['ID']).misc({ __allowSelectSafeDeleted: true }).limit(1).selectScalar()
    },
    attrsConfig: {
      payElID: { associatedEntity: 'hr_payEl', codeAttr: 'code' }
    },
    identifier: ['payElID'],
    attrs: ['payType', 'payElID'],
    items: [
      ['OFFTAKE', '26'],
      ['OFFTAKE', '27']
    ]
  }
]
