module.exports = [
  {
    entity: 'hr_repSetElement',
    identifier: ['repSetParamID', 'elementSetTypeID', 'elementID'],
    notDelete: true,
    notUpdate: true,
    attrsConfig: {
      repSetParamID: { associatedEntity: 'hr_repSetParam', codeAttr: 'code' },
      elementSetTypeID: { associatedEntity: 'hr_elementSetType', codeAttr: 'code' },
      elementID: { associatedEntity: 'hr_payEl', codeAttr: 'code' }
    },
    attrs: ['repSetParamID', 'elementSetTypeID', 'elementID', 'elementInfo', 'dateFrom', 'dateTo'],
    items: [
      [ 'FOP_BASE', 'hr_payEl', '1', null, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ],
      [ 'FOP_ADD', 'hr_payEl', '12', null, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ],
      [ 'FOP_OTHER', 'hr_payEl', '6', null, '2019-01-01T00:00:00Z', '9999-12-31T00:00:00Z' ]
    ]
  }
]
