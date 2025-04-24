// const crud = ['addnew', 'insert', 'update', 'delete']
module.exports = [
  {
    name: 'acc_checkingPosCompetition',
    description: 'Перевіряючий конкурсні посади',
    description_uk: 'Перевіряючий конкурсні посади',
    description_ru: 'Проверяющий конкурсные должности',
    description_az: 'Rəqabətli postların müfəttişi',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHREmpAdd'],
    shortcutCodes: [
      'accHREmpAdd_competitionFolder',
      'accHREmpAdd_hr_listPosContestAllA',
      'hr_listPosContestAllA',
      'accHREmpAdd_hr_listPosContestOrg',
      'hr_listPosContestOrg',
      'accHREmpAdd_hr_listPosContestPubA',
      'hr_listPosContestPubA'
    ],
    elsRule: [
      { description: 'hr_listPosContest', entityMask: 'hr_listPosContest', methodMask: ['select', 'exportDataPosContestAll', 'exportDataPosContestPub', 'update', 'importData'] },
      { description: 'hr_export', entityMask: 'hr_export', methodMask: ['exportPublicData', 'getJsonFile', 'exportPosContest', 'setPosContestResult', 'uploadPublicData'] },
      { description: 'Переможці конкурсних посад', entityMask: 'hr_listPosContestDet', methodMask: ['select'] }
    ]
  }
]
