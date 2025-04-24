/* global UB AC HR $App appAC Ext */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  enableControls,
  onAfterOrderSave,
  recordLoaded,
  formDataReady,
  onControlChanged,
  showStaffTree,
  filterPosition,
  setBtnSelectByTreeState
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', formDataReady)
  me.on('controlChanged', onControlChanged, me)
  me.on('afterrender', function () {
    me.orderConfig = {
      detailGrids: []
    }
  })
  me.on('recordloaded', recordLoaded)
  me.onBeforeSave = () => {
    return Promise.resolve(true)
  }
}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.orderForm = me.masterForm = me.customParams.orderForm
  } else
  if (me.sender) {
    me.masterForm = me.sender.up('form')
  }
  AC.viewUtils.setAttr(me)
  me.attr.isVacantPos = me.down('[name=isVacantPos]')
}

function addBaseActions () {
  this.callParent(arguments)
}

function formDataReady () {
  let me = this
  HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
  me.masterForm && me.masterForm.makeReasonSelector(me)
  me.attr.transferOrgID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  me.attr.transferDepartmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  me.attr.transferPositionID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()

  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['dateFrom', '<=', appAC.globalApplicationDate()],
    ['dateTo', '>=', appAC.globalApplicationDate()],
    ['isActive', '=', 1],
    ['organizationID', '=', me.record.get('organizationID'), 'org'],
    ['organizationID', 'isNull', null, 'orgNull']
  ], ['(([org]) OR ([orgNull]))'], ['clearWhereList'])

  UB.Repository('hr_organization')
    .attrs('mi_treePath')
    .where('mi_data_id', '=', me.record.get('organizationID'))
    .where('state', '=', 'ACTIVE')
    .misc({ __mip_ondate: appAC.globalApplicationDate() })
    .selectSingle()
    .then(orgData => {
      const treePath = orgData ? orgData.mi_treePath.split('/').filter(o => o) : []
      AC.viewUtils.setFilterValue(me.attr.transferOrgID, {
        mi_treePath: { value: `/${treePath.length ? treePath[0] : appAC.globalOrganization()}/%`, condition: 'startWith' },
        mi_data_id: { value: me.record.get('organizationID'), condition: 'notEqual' }
      })
    })
  AC.viewUtils.setFilterValue(me.attr.transferOrgID, {
    mi_data_id: { value: $App.connection.userData().userOrg, condition: 'in' }
  })
  if (!me.isNewInstance) {
    AC.viewUtils.setWhereListProperty(me.attr.transferDepartmentID, [
      ['orgID', '=', me.record.get('transferOrgID')]
    ], null, ['clearStore'])
    const isVacantPos = me.attr.isVacantPos.getValue()
    me.filterPosition(isVacantPos)
    me.setBtnSelectByTreeState(isVacantPos)
  }
}

function setBtnSelectByTreeState (isVacantPos) {
  const me = this
  if (isVacantPos) {
    me.down('[ubID=btnSelectByTree]').hide()
  } else {
    if (me.orgData && !me.orgData.parentUnitID && !isVacantPos) {
      me.down('[ubID=btnSelectByTree]').show()
    }
  }
}

async function recordLoaded () {
  let me = this
  HR.orderManager.showIf(me)
  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', 'TRANSFER')
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
    const dictReasonDismID = await UB.Repository('hr_dictReasonDism').attrs('ID').where('code', '=', '06').selectScalar()
    me.record.set('dictReasonDismID', dictReasonDismID)
  }
  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  me.enableControls()
  HR.orderManager.setDefaultValues(me)
  const userOrgID = ($App.connection.userData() || {}).orgID
  if (userOrgID) {
    me.orgData = await UB.Repository('hr_organization')
      .attrs('parentUnitID')
      .where('mi_data_id', '=', userOrgID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: appAC.globalApplicationDate() })
      .selectSingle()
  }
}

function enableControls () {
  const me = this
  me.masterForm && me.masterForm.enableParaControls(this)
}

