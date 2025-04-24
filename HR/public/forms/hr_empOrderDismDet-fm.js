/* global _ UB AC HR $App moment appAC Ext */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  addBaseActions,
  enableControls,
  onAfterOrderSave,
  recordLoaded,
  onFormDataReady,
  onControlChanged,
  setCntVacDay,
  setRecalcOrgData,
  setTransferOrg,
  setRecalcOrg,
  setVacRecalcData,
  clearRecalcDescription,
  clearVacDays,
  fillVacationList,
  getPartTimeEmployeePosition,
  addRestDays,
  checkVacSubstitution
}

async function getPartTimeEmployeePosition () {
  let me = this
  let onDate = AC.dateService.truncTimeToUtcNull(me.record.get('dateFrom') || new Date())
  let reco = AC.gridUtils.getCurrentRecord(me.getField('employeePositionID'))
  const info = me.down('[name=partTimeEmployeePosition]')
  if (!reco || reco.get('workPlace') !== '1') {
    info.hide()
    return
  }
  let data = await UB.Repository('hr_employeePositionS')
    .attrs(['ID', 'positionID.name', 'departmentID.name', 'mtCount', 'dateFrom', 'dateTo', 'employeeNumberID.tabNum'])
    .where('employeeID', '=', reco.get('employeeID'))
    .where('workPlace', '=', '2')
    .where('organizationID', '=', reco.get('organizationID'))
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .joinCondition('positionID.mi_dateFrom', '<=', onDate)
    .joinCondition('positionID.mi_dateTo', '>=', onDate)
    .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('positionID.state', '=', 'ACTIVE')
    .joinCondition('departmentID.mi_dateFrom', '<=', onDate)
    .joinCondition('departmentID.mi_dateTo', '>=', onDate)
    .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
    .joinCondition('departmentID.state', '=', 'ACTIVE')
    .selectAsObject({
      'positionID.name': 'pos',
      'departmentID.name': 'dep',
      'employeeNumberID.tabNum': 'tabNum'
    })
  const infoLabel = info.down('[name=partTimeEmployeePositionLabel]')
  if (!data.length) {
    info.hide()
    return
  }
  info.show()
  let text = UB.i18n('<table><tr><th align="center">Таб.№</th><th align="center">Підрозділ</th><th align="center">Посада</th><th align="center">Кільк.ставок</th></tr>')
  data.forEach(item => {
    text += `<tr><td width="20%" align="center">${item.tabNum}</td><td width="30%" align="center">${item.dep || ''}</td><td width="30%" align="center">${item.pos}</td><td width="20%" align="center">${item.mtCount}</td></tr>`
  })
  text += '</table>'
  info.setTitle(UB.i18n('Внутрішнє сумісництво на дату ') + moment(onDate).format('DD.MM.YYYY'))
  infoLabel.update(text)
}

function setCntVacDay (ctrl) {
  let me = this
  if (me.orderState !== 'PROJECT' && me.orderState !== 'ON_COMPLETION') {
    return
  }
  let employeePositionCtrl = me.getField('employeePositionID')
  let employeeNumberID = employeePositionCtrl.getFieldValue('employeeNumberID')
  let dateFrom = me.record.get('dateFrom')
  if (!employeeNumberID || !dateFrom) {
    me.getField('cntVacDay').setValue(0)
    return
  }
  let onDate = AC.dateService.truncTimeToUtcNull(dateFrom)
  $App.connection.run({
    entity: 'hr_empVacationPlan',
    method: 'selectData',
    orgID: me.record.get('organizationID') || appAC.globalOrganization(),
    employeeNumberID: employeeNumberID,
    onDate: onDate,
    fieldList: ['dayCount', 'dayDiff', 'dayToUse', 'dateFrom', 'dictVacationKindID.isDismComp', 'ID', 'employeeNumberID'],
    whereList: {
      isDismComp: {
        expression: '[dictVacationKindID.isDismComp]',
        condition: 'equal',
        value: 1
      },
      employeeNumberID: {
        expression: '[employeeNumberID]',
        condition: 'equal',
        value: employeeNumberID
      }
    },
    orderList: {
      orderBy: {
        expression: 'dateFrom',
        order: 'desc'
      }
    },
    customParams: {
      onDate: onDate
    }
  }).then(mParams => {
    let data = mParams.resultData.data
    if (!data || !data.length) {
      me.getField('cntVacDay').setValue(0)
      return
    }
    let dateToUse = 0
    let idx = mParams.resultData.fields.indexOf('dayToUse')
    data.forEach(row => {
      dateToUse += row[idx]
    })
    me.getField('cntVacDay').setValue(dateToUse)
  })
}

