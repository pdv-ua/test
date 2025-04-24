/* global Ext UB $App AC HR appAC */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  onFormDataReady,
  onControlChanged,
  filterEmpOrderSickness,
  clearDetails,
  initDefValues,
  getOrgID,
  beforeGridEdit,
  addListSickness,
  addListFuneral,
  getReportName,
  onCheckValidBeforeSaveOrder
}

function getOrgID (me) {
  return me.record.get('organizationID') || appAC.globalOrganization()
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    hideEditDocNumber: true,
    hideEditPeriodID: true,
    detailGrids: [ 'commissionDetail' ],
    detailGridsConfig: {
      commissionDetail: {
        detailCountShowType: 'parentTab',
        xtype: 'commissionHR'
      }
    }
  }

  me.reportSettings = {
    pageOrientation: 'landscape'
  }
  HR.orderManager.init(me)
}

function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }
  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}

function onFormDataReady () {
  const me = this
  me.initDefValues()
  AC.viewUtils.setFilterValue(me.attr.commissionHRID, {
    organizationID: me.record.get('organizationID')
  })
  const grids = ['sicknessOrders', 'funeralOrders'].map(item => me.down(`[name=${item}]`))
  grids.forEach(grid => {
    grid.down('[actionId=addList]').setVisible(me.record.get('orderState') === 'PROJECT')
    grid.down('[actionId=deleteAll]').setVisible(me.record.get('orderState') === 'PROJECT')
  })
  if (me.isNewInstance) {
    me.saveForm()
  }
}

function onControlChanged (me, field, value, oldValue) {
  if (me.isInnerChangingRecord === true) {
    if (!me.addByCurrent) {
      me.isInnerChangingRecord = false
    }
  }
}

function filterEmpOrderSickness (me, context) {
  let reco = context.record
  let organizationID = me.record.get('organizationID')
  let currentID = reco.get('empOrderSicknessID') || 0
  UB.Repository('hr_empOrderSickness')
    .attrs(['ID'])
    .where('organizationID', '=', organizationID)
    .where('illnessKind', 'in', ['1', '3'])
    .where('orderState', '=', 'POSTED')
    .where('ID', '=', currentID, 'currentID')
    .notExists(UB.Repository('hr_sicknessMeetingDt')
      .correlation('empOrderSicknessID', 'ID')
      .where('sicknessMeetingID', '!=', me.instanceID)
      .where('empOrderSicknessID.organizationID', '=', organizationID)
      .where('empOrderSicknessID.illnessKind', 'in', ['1', '3'])
      .where('empOrderSicknessID.orderState', '=', 'POSTED')
      .where('mi_deleteDate', '=', AC.dateService.maxDate())
      .where('sicknessMeetingID.mi_deleteDate', '=', AC.dateService.maxDate())
      .where('empOrderSicknessID.mi_deleteDate', '=', AC.dateService.maxDate()), 'existed')
    .logic('([currentID] OR [existed])')
    .orderBy('description', 'asc')
    .selectAsObject()
    .then(data => {
      const field = me.attr['sicknessOrders.empOrderSicknessID.description'].field
      let ids = data.length ? Ext.Array.pluck(data, 'ID') : []
      const grid = me.down('[name=sicknessOrders]')
      if (grid.notWriteChanges) {
        const localSickList = grid.store.data.items
        localSickList.forEach((item) => {
          let sicknessID = item.get('empOrderSicknessID')
          if (sicknessID && sicknessID !== currentID) {
            let idx = ids.indexOf(sicknessID)
            if (idx >= 0) {
              ids.splice(idx, 1)
            }
          }
        })
      }
      if (!ids.length) {
        ids.push(0)
      }
      AC.viewUtils.setWhereListProperty(field, [
        ['ID', 'in', ids]
      ], null, ['clearStore', 'clearWhereList'])
    })
}

