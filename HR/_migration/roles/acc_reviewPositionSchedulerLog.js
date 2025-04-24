module.exports = [
  {
    name: 'acc_reviewPositionSchedulerLog',
    description: 'Перегляд журналу змін тимчасових призначень',
    description_uk: 'Перегляд журналу змін тимчасових призначень',
    description_ru: 'Просмотр журнала изменений временных назначений',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHRFolderOrdersOther',
      'accHRchangePosSchLog',
      'hr_changePosSchLog',
      'accDst_changePosSchLog'
    ],
    elsRule: []
  }
]
