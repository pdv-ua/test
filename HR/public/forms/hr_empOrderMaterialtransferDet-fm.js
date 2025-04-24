/* global UB AC HR appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onRecordLoaded,
  onFormDataReady,
  onControlChanged,
  enableControls,
  beforeSave,
  onAfterSave,
  filterEmpPos,
  setCommissionHead
}

function initComponentStart () {
  const me = this
  me.on('recordloaded', onRecordLoaded, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('controlChanged', onControlChanged, me)
  me.on('beforesave', beforeSave, me)
  me.on('aftersave', me.onAfterSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.attr.commissionDetail = me.down('[name=commissionDetail]')
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  /* me.on('beforeClose', function (a) {
    AC.gridUtils.refreshSenderGrid(me)
  }) */
}

function onRecordLoaded () {
  const me = this
  if (me.isNewInstance) {
    if (me.orderForm && me.orderForm.record.get('empOrderType').indexOf('MISSION') === 0) {
      me.record.set('isGroup', false)
    }
    me.record.set('orderID', me.orderForm.instanceID)
    me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    UB.Repository('hr_empOrderDet')
      .attrs('employeePositionID', 'dateFrom', 'dateTo')
      .where('orderID', '=', me.orderForm.instanceID)
      .where('empOrderType', 'in', ['VACATION', 'VACATIONLONG', 'MISSION_TRAINING', 'MISSION'])
      .where('empOrderType', '=', 'VACATION', 'isVac')
      .where('empOrderType', '=', 'VACATIONLONG', 'isVacLong')
      .where('isGroup', '=', true, 'isGroup')
      .where('empOrderType', 'in', ['MISSION_TRAINING', 'MISSION'], 'isMission')
      .logic('(([isVac] AND [isGroup]) OR [isVacLong] OR [isMission])')
      .selectAsObject().then(data => {
        if (data.length === 1) {
          me.record.set('employeePositionID', data[0].employeePositionID)
          me.record.set('dateFrom', data[0].dateFrom)
          me.record.set('dateTo', data[0].dateTo)
        }
      })
  }

  me.orderForm.makeReasonSelector(me, {
    reasonFieldName: 'reason',
    entityName: 'hr_dictReasonMaterialtransfer'
  })
  HR.orderManager.setDateChecker(me, {
    dateFrom: me.attr.dateFrom,
    dateTo: me.attr.dateTo
  })
}

function onFormDataReady () {
  const me = this
  if (!me.isFirstLoaded) {
    me.filterEmpPos()
    AC.viewUtils.setWhereListProperty(me.attr.commissionHRID, [
      ['organizationID', '=', me.masterForm.record.get('organizationID')]
    ])
    me.isFirstLoaded = true
  }
  HR.orderManager.disableContextMenuItems(me.attr.employeePositionID, ['addItem', 'editItem'])
  HR.orderManager.disableContextMenuItems(me.attr.toEmployeePositionID, ['addItem', 'editItem'])
  me.enableControls()
}

function onControlChanged (field, value, oldValue) {
  const me = this
  switch (field.name) {
    case 'toEmployeePositionID':
      me.setCommissionHead()
      break
  }
}

function enableControls () {
  const me = this
  me.isReadOnly = me.orderForm.enableParaControls(me)
}

function beforeSave (me, params) {
  const data = me.attr.commissionDetail.getAttributeData()
  params.formData = JSON.stringify({ detail: { commissionDetail: data } })
}

function onAfterSave () {
  const me = this
  me.attr.commissionDetail.onRefresh()
}

function filterEmpPos (showAll) {
  const me = this
  const orderDate = me.orderForm.record.get('orderDate')
  const onDate = (orderDate && AC.dateService.shiftDate(orderDate)) || appAC.globalApplicationDate()
  const empPosStore = me.attr.employeePositionID.getStore()
  AC.viewUtils.setWhereListProperty(me.attr.employeePositionID, [
    ['organizationID', '=', me.masterForm.record.get('organizationID')],
    ['dateFrom', '<=', onDate],
    ['dateTo', '>=', onDate]
  ])
  if (showAll === undefined) {
    const empPosAll = me.down('[name=empPosAll]')
    showAll = empPosAll.getValue()
  }
  if (showAll) {
    delete empPosStore.ubRequest.whereList.existInOrder
  } else {
    if (!empPosStore.ubRequest.whereList) {
      empPosStore.ubRequest.whereList = {}
    }
    empPosStore.ubRequest.whereList.existInOrder = {
      expression: '',
      condition: 'subquery',
      subQueryType: 'Exists',
      value: {
        entity: 'hr_empOrderDet',
        fieldList: [],
        method: 'select',
        whereList: {
          orderID: {
            expression: '[orderID]',
            condition: '=',
            value: me.record.get('orderID') || 0
          },
          empOrderType: {
            expression: '[empOrderType]',
            condition: 'in',
            value: ['VACATION', 'VACATIONLONG', 'MISSION_TRAINING', 'MISSION']
          },
          isVac: {
            expression: '[empOrderType]',
            condition: '=',
            value: 'VACATION'
          },
          isMission: {
            expression: '[empOrderType]',
            condition: 'in',
            value: ['MISSION_TRAINING', 'MISSION']
          },
          isVacLong: {
            expression: '[empOrderType]',
            condition: '=',
            value: 'VACATIONLONG'
          },
          isGroup: {
            expression: '[isGroup]',
            condition: '=',
            value: true
          },
          employeePositionID: {
            expression: `[employeePositionID] = [{master}.ID]`,
            condition: 'custom'
          },
          mi_deleteDate: {
            expression: '[mi_deleteDate]',
            condition: 'equal',
            value: '#maxdate'
          }
        },
        logicalPredicates: ['(([isVac] AND [isGroup]) OR [isVacLong] OR [isMission])']
      }
    }
  }
  empPosStore.load()
  me.orderForm.filterEmployeePosition(me, {
    clearValue: false,
    attrToFilter: 'toEmployeePositionID'
  })
}

function setCommissionHead () {
  const me = this
  const commissionDetail = me.down('[name=commissionDetail]')
  const commStore = commissionDetail.getStore()
  const headEmpPosID = me.attr.toEmployeePositionID.getValue()
  const headEmpPosDesc = me.attr.toEmployeePositionID.getFieldValue('description')
  let isHeadSet = false
  for (let i = 0; i < commStore.data.items.length; i++) {
    let rec = commStore.getAt(i)
    if (rec.get('memberType') === '1') {
      rec.set('employeePositionID', headEmpPosID)
      rec.set('employeePositionID.description', headEmpPosDesc)
      isHeadSet = true
      break
    }
  }
  if (!isHeadSet) {
    commissionDetail.addNewRecord({
      lineNum: commStore.data.items.length + 1,
      employeePositionID: headEmpPosID,
      'employeePositionID.description': headEmpPosDesc,
      memberType: '1',
      memberName: UB.core.UBEnumManager.getStore('HR_COMMISSION_MEMBER_TYPE').getById('1').data.name
    })
  }
}