function initComponentStart () {
  const me = this
  me.on('formDataReady', onFormDataReady)
  me.on('controlChanged', onControlChanged, me)
  me.on('afterrender', function () {
    me.orderConfig = {
      detailGrids: []
    }
    me.up('window').on('beforeclose', () => {
      if (me.skipBeforeClose) {
        return true
      }
      if (me.masterForm && me.masterForm.record.get('orderState') !== 'PROJECT') {
        return
      }
      me.down('[name=empOrderDismVac]').getStore().load().then(store => {
        if (store.getCount() === 0) {
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_empOrderDismVac',
            method: 'getRecalcDays',
            employeeNumberID: me.record.get('employeeNumberID'),
            orgID: me.record.get('organizationID'),
            onDate: me.attr.dateFrom.getValue() || appAC.globalApplicationDate()
          }).then(function (mParams) {
            me.setLoading(false)
            if (mParams.resultData) {
              const vacData = JSON.parse(mParams.resultData)
              const days = vacData.reduce((s, o) => {
                s = s + o['daysDiff']
                return s
              }, 0)
              if (days > 0) {
                const empFullFIO = me.attr.employeePositionID.getFieldValue('employeeID.fullFIO')
                $App.dialogYesNo('Попередження', UB.i18n('Увага! Працівник {0} на {1} має залишки відпусток. Бажаєте заповнити інформацію про компенсацію відпустки?', empFullFIO, AC.dateService.formatDate(me.record.get('dateFrom'))))
                  .then(choice => {
                    if (!choice) {
                      me.skipBeforeClose = true
                      me.closeWindow(true)
                    }
                  })
              } else {
                me.skipBeforeClose = true
                me.closeWindow(true)
              }
            } else {
              me.skipBeforeClose = true
              me.closeWindow(true)
            }
          })
        } else {
          me.skipBeforeClose = true
          me.closeWindow(true)
        }
      })
      return false
    })
  })
  me.on('recordloaded', recordLoaded)
  me.onBeforeSave = async () => {
    const me = this
    const positionType = me.attr.employeePositionID.getFieldValue('positionType')
    if (positionType === '1') {
      const res = await HR.orderManager.offerToCorrectSeveralPublServRang(me, me.attr.employeePositionID.getFieldValue('employeeID'))
      if (res === false) return Promise.resolve(false)
    }
    return Promise.resolve(true)
  }
  /* me.on('beforeClose', function (a) {
    if (me.sender) {
      let grid = me.sender.onRefresh ? me.sender : (me.sender.panel && me.sender.panel.onRefresh) ? me.sender.panel : null
      if (grid) {
        grid.onRefresh()
      }
    }
  }) */
}

function initComponentDone () {
  let me = this
  if (me.customParams.orderForm) {
    me.masterForm = me.customParams.orderForm
  } else if (me.sender) {
    me.masterForm = me.sender.up('form')
  }
  me.orderForm = me.masterForm
  AC.viewUtils.setAttr(me)
  me.attr.warnText = me.down('[name=warnText]')
  const isEnableReasonDoc = AC.settings.get('hrEnableReasonDoc')
  if (isEnableReasonDoc) {
    me.down('[name=reasonDocPanel]').show()
  }
  createActions(me)
}

