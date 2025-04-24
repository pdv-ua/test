module.exports = [
  {
    entity: 'hr_methodGroup',
    identifier: ['code'],
    localeAttr: ['name'],
    attrs: ['code', 'name', 'groupType'],
    items: [
      [1, 'Система оплати', 'PAYMENT'],
      [2, 'Надбавки та доплати', 'PAYMENT'],
      [3, 'Премії', 'PAYMENT'],
      [4, 'Відпустки', 'PAYMENT'],
      [5, 'Лікарняні', 'PAYMENT'],
      [6, 'Оплата по середньому', 'PAYMENT'],
      [7, 'Матеріальна допомога', 'PAYMENT'],
      [8, 'Компенсаційні нарахування', 'PAYMENT'],
      [9, 'Інші нарахування', 'PAYMENT'],
      [127, 'Податки', 'OFFTAKE'],
      [128, 'Виплати', 'FORPAY'],
      [129, 'Виконавчі листи', 'OFFTAKE'],
      [130, 'Внески', 'OFFTAKE'],
      [131, 'Збори', 'OFFTAKE'],
      [132, 'Суди', 'OFFTAKE'],
      [133, 'Інші утримання', 'OFFTAKE'],
      [134, 'Резерв відпусток', 'PAYMENT']
    ]
  }
]
