module.exports = [
  {
    name: 'acc_editorDictPersonCard',
    description: 'Редактор довідників картки працівника',
    description_uk: 'Редактор довідників картки працівника',
    description_ru: 'Редактор справочников карточки работника',
    description_az: 'İşçi kartı kataloqu redaktoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    shortcutCodes: [
      'hr_dictMilitarySpeciality',
      'hr_specialty'
    ],
    elsRule: [
      {
        description: 'Військово-облікові спеціальності',
        entityMask: 'hr_dictMilitarySpeciality',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Спеціальність',
        entityMask: 'hr_specialty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Категорія',
        entityMask: 'hr_dictMilitaryRanksCategory',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Доповнення',
        entityMask: 'hr_dictMilitaryRanksAddition',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Військові звання',
        entityMask: 'hr_empMilitaryRanks',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вид присвоєння',
        entityMask: 'hr_dictMilitaryRankType',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