function addBaseActions () {
  this.callParent(arguments)
}

async function onFormDataReady () {
  let me = this
  HR.orderManager.disableContextMenuItems(me.getField('employeePositionID'), ['addItem', 'editItem'])
  // me.masterForm && me.masterForm.makeReasonSelector(me)
  // me.orderForm && me.orderForm.makeReasonSelector(me)
  const isReadOnly = !me.masterForm || !(me.masterForm.isEditable && me.masterForm.isEditable()) || me.isReadOnly

  HR.orderManager.enableControls({ me: me, isEnabled: !isReadOnly })
  if (!me.closeForce) {
    me.orderAttrConfigList = await HR.orderManager.loadOrderAttrConfig(me.record.get('empOrderType'), me.record.get('organizationID'))
    setPayElState(me, me.attr.employeePositionID, false)
    if (!me.isNewInstance) {
      setVacSubstitutionState(me, me.attr.employeePositionID.getFieldValue('employeeNumberID'), me.record.get('dateFrom'))
      UB.Repository('hr_dictReasonDism')
        .attrs(['ID', 'name'])
        .where('ID', '=', me.record.get('dictReasonDismID'))
        .selectSingle().then(res => {
          UB.Repository('hr_empOrderDismVac')
            .attrs(['ID', 'dayReturnIsEdit'])
            .where('orderDetID', '=', me.instanceID)
            .selectAsObject().then(empOrderDismVac => {
              if (empOrderDismVac && empOrderDismVac.some(el => el.dayReturnIsEdit)) {
                me.attr.warnText.setText(`Увага! Для причини звільнення "${res.name}" надлишково використана відпустка не відраховується!`)
              } else {
                me.attr.warnText.setText('')
              }
            })
        })
    }
  }
  me.fireEvent('formDataReadyFinished')
}

function recordLoaded () {
  let me = this
  me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
    HR.orderManager.showIf(me)
    if (modified.includes('employeePositionID')) {
      me.getPartTimeEmployeePosition()
    }
  })
  HR.orderManager.showIf(me)
  if (me.isNewInstance) {
    me.record.set('organizationID', me.masterForm.record.get('organizationID'))
    me.record.set('empOrderType', me.masterForm.record.get('empOrderType'))
    me.record.set('orderID', me.masterForm.instanceID)
    me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(me.masterForm.record.get('orderDate')))
  }
  me.orderState = (me.masterForm && me.masterForm.record.get('orderState')) || 'POSTED'
  let isProject = me.orderState === 'PROJECT'
  if (isProject && !me.isNextRecordMakerExists) {
    me.isNextRecordMakerExists = true
    HR.orderManager.setNextRecordMaker(me, [
      'dictReasonDismID',
      {
        isExternal: value => value,
        bonusID: value => value,
        organizationID: value => me.masterForm.record.get('organizationID'),
        empOrderType: value => value,
        orderID: value => value
      }
    ], 4)
  }
  me.masterForm.filterEmployeePosition(me, {
    attrToFilter: 'employeePositionID'
  })

  const transferOrg = me.down('[name=transferOrg]')
  transferOrg.setValue(me.record.get('transferOrgName') || me.record.get('transferOrg.name'))
  const vacRecalcOrganizationName = me.down('[name=vacRecalcOrganizationName]')
  vacRecalcOrganizationName.setValue(me.record.get('vacRecalcOrganizationName') || me.record.get('vacRecalcOrganizationID.name'))
  me.enableControls()
  HR.orderManager.setDefaultValues(me)
}

