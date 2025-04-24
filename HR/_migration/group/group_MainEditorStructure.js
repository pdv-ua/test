module.exports = [
  {
    code: 'group_MainEditorStructure',
    name: 'Відповідальний за планування структури організації',
    name_uk: 'Відповідальний за планування структури організації',
    name_ru: 'Ответственный за планирование структуры организации',
    name_az: 'Təşkilatın strukturunun planlaşdırılmasına cavabdehdir',
    description: 'Відповідальний за планування структури організації',
    groupRole: [
      'acc_user',
      'acc_editorOrderStructure', // Редактор наказів за структурою
      'acc_editorStructure', // Планувальник структури організації
      'acc_recalcCases'
    ]
  }
]
