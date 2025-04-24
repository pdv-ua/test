const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const calcService = require('../HR/modules/calcService')

me.entity.addMethod('updateFundPermDt')

me.updateFundPermDt = function (ctx) {
  const mParams = ctx.mParams
  const data = JSON.parse(mParams.data)
  const store = UB.DataStore('hr_fundPermDt')
  const orgIDs = []
  let allOrg = false
  data.remove.forEach(ID => {
    if (mParams.permType === '1') {
      const org = UB.Repository('hr_fundPermDt').attrs('orgID').selectById(ID)
      if (org && org.orgID && !orgIDs.includes(org.orgID)) {
        orgIDs.push(org.orgID)
      }
    } else {
      allOrg = true
    }
    store.run('delete', { execParams: { ID: ID } })
    if (mParams.permType === '1' && !UB.Repository('hr_fundPermDt').attrs(['COUNT(*)']).where('fundPermID', '=', mParams.fundPermID).where('permType', '=', '1').selectScalar()) {
      allOrg = true
    }
  })
  data.add.forEach(ID => {
    store.run('insert', {
      execParams: {
        fundPermID: mParams.fundPermID,
        permType: mParams.permType,
        orgID: mParams.permType === '1' ? ID : null,
        dictStaffCatID: mParams.permType === '2' ? ID : null,
        dictPositionID: mParams.permType === '3' ? ID : null,
        departmentID: mParams.permType === '4' ? ID : null,
        workPlace: mParams.permType === '5' ? ID : null,
        workerType: mParams.permType === '6' ? ID : null,
        tabNumID: mParams.permType === '7' ? ID : null,
        dictEmpCategoryID: mParams.permType === '11' ? ID : null
      }
    })
    if (mParams.permType === '1') {
      if (!orgIDs.includes(ID)) {
        orgIDs.push(ID)
      }
    } else {
      allOrg = true
    }
  })

  if (allOrg) {
    calcService.addCalcQueue({ allOrganization: true, description: `Змінено дані hr_fundPermDt` })
  } else {
    orgIDs.forEach(orgID => {
      calcService.addCalcQueue({ orgID, description: `Змінено дані hr_fundPermDt` })
    })
  }
}
