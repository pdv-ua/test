/* global $App _ UB appAC */

module.exports = {
  getSettings,
  getRefList,
  loadSettings
}

const refList = [
  { code: 'osobovaKartka', name: 'Особова картка працівника', refParams: { type: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'dovidkaZMiscyaRoboty', name: 'Довідка з місця роботи', refParams: { type: 'report', reportCode: 'hr_employee_1', reportIdx: '1' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'dovidkaZMiscyaRoboty2', name: 'Довідка з місця роботи (варіант 2)', refParams: { type: 'report', reportCode: 'hr_employee_1', reportIdx: '4' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'dovidkaZMiscyaRobotyPregnVac', name: 'Довідка з місця роботи (декретна відпустка)', refParams: { type: 'reportDovidka', reportCode: 'hr_employee_1', reportIdx: '2' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'dovidkaZMiscyaRobotyMission', name: 'Довідка з місця роботи (відрядження)', refParams: { type: 'reportDovidka', reportCode: 'hr_employee_1', reportIdx: '3' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'dergSlugOsobovaKartka', name: 'Особова картка держслужбовця (2016)', refParams: { type: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'dergSlugOsobovaKartka2020', name: 'Особова картка держслужбовця', refParams: { type: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'empOath', name: 'Присяга', refParams: { type: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'empCommitment', name: 'Зобов\'язання', refParams: { type: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'empCivilMemo', name: 'Пам\'ятка', refParams: { type: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'dovidkaNotUsedVacation', name: 'Довідка про кількість невикористаних днів відпустки', refParams: { type: 'reportPDF', reportCode: 'hr_empNotUsedVacation', noEdit: true }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'povidomZminaOblikData', name: 'Повідомлення про зміну облікових даних', refParams: { type: 'report', reportCode: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'biografDovidka', name: 'Бiографiчна довiдка', refParams: { type: 'report2', reportCode: 'docx', defaultRefSigner: true }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'employeeWorkbook', name: 'Трудова діяльність', refParams: { type: 'excel', reportCode: 'hr_printEmployeeWorkbook' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'employeeWorkbookDt', name: 'Стаж (за трудовою книжкою)', refParams: { type: 'excel', reportCode: 'hr_printEmployeeWorkbookDt' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'employeeWorkbookDt6', name: 'Розрахунок стажу', refParams: { type: 'excel', reportCode: 'hr_printEmployeeWorkbookDtCode6' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'calcExperience', name: 'Довідковий розрахунок стажів від вказаної дати', refParams: { type: 'excel', reportCode: 'hr_reportCalcExperience' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'agreementProcessingData', name: 'Згода на обробку персональних даних', refParams: { type: 'docx' }, values: { empValue: false, empNumValue: false, empCardValue: false } },

  // Заробітна плата
  { code: 'income', name: UB.i18n('Довідка про доходи'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-income' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'incomeTax', name: UB.i18n('Довідка про доходи для податкової'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-incomeTax' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'incomeAccrual', name: UB.i18n('Довідка про доходи для субсидії'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-income' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'payIndexSalary', name: UB.i18n('Довідка про розрахунок індексації заробітної плати'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-payIndexSalary', allowExportToExcel: true }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'credit', name: UB.i18n('Довідка про заробітну плату для отримання кредиту'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-credit' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'payrollEmbassy', name: UB.i18n('Довідка про заробітну плату для посольства'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-payrollEmbassy' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'payrollRequire', name: UB.i18n('Довідка про заробітну плату за місцем вимоги'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-payrollRequire' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'avgSalary13', name: UB.i18n('Довідка про середню заробітну плату (для призначення допомоги) (Додаток 1 до Постанови № 13)'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-avgSalary13' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'avgSalaryMain', name: UB.i18n('Довідка про середню заробітну плату за основним місцем роботи'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-avgSalaryMain' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'avgSalaryFSS', name: UB.i18n('Довідка для СС (безробіття)'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-avgSalaryFSS' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'N6', name: UB.i18n('Форма № П-6 "Розрахунково-платіжна відомість працівника"'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-N6' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'rl', name: UB.i18n('Розрахунковий лист за період'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-rl' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'rlMonth', name: UB.i18n('Розрахунковий лист'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-rlMonth' }, values: { empValue: false, empNumValue: false, empCardValue: false } },
  { code: 'infoCard', name: UB.i18n('Картка-довідка'), refParams: { type: 'reportAccrual', reportCode: 'hr_accrual-infoCard' }, values: { empValue: false, empNumValue: false, empCardValue: false } }
]

let addRefList = []
let refSettings = []

function loadSettings () {
  const userData = $App.connection.userData()
  let orgIDs = userData.userOrg || [0]
  addRefList = []
  refSettings = []
  if (!orgIDs.length) {
    orgIDs.push(0)
  }

  return Promise.all([
    UB.Repository('hr_empRefSettings')
      .attrs(['ID', 'settingsData', 'organizationID'])
      .where('organizationID', 'in', orgIDs)
      .selectAsObject(),
    UB.Repository('hr_dictUniversalRef')
      .attrs(['ID', 'name', 'code', 'description', 'organizationID'])
      .where('organizationID', 'in', orgIDs)
      .selectAsObject()
  ]).then(([empRefSettings, dictUniversalRef]) => {
    addRefList = dictUniversalRef.map(ref => {
      return { name: ref.name, code: ref.code, description: ref.description || '', organizationID: ref.organizationID }
    })
    refSettings = empRefSettings
  })
}

function getSettings (orgID) {
  return refSettings.find(ref => ref.organizationID === orgID) || {}
}

function getRefList (orgID) {
  return { refList: refList, addRefList: addRefList.filter(ref => ref.organizationID === orgID) || [] }
}
