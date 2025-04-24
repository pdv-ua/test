module.exports = [
  {
    entity: 'hr_dictTimeCostGroup',
    identifier: ['dictTimeCostID', 'dictTimeGroupID'],
    localeAttr: ['dictTimeCostID'],
    notDelete: true,
    notUpdate: true,
    attrsConfig: {
      dictTimeGroupID: { associatedEntity: 'hr_dictTimeGroup', codeAttr: 'code' },
      dictTimeCostID: { associatedEntity: 'hr_dictTimeCost', codeAttr: 'code' }
    },
    attrs: ['dictTimeGroupID', 'dictTimeCostID'],
    items: [
      ['LST_VACATION', 'Восн'],
      ['LST_VACATION', 'Вдод'],
      ['LST_VACATION', 'Вчорн'],
      ['LST_VACATION', 'Внавч'],
      ['LST_VACATION', 'Допл'],
      ['LST_VACATION', 'Вваг'],
      ['LST_CHD_CARE_VAC', 'В3дит'],
      ['LST_CHD_CARE_VAC', 'Вдит'],
      ['LST_NONPAID_VAC', 'Втвор'],
      ['LST_NONPAID_VAC', 'Внавчбз'],
      ['LST_NONPAID_VAC', 'Вобов'],
      ['LST_NONPAID_VAC', 'Взст'],
      ['LST_NONPAID_VAC', 'Вінбз'],
      ['LST_TRIP', 'Вдр'],
      ['LST_TRIP', 'НВдр'],
      ['LST_TRIP', 'ВдрС'],
      ['LST_TRIP', 'ВдрР'],
      ['LST_SICKNESS', 'ЛікХвор'],
      ['LST_SICKNESS', 'ЛікДогл'],
      ['LST_SICKNESS', 'ЛікНеопл'],
      ['LST_SICKNESS', 'НеПідЛ'],
      ['LST_AVGPAYMENT', 'ПідвКв'],
      ['LST_AVGPAYMENT', 'ДГОбов'],
      ['LST_AVGPAYMENT', 'ВЗб'],
      ['LST_AVGPAYMENT', 'ВДон']
    ]
  }
]