function filterEmpOrderFuneral (me, context) {
  let reco = context.record
  let organizationID = me.record.get('organizationID')
  let currentID = reco.get('empOrderFuneralID') || 0
  UB.Repository('hr_empOrderFuneral')
    .attrs(['ID'])
    .where('organizationID', '=', organizationID)
    .where('orderState', '=', 'POSTED')
    .where('ID', '=', currentID, 'currentID')
    .notExists(UB.Repository('hr_sicknessMeetingDt')
      .correlation('empOrderFuneralID', 'ID')
      .where('sicknessMeetingID', '!=', me.instanceID)
      .where('empOrderFuneralID.organizationID', '=', organizationID)
      .where('empOrderFuneralID.orderState', '=', 'POSTED')
      .where('mi_deleteDate', '=', AC.dateService.maxDate())
      .where('sicknessMeetingID.mi_deleteDate', '=', AC.dateService.maxDate())
      .where('empOrderFuneralID.mi_deleteDate', '=', AC.dateService.maxDate()), 'existed')
    .logic('([currentID] OR [existed])')
    .orderBy('description', 'asc')
    .selectAsObject()
    .then(data => {
      const field = me.attr['funeralOrders.empOrderFuneralID.description'].field
      let ids = data.length ? Ext.Array.pluck(data, 'ID') : []
      const grid = me.down('[name=funeralOrders]')
      if (grid.notWriteChanges) {
        const localSickList = grid.store.data.items
        localSickList.forEach((item) => {
          let funeralID = item.get('empOrderFuneralID')
          if (funeralID && funeralID !== currentID) {
            let idx = ids.indexOf(funeralID)
            if (idx >= 0) {
              ids.splice(idx, 1)
            }
          }
        })
      }
      if (!ids.length) {
        ids.push(0)
      }
      AC.viewUtils.setWhereListProperty(field, [
        ['ID', 'in', ids]
      ], null, ['clearStore', 'clearWhereList'])
    })
}

function clearDetails (me, fieldLabel, fnCallback) {
  const grids = ['sicknessOrders', 'funeralOrders'].map(item => me.down(`[name=${item}]`))
  const detailsRowCount = grids.reduce((res, grid) => {
    res += grid.store.data.items.length
    return res
  }, 0)
  if (detailsRowCount) {
    return $App.dialogYesNo('Попередження', UB.i18n(`Вибрано інше значення "{0}"<br>
        Так - видалити пункти списків<br>
        Ні - залишити попереднє значення "{1}"`, fieldLabel, fieldLabel))
      .then(function (choice) {
        if (choice) {
          grids.forEach((grid) => {
            grid.getStore().removeAll()
          })
          if (fnCallback) {
            fnCallback(true)
          }
        } else {
          if (fnCallback) {
            fnCallback(false)
          }
        }
      })
  } else {
    if (fnCallback) {
      fnCallback(true)
    }
  }
}

function initDefValues () {
  const me = this
  if (me.isEditMode) {
    return
  }
  const orgID = me.getOrgID(me)
  me.record.set('organizationID', orgID)
}

