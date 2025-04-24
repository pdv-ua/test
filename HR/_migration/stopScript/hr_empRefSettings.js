module.exports.run = (conn) => {
  const reportDefaultListSalary = [
    'osobovaKartka', 'dovidkaZMiscyaRoboty', 'dovidkaZMiscyaRoboty2', 'income', 'incomeTax',
    'incomeAccrual', 'payIndexSalary', 'credit', 'payrollEmbassy', 'payrollRequire',
    'avgSalary13', 'avgSalaryMain', 'avgSalaryFSS', 'N6', 'rl',
    'rlMonth', 'infoCard'
  ]
  const delaultSettingsData = {
    'osobovaKartka': { empValue: true, empNumValue: true, empCardValue: true },
    'dovidkaZMiscyaRoboty': { empValue: true, empNumValue: true, empCardValue: true },
    'dovidkaZMiscyaRoboty2': { empValue: true, empNumValue: true, empCardValue: true },
    'income': { empValue: false, empNumValue: true, empCardValue: true },
    'incomeTax': { empValue: false, empNumValue: true, empCardValue: true },
    'incomeAccrual': { empValue: false, empNumValue: true, empCardValue: true },
    'payIndexSalary': { empValue: false, empNumValue: true, empCardValue: true },
    'credit': { empValue: false, empNumValue: true, empCardValue: true },
    'payrollEmbassy': { empValue: false, empNumValue: true, empCardValue: true },
    'payrollRequire': { empValue: false, empNumValue: true, empCardValue: true },
    'avgSalary13': { empValue: false, empNumValue: true, empCardValue: true },
    'avgSalaryMain': { empValue: false, empNumValue: true, empCardValue: true },
    'avgSalaryFSS': { empValue: false, empNumValue: true, empCardValue: true },
    'N6': { empValue: false, empNumValue: true, empCardValue: true },
    'rl': { empValue: false, empNumValue: true, empCardValue: true },
    'rlMonth': { empValue: false, empNumValue: true, empCardValue: true },
    'infoCard': { empValue: false, empNumValue: true, empCardValue: true },

    'dovidkaZMiscyaRobotyPregnVac': { empValue: true, empNumValue: false, empCardValue: true },
    'dovidkaZMiscyaRobotyMission': { empValue: true, empNumValue: false, empCardValue: true },
    'empCommitment': { empValue: true, empNumValue: false, empCardValue: true },
    'dovidkaNotUsedVacation': { empValue: true, empNumValue: false, empCardValue: true },
    'povidomZminaOblikData': { empValue: true, empNumValue: false, empCardValue: true },
    'biografDovidka': { empValue: true, empNumValue: false, empCardValue: true },
    'employeeWorkbook': { empValue: true, empNumValue: false, empCardValue: true },
    'employeeWorkbookDt': { empValue: true, empNumValue: false, empCardValue: true },
    'employeeWorkbookDt6': { empValue: true, empNumValue: false, empCardValue: true },
    'calcExperience': { empValue: true, empNumValue: false, empCardValue: true },
    'agreementProcessingData': { empValue: true, empNumValue: false, empCardValue: true }
  }
  let empRefSettings = conn.Repository('hr_empRefSettings')
    .attrs(['ID', 'settingsData', 'organizationID'])
    .selectAsObject()

  empRefSettings.forEach(row => {
    let settingsData = JSON.parse(row.settingsData)
    for (let reportCode of reportDefaultListSalary) {
      if (!settingsData[reportCode]) {
        settingsData[reportCode] = { empValue: false, empNumValue: true, empCardValue: true }
      }
      settingsData[reportCode].empNumValue = true
    }

    conn.run({
      entity: 'hr_empRefSettings',
      method: 'update',
      __skipOptimisticLock: true,
      execParams: {
        ID: row.ID,
        settingsData: JSON.stringify(settingsData)
      }
    })
  })

  const orgList = conn.Repository('ac_organization')
    .attrs(['ID'])
    .notExists(
      conn.Repository('hr_empRefSettings')
        .attrs('ID')
        .correlation('organizationID', 'ID')
        .where('mi_deleteDate', '>=', '#maxdate')
    )
    .selectAsArrayOfValues()

  orgList.forEach(orgID => {
    conn.run({
      entity: 'hr_empRefSettings',
      method: 'insert',
      __skipOptimisticLock: true,
      execParams: {
        organizationID: orgID,
        settingsData: JSON.stringify(delaultSettingsData)
      }
    })
  })
}