function enableControls () {
  const me = this
  let isProject = me.orderState === 'PROJECT'
  const transferOrg = me.down('[name=transferOrg]')
  transferOrg.setDisabled(!me.record.get('byTransfer'))
  transferOrg.setReadOnly(!isProject)
  const vacRecalcOrganizationName = me.down('[name=vacRecalcOrganizationName]')
  vacRecalcOrganizationName.setReadOnly(!isProject)
  me.down('[name=vacRecalcOrganizationName]').setDisabled(!me.record.get('isTransferVac'))
  me.down('[name=vacRecalcDescription]').setDisabled(!me.record.get('isTransferVac'))
  const empOrderDismVac = me.down('[name=empOrderDismVac]')
  AC.gridUtils.enableCustomAction(empOrderDismVac, 'addRestDays', isProject)
  AC.gridUtils.enableCustomAction(empOrderDismVac, 'clearDismVac', isProject)
  const empOrderVacSubstitutionDet = me.down('[name=empOrderVacSubstitutionDet]')
  AC.gridUtils.enableCustomAction(empOrderVacSubstitutionDet, 'fillVacSubstitutionAction', isProject)
  // return me.masterForm && me.masterForm.enableParaControls(this)
}

function setPayElState (me, field, clearValue) {
  const config = HR.orderManager.findOrderAttrConfig(me.orderAttrConfigList, field.getFieldValue('dictStaffCatID'), field.getFieldValue('positionType'))
  if (config) {
    if (clearValue || !me.record.get('vacCompPayElID')) {
      me.attr.vacCompPayElID.setValueById(config.payElIDMain)
    }
    me.attr.vacCompPayElID.setDisabled(!config.canEditPayElMain)
    if (clearValue || !me.record.get('severancePayElID')) {
      me.attr.severancePayElID.setValueById(config.payElIDAccrual)
    }
    me.attr.severancePayElID.setDisabled(!config.canEditPayElAccrual)
    if (clearValue || !me.record.get('vacRecalcPayElID')) {
      me.attr.vacRecalcPayElID.setValueById(config.payElIDAdd)
    }
    me.attr.vacRecalcPayElID.setDisabled(!config.canEditPayElAdd)
  } else {
    me.attr.vacCompPayElID.setDisabled(true)
    me.attr.severancePayElID.setDisabled(true)
    me.attr.vacRecalcPayElID.setDisabled(true)
    if (me.isNewInstance) {
      me.attr.vacCompPayElID.setValue()
      me.attr.severancePayElID.setValue()
      me.attr.vacRecalcPayElID.setValue()
    }
  }
}

function onControlChanged (ctrl, value, oldValue) {
  const me = this
  if (me.isInternalChange) {
    return
  }
  switch (ctrl.name) {
    case 'employeePositionID':
      const empOrderDismVac = me.down('[name=empOrderDismVac]')
      const dismVacStore = empOrderDismVac.getStore()
      if (dismVacStore && dismVacStore.getCount()) {
        $App.dialogYesNo(UB.i18n('Раніше додані записи компенсації відпустки будуть видалені. Продовжити?'))
          .then(function (res) {
            if (res) {
              me.addRestDays()
            } else {
              me.isInternalChange = true
              try {
                me.attr.employeePositionID.setValue(oldValue)
              } finally {
                me.isInternalChange = false
              }
            }
          })
      }
      setPayElState(me, ctrl, true)
      me.checkVacSubstitution(ctrl, value, oldValue)
      setVacSubstitutionState(me, ctrl.getFieldValue('employeeNumberID'), me.attr.dateFrom.getValue())
      break
    case 'dateFrom':
      setVacSubstitutionState(me, me.attr.employeePositionID.getFieldValue('employeeNumberID'), value)
      me.checkVacSubstitution(ctrl, value, oldValue)
      break
    case 'byTransfer':
      me.down('[name=transferOrg]').setDisabled(!value)
      // me.attr.vacRecalcDayCount.setDisabled(!value)
      me.attr.vacRecalcOrganizationName.setDisabled(!value)
      me.attr.vacRecalcDescription.setDisabled(!value)
      break
    case 'isTransferVac':
      me.setRecalcOrgData()
      me.attr.vacRecalcOrganizationName.setDisabled(!value)
      me.attr.vacRecalcDescription.setDisabled(!value)
      break
  }
}

