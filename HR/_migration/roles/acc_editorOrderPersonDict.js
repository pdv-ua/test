module.exports = [
  {
    name: 'acc_editorOrderPersonDict',
    description: 'Редактор довідників наказів з персоналу',
    description_uk: 'Редактор довідників наказів з персоналу',
    description_ru: 'Редактор справочников приказов по персоналу',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accHR'],
    shortcutCodes: [
      'accHRFolderDictionary',
      'accHRDictionary',
      'accHRFolderDictSick',
      'accHRFolderDictBonus',
      'accHR_dictSicknessDay',
      'hr_dictSicknessDay',
      'accHR_dictOrderDetReason',
      'hr_dictOrderDetReason',
      'accHR_dictEmpOrderText',
      'hr_dictEmpOrderText',
      'accHR_dictTask',
      'hr_dictTask',
      'accHR_dictMissionPurpose',
      'hr_dictMissionPurpose',
      'accHR_dictMissionPhrase',
      'hr_dictMissionPhrase',
      'accHR_dictRankReason',
      'hr_dictRankReason',
      'accHR_dictPenalty',
      'hr_dictPenalty',
      'accHR_dictParticipantType',
      'hr_dictParticipantType',
      'accHR_dictParticipant',
      'hr_dictParticipant',
      'accHR_dictOrderDetOrderWord',
      'hr_dictMissionCostCategory'
    ],
    elsRule: [
      {
        description: 'Довідник причин',
        entityMask: 'hr_dictReasonRiskPay',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підстава наказу',
        entityMask: 'hr_dictOrderDetReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Заголовок та преамбула',
        entityMask: 'hr_dictEmpOrderText',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Завдання',
        entityMask: 'hr_dictTask',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Причина виконання обов\'язків',
        entityMask: 'hr_dictActingReason',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підстава-документ наказу',
        entityMask: 'hr_dictOrderDetReasonDoc',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Підстава для надання відпустки',
        entityMask: 'hr_dictReasonVacation',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictSicknessDay',
        entityMask: 'hr_dictSicknessDay',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'hr_dictSicknessDayDt',
        entityMask: 'hr_dictSicknessDayDt',
        methodMask: [ 'select', 'addnew', 'insert', 'update', 'delete' ]
      },
      {
        description: 'Фінансування відрядження',
        entityMask: 'hr_missionFinSource',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictReasonTrialProlong',
        entityMask: 'hr_dictReasonTrialProlong',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Стягнення',
        entityMask: 'hr_dictPenalty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Мета відрядження',
        entityMask: 'hr_dictMissionPurpose',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вимоги до звіту про відрядження',
        entityMask: 'hr_dictMissionPhrase',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Причина присвоєння рангу',
        entityMask: 'hr_dictRankReason',
        methodMask: ['select']
      },
      {
        description: 'hr_dictReasonBounty',
        entityMask: 'hr_dictReasonBounty',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Вид учасника розсилки',
        entityMask: 'hr_dictParticipantType',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'Учасник розсилки',
        entityMask: 'hr_dictParticipant',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictOrderDetOrderWord',
        entityMask: 'hr_dictOrderDetOrderWord',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictMissionCostCategory',
        entityMask: 'hr_dictMissionCostCategory',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      },
      {
        description: 'hr_dictReasonTempAvgPay',
        entityMask: 'hr_dictReasonTempAvgPay',
        methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
      }
    ]
  }
]
