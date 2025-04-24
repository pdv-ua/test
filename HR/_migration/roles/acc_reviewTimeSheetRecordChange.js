module.exports = [{
  name: 'acc_reviewTimeSheetRecordChange',
  description: 'Коригувач табеля',
  description_uk: 'Коригувач табеля',
  description_ru: 'Корректировщик табеля',
  sessionTimeout: 30,
  allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
  desktopsCodes: ['arm_accTim'],
  shortcutCodes: [
    'tim_timeSheet',
    'accTim_timeSheet'
  ],
  elsRule: [
    {
      description: 'Табель',
      entityMask: 'tim_timeSheet',
      methodMask: [
        'select', 'addnew', 'insert', 'update', 'delete', 'viewPrintForm', 'loadData', 'fillData', 'updateData',
        'removeCorrect', 'getEmployeePositionTMHRMIS', 'canceledOrderDay', 'removeCanceled', 'editPastPeriod',
        'editBlockedPeriod', 'editPastPeriod', 'editBlockedRow', 'fillSignersByDefault', 'updateSignersPos'
      ]
    },
    {
      description: 'Звіти TIM',
      entityMask: 'tim_report',
      methodMask: ['runTableReport']
    },
    {
      description: 'hr_dictSheetSigner',
      entityMask: 'hr_dictSheetSigner',
      methodMask: [ '*' ]
    }
  ]
}]