function setVacSubstitutionState (me, employeeNumberID, dateFrom) {
  if (!dateFrom || !employeeNumberID || !AC.dateService.isValid(dateFrom)) return
  if (me.orderState !== 'PROJECT' && me.orderState !== 'ON_COMPLETION') return
  $App.connection.run({
    entity: 'hr_empOrderVacSubstitutionDet',
    method: 'checkVacSubstitution',
    execParams: {
      employeeNumberID: employeeNumberID,
      dateFrom: AC.dateService.shiftDate(dateFrom)
    }
  }).then(mParams => {
    const grid = me.down('[name=empOrderVacSubstitutionDet]')
    grid.actions['addNew'].setDisabled(!mParams.isValid)
    me.down('[actionId=fillVacSubstitutionAction]').setDisabled(!mParams.isValid)
  })
}

function checkVacSubstitution (ctrl, value, oldValue) {
  const me = this
  const grid = me.down('[name=empOrderVacSubstitutionDet]')
  grid.getStore().load().then(store => {
    if (store.data.length) {
      $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Внесена інформація на вкладці "Продовжити час перебування на посаді" буде видалена! Продовжити?'))
        .then(result => {
          if (result) {
            $App.connection.run({
              entity: 'hr_empOrderVacSubstitutionDet',
              method: 'clearVacSubstitutionDet',
              paraID: me.instanceID
            }).then(() => {
              grid.onRefresh()
              return true
            })
          } else {
            me.isInternalChange = true
            try {
              ctrl.setValue(oldValue)
            } finally {
              me.isInternalChange = false
            }
          }
        })
    }
  })
}

function onAfterOrderSave () {
  const me = this
  me.enableControls()
}

function setRecalcOrgData () {
  const me = this
  let isTransferVac = me.attr.isTransferVac.getValue()
  if (isTransferVac) {
    const transferOrgCtrl = me.down('[name=transferOrg]')
    me.setRecalcOrg(transferOrgCtrl, true)
    me.setVacRecalcData()
  } else {
    me.clearVacDays()
  }
}

function setTransferOrg (ctrl) {
  const me = this
  const reco = me.record
  let orgID = ctrl.getValue()
  let txtVal = ctrl.rawValue
  reco.set('transferOrgName', txtVal)
  if (_.isNumber(orgID)) {
    reco.set('transferOrg', orgID)
  } else {
    reco.set('transferOrg', null)
  }
}

function setRecalcOrg (ctrl, toSetField = false) {
  const me = this
  const reco = me.record
  let orgID = ctrl.getValue()
  let txtVal = ctrl.rawValue
  reco.set('vacRecalcOrganizationName', txtVal)
  if (_.isNumber(orgID)) {
    reco.set('vacRecalcOrganizationID', orgID)
  } else {
    reco.set('vacRecalcOrganizationID', null)
  }
  if (toSetField) {
    me.isInternalChange = true
    try {
      me.attr.vacRecalcOrganizationName.setValue(txtVal)
    } finally {
      me.isInternalChange = false
    }
  }
}

