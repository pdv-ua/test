module.exports = [
  {
    code: 'group_reviewStructure',
    name: 'Перегляд структури організації',
    name_uk: 'Перегляд структури організації',
    name_ru: 'Просмотр структуры организации',
    name_az: 'Təşkilatın strukturuna baxın',
    description: 'Перегляд структури організації',
    groupRole: [
      'acc_user',
      'acc_reviewOrderStructure', // Переглядач наказів за структурою
      'acc_reviewStructure' // Переглядач структури організації
    ]
  }
]