function onControlChanged (ctrl, value, oldValue) {
  const me = this
  switch (ctrl.name) {
    case 'transferOrgID':
      AC.viewUtils.setWhereListProperty(me.attr.transferDepartmentID, [
        ['orgID', '=', value]
      ], null, ['clearStore', 'clearValue'])
      me.attr.transferDepartmentID.setValue()
      me.attr.transferPositionID.setValue()
      break
    case 'transferDepartmentID':
      if (ctrl.skipChange) {
        delete ctrl.skipChange
        return
      }
      me.attr.transferPositionID.setValue()
      me.filterPosition(me.attr.isVacantPos.getValue())
      break
    case 'dateFrom':
      me.filterPosition(me.attr.isVacantPos.getValue())
      break
  }
}

function onAfterOrderSave () {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.enableControls()
  }
}

function showStaffTree (config = {}) {
  const me = this
  if (!me.record.get('transferOrgID')) return
  const valueField = 'ID'
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_staffTreeSelect',
    customParams: {
      organizationID: me.record.get('transferOrgID'),
      onDate: config.onDate || appAC.globalApplicationDate(),
      useFundSource: config.useFundSource,
      dictFundSourceID: config.dictFundSourceID,
      isPlan: false,
      onSelectNodeHandler: tree => {
        const record = tree.getCurrentRecord()
        let posID = null
        let depID = null
        const data = record.raw
        const posField = me.attr.transferPositionID
        const depField = me.attr.transferDepartmentID
        const pData = record.parentNode && record.parentNode.raw
        switch (data.nodeType) {
          case 'DEPUNIT':
            depID = data[valueField]
            break
          case 'POSUNIT':
            posID = data[valueField]
            if (pData && pData.nodeType === 'DEPUNIT') {
              depID = pData[valueField]
            } else {
              let parent = record
              do {
                parent = parent.parentNode
              } while (parent && parent.raw.nodeType !== 'DEPUNIT')
              if (parent && parent.raw.nodeType === 'DEPUNIT') {
                depID = parent.raw[valueField]
              }
            }
            break
        }
        if (posID || depID) {
          depField && depField.setValueById(depID)
          me.record.set('transferDepartmentID', depID)
          if (posID) {
            posField.getStore().load(() => {
              posField.setValueById(posID)
              Ext.defer(() => {
                me.record.set('transferPositionID', posID)
              }, 700)
            })
          }
        }
        Ext.defer(() => {
          posField.focus(true)
        }, 1000)
        return Promise.resolve(true)
      }
    }
  })
}

function filterPosition (isVacantPos) {
  const me = this
  if (!me.record.get('transferOrgID')) return
  const dateFrom = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom'))
  const posCtrl = me.attr.transferPositionID
  const store = posCtrl.getStore()
  const req = store.ubRequest
  if (isVacantPos) {
    req.orgID = me.attr.transferOrgID.getValue()
    req.onDate = AC.dateService.addDays(dateFrom, 1)
    req.greaterThanZero = true
    req.__mip_recordhistory_all = true
    req.entity = 'hr_positionVacContest'
    store.entityName = 'hr_positionVacContest'
    req.method = 'selectVacancies'
    req.fieldList = ['ID', 'description', 'code', 'psCategory', 'positionType', 'vacCount', 'parentUnitID']
    req.whereList = {
      parentUnitID: {
        expression: '[parentUnitID]',
        condition: 'equal',
        value: me.attr.transferDepartmentID.getFieldValue('mi_data_id') || me.attr.transferOrgID.getValue() || 0
      }
    }
  } else {
    req.entity = 'hr_position'
    store.entityName = 'hr_position'
    req.method = 'select'
    req.fieldList = ['ID', 'description', 'code', 'psCategory', 'positionType']
    req.__mip_ondate = appAC.globalApplicationDate()
    delete req.__mip_recordhistory_all
    req.whereList = {
      organizationID: {
        expression: '[orgID]',
        condition: 'equal',
        value: me.attr.transferOrgID.getValue()
      },
      state: {
        expression: '[state]',
        condition: 'equal',
        value: 'ACTIVE'
      },
      parentUnitID: {
        expression: '[parentUnitID]',
        condition: 'equal',
        value: me.attr.transferDepartmentID.getFieldValue('mi_data_id') || me.attr.transferOrgID.getValue() || 0
      }
    }
  }
  store.load()
}
