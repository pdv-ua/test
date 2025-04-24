const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_editorOrganization',
  description: 'Редактор організацій',
  description_uk: 'Редактор організацій',
  description_ru: 'Редактор организаций',
  description_az: 'Təşkilatların siyahısını tərtib edən',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accStaff'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  const methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'selectFunds', 'allowEditOwn']
  Array.of('selectVacancies', 'getVacancies', 'getVacanciesWithVacFrom', 'selectVacanciesWithVacFrom')
    .forEach((e, i) => { methodSet[i + 40] = e })

  Array.of('select', 'determineChild', 'liquidate', 'restore', 'restoreChanges', 'copyUnitTree', 'exchangeReview', 'sendReview') // 107
    .forEach((e, i) => { methodSet[i + 100] = e })

  // Array.of().forEach((e, i) => methodSet[i + 60] = e)
  return methodSet
}

function getRoleDef () {
  return [
    {
      accStaffFolderOrg: [
        ['hr_organization', 'accStaff_organization',
          ['0-4,7', 'Організації'],
          ['0-4', 'Розрахунковий рахунок організації', 'ac_orgAccount'],
          ['0-4', 'Адреса', 'ac_address'],
          ['0-4', 'Основні функції організацій та підрозділів', 'hr_basicFunctn'],
          ['0-4', 'Додатки до штатної одиниці', 'hr_staffUnitAttachment']
        ],
        ['hr_staffTreeOrg', 'accStaff_staffOrg'],
        ['hr_staffOrderOrgStructure', 'accStaff_staffOrderOrgStructure', ['0-5', 'Ведення Організацій']]
      ]
    },
    ['',
      ['0-4', 'Особи організації', 'org_employee'],
      ['40-59', 'Вакантні посади (конкурс)', 'hr_positionVacContest'],
      ['0-4', 'Відповідальні особи', 'hr_orgRespPosition'],
      ['0', 'Посадова інструкція', 'hr_positionInstruction'],
      ['0', 'Посадові обов`язки', 'hr_positionResp'],
      ['0', 'Кваліфікаційні вимоги', 'hr_positionQualif'],
      ['0-4', 'Для конкурсу', 'hr_positionContest'],
      ['0-4', 'Нарахування', 'hr_positionAccrual'],
      ['0-4', 'Шкідливість', 'hr_positionHarmful'],
      ['0', 'Заявки на добір персоналу', 'hr_requestForStuff'],
      ['6', 'ФОП для посади', 'hr_positionFunds'],
      ['0,3,106,107', 'Наказ з персоналу', 'hr_empOrder'],
      ['100-105', 'Орг Структура', 'hr_staffUnit'],
      ['0-4', 'Лист розсилки', 'hr_mailingLetter'],
      ['0-4', 'Шаблон листа розсилки', 'hr_mailingLetterTemplate'],
      ['0-4,10', 'Шаблон листа розсилки. Учасники', 'hr_mailingLetterTemplateDet'],
      ['0-4', 'Лист підписантів', 'hr_empOrderSignDet'],
      ['0-4', 'Шаблон листа підписантів', 'hr_empOrderSignTemplate'],
      ['0-4,10', 'Шаблон листа підписантів. Учасники', 'hr_empOrderSignTemplateDet'],
      ['0-4', 'Лист погодження', 'hr_empOrdListAppruv'],
      ['0-4', 'Шаблон листа погодження', 'hr_empOrdListAppruvTemplate'],
      ['0-4', 'Шаблон листа погодження. Учасники', 'hr_empOrdListAppruvTemplateDt']
    ]
  ]
}
