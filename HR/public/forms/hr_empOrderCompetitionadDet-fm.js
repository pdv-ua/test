/* global HR, AC appAC $App Ext */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  enableControls,
  onFormDataReady,
  setPositionFilter,
  fillPosList,
  onBeforeGridEdit
}

function initComponentStart () {
  // Вызывается прямо перед запуском инициализации формы.
  // В этом событии  можно изменить конфигурацию формы.
  let me = this
  me.on('afterrender', function () {
    let win = this.window
    if (win) {
      if (!win.height) {
        win.height = 600
      }
      if (!win.width) {
        win.width = 800
      }
    }
  })
  me.on('formDataReady', onFormDataReady, me)
  me.posVacData = []
}

function fillPosList () {
  const me = this
  const orgID = me.masterForm && me.masterForm.record ? me.masterForm.record.get('organizationID') : appAC.globalOrganization()
  AC.viewUtils.setWhereListProperty(me.attr.departmentID,
    [
      ['orgID', '=', orgID],
      ['state', '=', 'ACTIVE']
    ],
    undefined,
    ['clearWhereList']
  )
  $App.connection.run({
    entity: 'hr_positionVac',
    method: 'selectVacanciesWithVacFrom',
    orgID: me.record.get('organizationID'),
    onDate: me.record.get('dateFrom') || appAC.globalApplicationDate(),
    isAll: me.attr.isAllPosition.getValue()
  }).then((dataObj) => {
    if (dataObj) {
      const posVacData = JSON.parse(dataObj.resultData)
      me.posVacData = posVacData.filter(o => o.vacCount > 0)
    }
  })
}

function onFormDataReady () {
  if (!this.attr.isAllPosition.getValue()) {
    this.fillPosList()
  }
}

function addBaseActions () {
  this.createActions()
  this.callParent(arguments)
}

function enableControls () {
  this.masterForm.enableParaControls(this)
}

function initComponentDone () {
  const me = this
  const sender = me.sender
  AC.viewUtils.setAttr(me)

  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  if (sender) {
    let reco = AC.gridUtils.getCurrentRecord(sender)
    if (reco) {
      let tab = me.down(`[name=${reco.get('mi_unityEntity')}]`)
      if (tab) {
        tab.show()
      }
    }
  }
  me.orderState = me.masterForm.record.get('orderState')
  me.on('beforeClose', function (a) {
    if (sender) {
      let grid = sender.onRefresh ? me.sender : (sender.panel && sender.panel.onRefresh) ? sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  })
  me.on('recordloaded', async function (a) {
    const me = this
    me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
    })
    if (me.isNewInstance) {
      me.record.set('orderID', me.masterForm.instanceID)
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.orderForm.record.get('orderDate')))
      me.record.set('organizationID', me.orderForm.record.get('organizationID'))
    }
    me.onBeforeSave = () => {
      return Promise.resolve(true)
    }

    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.enableControls()
  })
}

function setPositionFilter (ctrl, filterValue, isReload = true) {
  const me = this
  if (!me.attr.isAllPosition.getValue()) {
    const vacPosIDList = me.posVacData.filter(o => o.parentUnitID === filterValue).map(o => o.mi_data_id)
    AC.viewUtils.setWhereListProperty(ctrl, [
      vacPosIDList.length ? [ 'mi_data_id', 'in', vacPosIDList ] : [ 'mi_data_id', '=', -1 ]
    ])
  }
  if (isReload) {
    if (filterValue) {
      ctrl.getStore().load()
    } else {
      ctrl.getStore().loadData([])
    }
  }
}

function onBeforeGridEdit (editor, context) {
  const me = this
  const reco = context.record
  if (!reco.get('organizationID')) {
    reco.set('organizationID', me.record.get('organizationID'))
  }

  const departmentID = editor.query(`[name=departmentID.description]`)[0]
  const positionID = editor.query(`[name=positionID.name]`)[0]
  const onDate = me.record.get('dateFrom') || appAC.globalApplicationDate()

  me.orderForm.filterDepartment({
    form: me,
    ctrl: departmentID,
    onDate: onDate
  })
  if (reco.get('departmentID')) {
    let posStore = positionID.getStore()
    posStore.ubRequest.__mip_recordhistory_all = true
    AC.viewUtils.setWhereListProperty(positionID, [
      ['mi_treePath', 'like', reco.get('departmentID.mi_treePath') || '-1'],
      ['state', '=', 'ACTIVE'],
      ['mi_dateFrom', '<=', onDate],
      ['mi_dateTo', '>=', onDate]
    ], null, ['clearWhereList'])
    me.setPositionFilter(positionID, reco.get('departmentID.mi_data_id') || reco.get('departmentID'), false)
  } else {
    me.orderForm.filterPosition({
      form: me,
      isReload: false,
      isClear: false,
      orgAttr: 'organizationID',
      depCtrl: departmentID,
      posCtrl: positionID,
      onDate: onDate,
      byMiTreePath: true
    })
  }

  departmentID.on('select', ctrl => {
    const onDate = me.record.get('dateFrom') || appAC.globalApplicationDate()
    me.orderForm.filterPosition({
      form: me,
      isReload: false,
      isClear: true,
      orgAttr: 'organizationID',
      depCtrl: ctrl,
      posCtrl: positionID,
      onDate: onDate,
      byMiTreePath: true
    })
    me.setPositionFilter(positionID, ctrl.getFieldValue('mi_data_id'))
  })
  departmentID.on('change', ctrl => {
    const onDate = me.record.get('dateFrom') || appAC.globalApplicationDate()
    if (ctrl.getValue()) {
      me.orderForm.filterPosition({
        form: me,
        isReload: false,
        isClear: true,
        orgAttr: 'organizationID',
        depCtrl: ctrl,
        posCtrl: positionID,
        onDate: onDate,
        byMiTreePath: true
      })
      me.setPositionFilter(positionID, ctrl.getFieldValue('mi_data_id'))
    }
  })
}
