module.exports = [
  {
    entity: 'hr_dictRankPsCategory',
    notDelete: true,
    notUpdate: true,
    identifier: ['psCategory', 'dictRankID'],
    attrs: ['psCategory', 'dictRankID'],
    attrsConfig: {
      dictRankID: { associatedEntity: 'hr_dictRank', codeAttr: 'code' }
    },
    items: [
      ['1', '1'],
      ['1', '2'],
      ['1', '3'],
      ['2', '3'],
      ['2', '4'],
      ['2', '5'],
      ['2', '6'],
      ['3', '6'],
      ['3', '7'],
      ['3', '8'],
      ['3', '9']
    ]
  }
]
