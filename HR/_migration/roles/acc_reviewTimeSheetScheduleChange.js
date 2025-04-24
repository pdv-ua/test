module.exports = [
  {
    name: 'acc_reviewTimeSheetScheduleChange',
    description: 'Переформування табеля у закритих періодах',
    description_uk: 'Переформування табеля у закритих періодах',
    description_ru: 'Переформирование табеля в закрытых периодах',
    description_az: 'Qapalı dövrlərdə hesabat kartının islahatı',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: [],
    shortcutCodes: [],
    elsRule:
      [
        {
          description: 'tim_timeSheet',
          entityMask: 'tim_timeSheet',
          methodMask: ['allowRecalcInClosedPeriod']
        }
      ]
  }
]
