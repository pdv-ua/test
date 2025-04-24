module.exports = [{
  name: 'acc_reviewTimeSheetOrderChange',
  description: 'Коригувач неявок табеля',
  description_uk: 'Коригувач неявок табеля',
  description_ru: 'Корректировщик неявок табеля',
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
        'cancelPastPeriod', 'viewAllActive', 'fillSignersByDefault', 'updateSignersPos'
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
