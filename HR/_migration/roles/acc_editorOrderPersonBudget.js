const migrationService = require('../../../AC/_migration/migrationService')
module.exports = [{
  name: 'acc_editorOrderPersonBudget',
  description: 'Редактор наказів з персоналу бюджет',
  description_uk: 'Редактор наказів з персоналу бюджет',
  description_ru: 'Редактор приказов по персоналу бюджет',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accHR'],
  shortcutCodes: migrationService.getShortcutCodes(getRoleDef()),
  elsRule: migrationService.getElsRule(getRoleDef(), getMethodSet())
}]

function getMethodSet () {
  const methodSet = ['select', 'addnew', 'insert', 'update', 'delete', 'doPosting', 'doCancelPosting', 'getOrderSignerInfo', 'getTempExecution', // 8
    'getNextTabNum', 'loadFromTemplate', 'doPosting_*', 'doCancelPosting_*', 'checkTabNum', 'getEmployeePositionInfo', 'deleteAccrual', 'getValidatorWarning', // 16
    'userIsMemberOf', 'getOrderSignerList', 'replaceDateFrom', 'fillOrderAccrual', 'clearOrderAccrual', // 21
    'getVacListIDs', 'addEvaluationType', 'exchangeReview', 'sendReview', 'addStampData', 'getDocumentWithStampData' // 27
  ]
  // Array.of().forEach((e, i) => methodSet[i + 50] = e)
  return methodSet
}

function getRoleDef () {
  return [
    {
      accHRFolderOrdersMove: [
        ['hr_empOrderPluralistA', 'accHR_empOrderPluralistA', ['0-4,22', 'Наказ про сумісництво', 'hr_empOrderPluralistDet']],
        ['hr_empOrderOutpluralA', 'accHR_empOrderOutpluralA', ['0-4,22', 'Наказ про припинення сумісництво', 'hr_empOrderOutpluralDet']]
      ],
      accHRFolderCertification: [
        ['hr_empOrderCertificationA', 'accHR_empOrderCertificationA',
          ['0-4,14,15', 'Наказ про присвоєння кваліфікації', 'hr_empOrderCertificationDet'],
          ['0-4,19-21', 'Нарахування по пункту наказу', 'hr_empOrderAcc']
        ]
      ],
      accDstFolderCertification: [
        ['accDst_empOrderCertificationA']
      ],
      accHRFolderOrdersChgSalary: [
        ['hr_empOrderAddPayA', 'accHR_empOrderAddPayA',
          ['0-4', 'Наказ про оплату додаткової роботи', 'hr_empOrderAddpayDet'],
          ['0-4', 'Оплата додаткової роботи (працівники)', 'hr_empOrderAddpayListDet']
        ]
      ]
    },
    ['',
      ['0-6,11-12,16,24,25,26,27', 'Наказ з персоналу', 'hr_empOrder'],
      ['0-6', 'Наказ про суміщення', 'hr_empOrderCombiningposDet'],
      ['0-4', 'Этап согласования', 'hr_recstage'],
      ['0-4', 'Участник согласования', 'hr_recparticipant'],
      ['0-4,10', 'Шаблон узгодження', 'hr_recstageTemplate'],
      ['0-4', 'Заголовок та преамбула', 'hr_dictEmpOrderText'],
      ['0-4', 'Підстава наказу', 'hr_dictOrderDetReason'],
      ['0-4', 'Індекс номеру наказу', 'hr_dictEmpOrderIndex'],
      ['0-4,23', 'Лист ознайомлення', 'hr_acquaintanceList'],
      ['0,7,18', 'Призначення працівника', 'hr_employeePosition'],
      ['0,8', 'Призначення працівника', 'hr_employeePositionS'],
      ['0,9', 'Працівники', 'hr_employeeNumber'],
      ['13', 'Наказ про прийом на роботу. Деталь', 'hr_empOrderAppointDet'],
      ['0-4', 'Заповнити заголовок наказу', 'hr_dictEmpOrderText'],
      ['0-4', 'hr_orderAttachment', 'hr_orderAttachment'],
      ['3', 'Пункт наказу', 'hr_empOrder'],
      ['0-4', 'hr_empOrderTaskDet', 'hr_empOrderTaskDet'],
      ['17', 'ac_service', 'ac_service'],
      ['0-4', 'Лист розсилки', 'hr_mailingLetter'],
      ['0-4', 'Шаблон листа розсилки', 'hr_mailingLetterTemplate'],
      ['0-4,10', 'Шаблон листа розсилки. Учасники', 'hr_mailingLetterTemplateDet'],
      ['0-4', 'Лист підписантів', 'hr_empOrderSignDet'],
      ['0-4', 'Шаблон листа підписантів', 'hr_empOrderSignTemplate'],
      ['0-4,10', 'Шаблон листа підписантів. Учасники', 'hr_empOrderSignTemplateDet'],
      ['0-4', 'Лист погодження', 'hr_empOrdListAppruv'],
      ['0-4', 'Шаблон листа погодження', 'hr_empOrdListAppruvTemplate'],
      ['0-4', 'Шаблон листа погодження. Учасники', 'hr_empOrdListAppruvTemplateDt'],
      ['0-4', 'Шаблон листа ознайомлення', 'hr_empOrderAcquaintListTpl'],
      ['0-4', 'Шаблон листа ознайомлення. Учасники', 'hr_empOrderAcquaintListTplDet'],
      ['0-4', 'Події ознайомлення', 'hr_dictEventKnowledg']
    ]
  ]
}
