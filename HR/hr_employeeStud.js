const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]

me.entity.addMethod('delete')

me.delete = function (ctx) {
  const execParams = ctx.mParams.execParams
  const instanceData = ctx.dataStore.getAsJsObject()[0]
  const store = UB.DataStore('hr_employeeNumber')
  store.run('delete', {
    execParams: {
      ID: execParams.ID
    }
  })
  if (instanceData.kind === 'STUD') {
    const studEduKindStore = UB.DataStore('hr_studEducationKind')
    const studEducationKind = UB.Repository('hr_studEducationKind')
      .attrs('ID')
      .where('employeeNumberID', '=', execParams.ID)
      .selectAsObject()
    studEducationKind.forEach(row => {
      studEduKindStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
    const studEduHistStore = UB.DataStore('hr_studEducationHistory')
    const studEducationHistory = UB.Repository('hr_studEducationHistory')
      .attrs('ID')
      .where('employeeNumberID', '=', execParams.ID)
      .selectAsObject()
    studEducationHistory.forEach(row => {
      studEduHistStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
    const studStipendStore = UB.DataStore('hr_studStipend')
    const studStipend = UB.Repository('hr_studStipend')
      .attrs('ID')
      .where('employeeNumberID', '=', execParams.ID)
      .selectAsObject()
    studStipend.forEach(row => {
      studStipendStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
    const studVacStore = UB.DataStore('hr_empLongTermAbsc')
    const studVac = UB.Repository('hr_empLongTermAbsc')
      .attrs('ID')
      .where('employeeNumberID', '=', execParams.ID)
      .selectAsObject()
    studVac.forEach(row => {
      studVacStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })

    const empExOrg = UB.Repository('ac_employeeOrg')
      .attrs('ID')
      .where('employeeID', '=', instanceData['employeeID'])
      .where('organizationID', '!=', instanceData['orgID'])
      .limit(1)
      .selectSingle()
    if (!empExOrg) {
      const empStore = UB.DataStore('hr_employee')
      empStore.run('delete', {
        execParams: {
          ID: instanceData['employeeID']
        }
      })
    }
    const empOrgStore = UB.DataStore('ac_employeeOrg')
    const empOrg = UB.Repository('ac_employeeOrg')
      .attrs('ID')
      .where('employeeID', '=', instanceData['employeeID'])
      .where('organizationID', '=', instanceData['orgID'])
      .selectAsObject()
    empOrg.forEach(row => {
      empOrgStore.run('delete', {
        execParams: {
          ID: row.ID
        }
      })
    })
  }
}
