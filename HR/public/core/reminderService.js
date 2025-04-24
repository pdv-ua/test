/* global $App AC UB */
module.exports = {
  birthDays, // Дні народження
  endProbationaryPeriod, // Закінчення випробувального терміну
  endParentalLeave, // Закінчення відпустки по догляду за дитиною
  endTemporaryAssignment, // Закінчення тимчасового призначення
  getMyAudit, // Мої перевірки
  getMyTasks, // Мої завдання
  getCabRequest, // Заявки з Кабінету
  getTimeSheet, // Відсутність за неявками тебелю
  getTimeSheetPieData, // Відсутність за неявками тебелю (Дані для діаграми)
  getFiredEmpsPieData, // Звільнені (за причинами звільнення) (Дані для діаграми)
  getOrderAll, // Накази
  getOrderAllPieData, // Накази (Дані для діаграми)
  getEmpAmountLineData, // Чисельність персоналу (рік) (Дані для діаграми)
  getRetirementData, // Настання пенсійного віку
  getReminderOfWorkExperienceData // Щомісячне нагадування про стажі
}

async function birthDays (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'birthDays',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    params: JSON.stringify(params || {}),
    userData: JSON.stringify($App.connection.userData()),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function endProbationaryPeriod (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'endProbationaryPeriod',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    params: JSON.stringify(params || {}),
    userData: JSON.stringify($App.connection.userData()),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function endParentalLeave (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'endParentalLeave',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    params: JSON.stringify(params || {}),
    userData: JSON.stringify($App.connection.userData()),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function endTemporaryAssignment (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'endTemporaryAssignment',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    params: JSON.stringify(params || {}),
    userData: JSON.stringify($App.connection.userData()),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getMyAudit (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getMyAudit',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    employeeNumberID: $App.connection.userData().employeeNumberID,
    isModelWFM: $App.domainInfo.models['WFM'],
    params: JSON.stringify(params || {}),
    userData: JSON.stringify($App.connection.userData()),
    currTime: Math.random()
  })

  return Promise.resolve(JSON.parse(data.resultData))
}

async function getMyTasks (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getMyTasks',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getCabRequest (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getCabRequest',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getTimeSheet (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getTimeSheet',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getTimeSheetPieData (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getTimeSheetPieData',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getFiredEmpsPieData (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getFiredEmpsPieData',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getOrderAll (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getOrderAll',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getOrderAllPieData (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getOrderAllPieData',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getEmpAmountLineData (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getEmpAmountLineData',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    userData: JSON.stringify($App.connection.userData()),
    params: JSON.stringify(params || {}),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getRetirementData (reminderID, orgID, params, days, showOnlyCurrentOrg, userData = null, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getRetirementData',
    reminderID: reminderID || null,
    orgID,
    days,
    showOnlyCurrentOrg,
    params: JSON.stringify(params || {}),
    userData: JSON.stringify($App.connection.userData()),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}

async function getReminderOfWorkExperienceData (reminderID, orgID, params, showOnlyCurrentOrg, userData = null, periodMonth, currTime) {
  const data = await $App.connection.run({
    entity: 'hr_reminder',
    method: 'getReminderOfWorkExperienceData',
    reminderID: reminderID || null,
    orgID,
    showOnlyCurrentOrg,
    periodMonth,
    params: JSON.stringify(params || {}),
    userData: JSON.stringify(userData || $App.connection.userData()),
    currTime: Math.random()
  })
  return Promise.resolve(JSON.parse(data.resultData))
}