function beforeGridEdit (me, gridName, context) {
  if (context.record.phantom && context.record.dirtySave !== null && context.record.get('empOrderSicknessID')) {
    context.record.dirtySave = null
  }
  const isPay = me.attr[`${gridName}.isPay`].field
  switch (gridName) {
    case 'sicknessOrders':
      filterEmpOrderSickness(me, context)
      const empOrderSickness = me.attr[`${gridName}.empOrderSicknessID.description`].field
      empOrderSickness.on('change', (ctrl) => {
        me.attr[`${gridName}.empNumDescription`].field.setValue(ctrl.getFieldValue('employeeNumberID.description'))
        me.attr[`${gridName}.illnessReason`].field.setValue(ctrl.getFieldValue('illnessReasonID.name'))
        me.attr[`${gridName}.dateFrom`].field.setValue(ctrl.getFieldValue('dateFrom'))
        me.attr[`${gridName}.dateTo`].field.setValue(ctrl.getFieldValue('dateTo'))
        me.attr[`${gridName}.parent`].field.setValue((!ctrl.getFieldValue('parentID') && (!ctrl.getFieldValue('dateFirst') ||
          AC.dateService.unshiftDate(ctrl.getFieldValue('dateFirst')).getTime() === AC.dateService.unshiftDate(ctrl.getFieldValue('dateFrom')).getTime()))
          ? 'Первинний' : 'Продовжений')
        $App.connection.run({
          entity: 'hr_sicknessMeeting',
          method: 'getCalculatedDaysSickness',
          isPay: true,
          empOrderSicknessID: ctrl.getFieldValue('ID')
        }).then(({ data }) => {
          const calculated = JSON.parse(data)
          if (calculated.dayPay > 0) {
            if (!me.attr[`sicknessOrders.isPay`].field.getValue()) {
              me.attr[`sicknessOrders.isPay`].field.skipChange = true
            }
            me.attr[`sicknessOrders.isPay`].field.setValue(true)
            Object.keys(calculated).forEach(attrName => {
              switch (attrName) {
                case 'dateFromStop':
                  me.attr[`sicknessOrders.${attrName}`].field.setValue(calculated[attrName] ? new Date(calculated[attrName]) : null)
                  break
                default:
                  me.attr[`sicknessOrders.${attrName}`].field.setValue(calculated[attrName])
              }
            })
          } else {
            $App.connection.run({
              entity: 'hr_sicknessMeeting',
              method: 'getCalculatedDaysSickness',
              isPay: false,
              empOrderSicknessID: ctrl.getFieldValue('ID')
            }).then(({ data }) => {
              const calculated = JSON.parse(data)
              if (me.attr[`sicknessOrders.isPay`].field.getValue()) {
                me.attr[`sicknessOrders.isPay`].field.skipChange = true
              }
              me.attr[`sicknessOrders.isPay`].field.setValue(false)
              Object.keys(calculated).forEach(attrName => {
                switch (attrName) {
                  case 'dateFromStop':
                    me.attr[`sicknessOrders.${attrName}`].field.setValue(calculated[attrName] ? new Date(calculated[attrName]) : null)
                    break
                  default:
                    me.attr[`sicknessOrders.${attrName}`].field.setValue(calculated[attrName])
                }
              })
            })
          }
        })
      })
      isPay.on('change', (ctrl, value) => {
        if (ctrl.skipChange) {
          ctrl.skipChange = false
          return
        }
        $App.connection.run({
          entity: 'hr_sicknessMeeting',
          method: 'getCalculatedDaysSickness',
          isPay: isPay.getValue(),
          empOrderSicknessID: empOrderSickness.getFieldValue('ID') // context.record.get('empOrderSicknessID')
        }).then(({ data }) => {
          const calculated = JSON.parse(data)
          Object.keys(calculated).forEach(attrName => {
            switch (attrName) {
              case 'dateFromStop':
                me.attr[`sicknessOrders.${attrName}`].field.setValue(calculated[attrName] ? new Date(calculated[attrName]) : null)
                break
              default:
                me.attr[`sicknessOrders.${attrName}`].field.setValue(calculated[attrName])
            }
          })
        })
      })
      break
    case 'funeralOrders':
      filterEmpOrderFuneral(me, context)
      const empOrderFuneral = me.attr[`${gridName}.empOrderFuneralID.description`].field
      empOrderFuneral.on('change', (ctrl, value) => {
        me.attr[`${gridName}.dead`].field.setValue(ctrl.getFieldValue('dead'))
        me.attr[`${gridName}.addDoc`].field.setValue(ctrl.getFieldValue('addDoc'))
      })
      if (context.record.get('isPay') === null) {
        context.record.set('isPay', true)
      }
      if (!context.record.get('isPay')) {
        me.attr[`${gridName}.refusal`].field.setValue()
      }
      break
  }
}

function addListSickness () {
  const me = this
  me.saveForm().then(result => {
    if (result !== -1) {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_sicknessMeeting',
        method: 'setSicknessList',
        organizationID: me.record.get('organizationID'),
        instanceID: me.instanceID,
        isPay: true
      }).then(({ orderCount }) => {
        me.setLoading(false)
        if (!orderCount) {
          AC.viewUtils.showToast(UB.i18n('Немає жодного неопрацьованого проведеного документу'))
        }
        me.attr.sicknessOrders.store.load()
      }, err => {
        me.setLoading(false)
        throw err
      })
    }
  })
}

function addListFuneral () {
  const me = this
  me.saveForm().then(result => {
    if (result !== -1) {
      me.setLoading(true)
      $App.connection.run({
        entity: 'hr_sicknessMeeting',
        method: 'setFuneralList',
        organizationID: me.record.get('organizationID'),
        instanceID: me.instanceID
      }).then(({ orderCount }) => {
        me.setLoading(false)
        if (!orderCount) {
          AC.viewUtils.showToast(UB.i18n('Немає жодного неопрацьованого проведеного документу'))
        }
        me.attr.funeralOrders.store.load()
      }, err => {
        me.setLoading(false)
        throw err
      })
    }
  })
}

function getReportName () {
  return 'hr_sicknessMeeting'
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  return HR.reportTab.saveReport(me)
}
