module.exports = [
  {
    entity: 'hr_cfgPanelName',
    localeAttr: ['name'],
    identifier: 'code',
    attrsConfig: {
      cfgPanelID: { associatedEntity: 'hr_cfgPanel', codeAttr: 'code' }
    },
    attrs: ['code', 'name', 'cfgPanelID'],
    items: [
      ['1', 'Обмеження', 'payElEntryMinSum'],
      ['2', 'Враховувати нарахування', 'payElEntrySum'],
      ['3', 'Враховувати утримання', 'payElAddRetention'],
      ['4', 'Види оплати тарифікації', 'payElEntrySum']
    ]
  }
]
