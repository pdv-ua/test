/* global AC appAC HR UB */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  filterTempPosition,
  filterTempEmployeePosition,
  setTreeData
}

async function setTreeData (record, count = 0) {
  const me = this
  const parent = record.parentNode
  switch (record.raw.nodeType) {
    case 'EMPUNIT':
      me.attr.employeePositionTempID.setValueById(record.raw.ID, false, async () => {
        me.attr.employeePositionTempID.clearIsPhantom()
      })

      break
    case 'POSUNIT':
      const positionID = record.raw.mi_data_id
      await UB.Repository('hr_employeePositionS')
        .attrs('ID')
        .where('positionID', '=', positionID)
        .where('dateFrom', '<=', AC.dateService.shiftDate(AC.dateService.currentDate()))
        .where('dateTo', '>=', AC.dateService.shiftDate(AC.dateService.currentDate()))
        .selectAsObject().then(employeePosition => {
          if (employeePosition && employeePosition.length === 1) {
            me.attr.employeePositionTempID.setValueById(employeePosition[0].ID, false, async () => {
              me.attr.employeePositionTempID.clearIsPhantom()
            })
          }
        })
      me.filterTempEmployeePosition({
        isReload: true,
        isClear: count === 0,
        positionID: positionID
      })
      me.attr.positionTempID.setValueById(positionID, false, async () => {
        if (parent && parent.raw.nodeType !== 'DEPUNIT') {
          me.attr.departmentTempID.setValue(null)
          me.filterTempPosition({
            isReload: true
          })
        }
      })
      break
    case 'DEPUNIT':
      const departmentID = record.raw.mi_data_id
      me.attr.departmentTempID.setValueById(departmentID, false, () => {
        me.filterTempPosition({
          isReload: true,
          isClear: count === 0,
          departmentID: departmentID
        })
        if (count === 0) {
          me.filterTempEmployeePosition({
            isReload: true,
            isClear: count === 0,
            positionID: -1
          })
        }
      })
      break
  }
  setTimeout(() => {
    me.attr.positionTempID.clearIsPhantom()
    me.attr.employeePositionTempID.clearIsPhantom()
  }, 500)

  if (parent && parent.raw) {
    if (record.raw.nodeType === 'DEPUNIT' && parent.raw.nodeType === 'DEPUNIT') {
      return
    }
    if (['POSUNIT', 'DEPUNIT', 'EMPUNIT'].includes(parent.raw.nodeType)) {
      me.setTreeData(parent, ++count)
    }
  }
}

function filterTempEmployeePosition ({
  isClear = false,
  isReload = false,
  positionID = null
} = {}) {
  const me = this
  const positionTempID = positionID || me.attr.positionTempID.getFieldValue('mi_data_id') || me.record.get('positionTempID')
  me.attr.employeePositionTempID.getStore().ubRequest.whereList = {}
  if (positionTempID) {
    AC.viewUtils.setWhereListProperty(me.attr.employeePositionTempID, [
      ['positionID', '=', positionTempID, 'pos'],
      ['dateFrom', '<=', appAC.globalApplicationDate()],
      ['dateTo', '>=', appAC.globalApplicationDate()],
      ['isActive', '=', true]
    ])
  } else {
    AC.viewUtils.setWhereListProperty(me.attr.employeePositionTempID, [
      ['positionID', '=', -1]
    ])
  }
  if (isClear) {
    me.attr.employeePositionTempID.getStore().load().then(store => {
      me.attr.employeePositionTempID.setValue()
    })
  } else if (isReload) {
    me.attr.employeePositionTempID.getStore().load()
  }
}

function filterTempPosition ({
  isClear = false,
  departmentID = null
} = {}) {
  const me = this
  const departmentTempID = departmentID || me.attr.departmentTempID.getFieldValue('mi_data_id')
  me.attr.positionTempID.getStore().ubRequest.whereList = {}
  if (departmentTempID) {
    AC.viewUtils.setWhereListProperty(me.attr.positionTempID, [
      ['parentUnitID', '=', departmentTempID, 'dep'],
      ['mi_dateFrom', '<=', appAC.globalApplicationDate()],
      ['mi_dateTo', '>=', appAC.globalApplicationDate()],
      ['state', '=', 'ACTIVE']
    ])
  } else {
    AC.viewUtils.setWhereListProperty(me.attr.positionTempID, [
      ['parentUnitID', '=', appAC.globalOrganization(), 'dep'],
      ['mi_dateFrom', '<=', appAC.globalApplicationDate()],
      ['mi_dateTo', '>=', appAC.globalApplicationDate()],
      ['state', '=', 'ACTIVE']
    ])
  }
  if (isClear) {
    me.attr.positionTempID.getStore().load().then(store => {
      me.attr.positionTempID.setValue()
    })
  }
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady, me)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && appAC) {
    me.record.set('organizationID', appAC.globalOrganization())
  }
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', appAC.globalOrganization(), 'org'],
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()],
    ['isActive', '=', 1]
  ])
  /*        AC.viewUtils.setWhereListProperty(me.attr.employeePositionTempID, [
          ['organizationID', '=', appAC.globalOrganization(), 'org'],
          ['dateFrom', '<=', appAC.globalApplicationDate()],
          ['dateTo', '>=', appAC.globalApplicationDate()],
          ['isActive', '=', 1]
        ])
*/
  AC.viewUtils.setWhereListProperty(me.attr.departmentTempID, [
    ['orgID', '=', appAC.globalOrganization(), 'org'],
    ['mi_dateFrom', '<=', appAC.globalApplicationDate()],
    ['mi_dateTo', '>=', appAC.globalApplicationDate()],
    ['state', '=', 'ACTIVE']
  ])
  me.filterTempPosition()
  me.attr.positionTempID.setValueById(me.record.get('positionTempID'), false, () => {
    setTimeout(() => {
      me.attr.positionTempID.clearIsPhantom()
    }, 100)
  })
  me.attr.departmentTempID.setValueById(me.record.get('departmentTempID'), false, () => {
    setTimeout(() => {
      me.attr.departmentTempID.clearIsPhantom()
    }, 100)
  })
  me.filterTempEmployeePosition()
  HR.orderManager.setDateChecker(me, {
    dateFrom: me.getField('dateFromEmpty'),
    dateTo: me.getField('dateToEmpty')
  })
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.isReadOnly) {
    me.canEdit = false
    me.setActionDisabled('fDelete', true)
  }
}