function setVacRecalcData (ctrl) {
  const me = this
  const reco = me.record
  const vacRecalcDescription = me.down('[name=vacRecalcDescription]')
  let orgID = reco.get('vacRecalcOrganizationID')
  if (!orgID) {
    me.clearRecalcDescription(vacRecalcDescription)
    return
  }
  let dateFrom = reco.get('dateFrom')
  let orgAccData
  UB.Repository('ac_orgAccount')
    .attrs(['code', 'bankID.description'])
    .where('organizationID', '=', orgID)
    .where('acctype', '=', 'CHECK')
    .selectSingle().then(data => {
      orgAccData = data
      return UB.Repository('hr_organization')
        .attrs(['EDRPOUCode'])
        .where('mi_data_id', '=', orgID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: dateFrom })
        .selectSingle()
    }).then(org => {
      let recalcDesc = org && org.EDRPOUCode ? UB.i18n(`ЄДРПОУ: {0}`, org.EDRPOUCode) : ''
      if (orgAccData) {
        if (recalcDesc.length) {
          recalcDesc += ', '
        }
        recalcDesc += UB.i18n(`ДКСУ: {0}, {1}`, orgAccData.code, orgAccData['bankID.description'])
      }
      vacRecalcDescription.setValue(recalcDesc)
      reco.set('vacRecalcDescription', recalcDesc)
    })
}

function clearRecalcDescription (ctrl) {
  const me = this
  if (!ctrl) {
    ctrl = me.down('[name=vacRecalcDescription]')
  }
  ctrl.setValue()
  me.record.set('vacRecalcDescription', null)
}

function clearVacDays () {
  const me = this
  $App.connection.run({
    entity: 'hr_empOrderDismVac',
    method: 'clearRecalcDays',
    orderDetID: me.instanceID
  }).then(mParams => {
    const empOrderDismVac = me.down('[name=empOrderDismVac]')
    empOrderDismVac.loadData()
  })
}

function fillVacationList () {
  const me = this
  delete me.vacationList
  return UB.Repository('hr_empVacationPlan')
    .attrs(['dictVacationKindID'])
    .where('employeeNumberID', '=', me.record.get('employeeNumberID'))
    .groupBy(['dictVacationKindID'])
    .selectAsObject().then(data => {
      me.vacationList = data.map(item => item.dictVacationKindID)
      return Promise.resolve(true)
    })
}

function addRestDays () {
  const me = this
  $App.connection.run({
    entity: 'hr_empOrderDismVac',
    method: 'addRecalcDays',
    employeePositionID: me.record.get('employeePositionID'),
    orderDetID: me.instanceID,
    orgID: me.record.get('organizationID'),
    dictReasonDismID: me.record.get('dictReasonDismID') || 0,
    onDate: me.attr.dateFrom.getValue() || appAC.globalApplicationDate()
  }).then(function (resData) {
    if (resData.result) {
      resData.data = resData.data && JSON.parse(resData.data)
      if (me.record.get('dictReasonDismID') && resData.data.length && resData.data.some(el => el.dayReturn !== 0)) {
        UB.Repository('hr_dictReasonDism')
          .attrs([ 'ID', 'name' ])
          .where('ID', '=', me.record.get('dictReasonDismID'))
          .selectSingle().then(res => {
            me.attr.warnText.setText(`Увага! Для причини звільнення "${res.name}" надлишково використана відпустка не відраховується!`)
          })
      } else {
        me.attr.warnText.setText('')
      }
      const empOrderDismVac = me.down('[name=empOrderDismVac]')
      empOrderDismVac.loadData()
    }
  })
}

function createActions (me) {
  if (!$App.domainInfo.isEntityMethodsAccessible('hr_empOrderDismDet', 'canEditDismReason')) {
    return
  }
  const tb = me.down('toolbar')
  const allActions = tb && tb.query('[menuId=AllActions]')[0]
  if (!allActions) {
    return
  }

  allActions.menu.add({
    xtype: 'menuseparator'
  })

  allActions.menu.add({
    text: UB.i18n('Редагувати причину звільнення'),
    name: 'actionAllowEdit',
    disabled: !$App.domainInfo.isEntityMethodsAccessible('hr_empOrderDismDet', 'canEditDismReason'),
    handler: function () {
      me.attr.dictReasonDismID.setReadOnly(false)
      Ext.defer(() => {
        me.attr.dictReasonDismID.focus()
      }, 200)
    }
  })
}
