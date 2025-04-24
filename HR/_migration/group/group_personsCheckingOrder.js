module.exports = [
  {
    code: 'group_personsCheckingOrder',
    name: 'Користувач задіяний в процесі погодження та підписання документів',
    name_uk: 'Користувач задіяний в процесі погодження та підписання документів',
    name_ru: 'Пользователь, который задействован в процессе согласования и подписания документов',
    name_az: 'İstifadəçi sənədlərin razılaşdırılması və imzalanması prosesində iştirak edir',
    description: 'Користувач задіяний в процесі погодження та підписання документів',
    groupRole: [
      'acc_user',
      'acc_reconcOrderPerson', // Погоджувач наказів
      'acc_approvDocs',
      'acc_reviewDashboard',
      'acc_searchEmpLimit',
      'acc_reviewRequestInCab'
    ]
  }
]
