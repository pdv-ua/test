/* global  HR AC  Ext $App UB appAC */
exports.formCode = {
  initComponentStart,
  initComponentDone,
  onAfterRender,
  createActions,
  addBaseActions,
  enableControls,
  beforeSave,
  onBeforeSave,
  onAfterSave,
  onFormRefresh,
  onControlChanged,
  validateForm,
  clearErrors,
  checkDetItems,
  empOrderChgSalEmpDetGridBeforeEdit,
  getEmployeeExperience
}

function getEmployeeExperience (employeeID) {
  let me = this
  let onDate = AC.dateService.shiftDate(me.record.get('dateFrom'))
  let dictExperienceID = me.getField('payElID').getFieldValue('dictExperienceID')

  return Promise.all([
    UB.Repository('hr_employeeExperience')
      .attrs(['MIN([calcDate])'])
      .where('employeeID', '=', employeeID)
      .where('dictExperienceID.methodExpID.code', '=', '8') /* Вислуга в державних органах */
      .selectSingle({
        'MIN([calcDate])': 'calcDate'
      }),
    UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'employeeID', 'dictExperienceID', 'calcDate'])
      .where('employeeID', '=', employeeID)
      .where('dictExperienceID', '=', dictExperienceID)
      .selectAsObject(),
    UB.Repository('hr_employeeNumberS')
      .attrs(['ID', 'dateFrom', 'orgID'])
      .orderBy('dateFrom')
      .where('employeeID', '=', employeeID)
      .selectAsObject()
  ]).then(([minExp, empExp, empNum]) => {
    const empExperience = empExp[0]
    const calcDate1 = minExp && AC.dateService.shiftDate(minExp.calcDate)
    const calcDate2 = empExperience && AC.dateService.shiftDate(empExperience.calcDate)
    let calcDate
    if (calcDate2) {
      if (calcDate2 < new Date(2016, 4, 1)) {
        calcDate = (calcDate1 && calcDate1 < calcDate2) ? calcDate1 : calcDate2
      } else {
        calcDate = calcDate2
      }
    } else {
      calcDate = AC.dateService.shiftDate(empNum.length ? empNum[0].dateFrom : AC.dateService.addDays(onDate, 1))
    }
    const ymd = AC.dateService.getYmd(calcDate, onDate, true)
    return {
      calcDate: calcDate,
      years: ymd.years,
      months: ymd.months,
      days: ymd.days
    }
  })
}

function initComponentStart () {
  const me = this
  me.gridConfig = {
    detailGrids: ['empOrderChgSalEmpDet']
  }
  me.on('recordloaded', onRecordLoaded, me)
  me.on('beforesave', me.beforeSave, me)
  me.on('controlChanged', onControlChanged, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  if (me.customParams.orderForm) {
    me.masterForm = me.orderForm = me.customParams.orderForm
  } else {
    me.masterForm = me.orderForm = me.sender.up('form')
  }
  me.orderState = me.orderForm.record.get('orderState')
  me.on('beforeClose', function () {
    AC.gridUtils.refreshSenderUBGrid(me)
  })
  me.on('recordloaded', async function () {
    const me = this
    me.record.store.on('update', (store, reco, oper, modified, eOpts) => {
      HR.orderManager.showIf(me)
      HR.orderManager.requiredIf(me)
    })
    if (me.isNewInstance) {
      me.record.set('orderID', me.orderForm.instanceID)
      me.record.set('dateFrom', AC.dateService.truncTimeToUtcNull(appAC.globalApplicationDate()))
      me.record.set('organizationID', me.orderForm.record.get('organizationID'))
      me.record.set('isPrintAddition', me.orderForm.record.get('isAppendix'))
    }
    HR.orderManager.setDefaultValues(me)
    HR.orderManager.showIf(me)
    HR.orderManager.requiredIf(me)
    me.enableControls()
    // me.filterDepartment()
  })
  me.on('formDataReady', ctx => {
    HR.orderManager.disableContextMenuItems(me.getField('payElID'), ['addItem', 'editItem'])
    me.down('[name=experience]').setValue(me.record.get('payElID.dictExperienceID.name'))
  })

  me.errors = []
  me.canClose = true
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || me.masterForm.record.get('organizationID') || appAC.globalOrganization()
}

function onAfterRender () {
  const me = this
  me.orderForm.makeReasonSelector(me)
  HR.controlService.checkErrorsOnClose(me)
}

function onRecordLoaded () {
  const me = this
  if (!me.isNewInstance) {
    if (!me.isInternalRefresh) {
      let rawErrorText = me.record.get('errorText')
      if (rawErrorText) {
        me.errors = JSON.parse(rawErrorText)
        let errorText = HR.controlService.getFormErrorsText(me.errors)
        const errorLabel = me.down('[name=errorText]')
        errorLabel.setText(errorText, false)
      }
    } else {
      me.isInternalRefresh = false
    }
  }
}

function createActions () {
  let me = this
  if (!me.actions.fillData) {
    me.actions.fillData = new Ext.Action({
      actionId: 'fillData',
      iconCls: 'fas fa-angle-double-down',
      cls: 'fill-action',
      eventId: 'fillData',
      hidden: true,
      text: UB.i18n('Завантажити згідно вибраним параметрам'),
      handler: async item => {
        let me = item.up('form')
        if (await me.saveForm() === -1) {
          return
        }
        let gridPos = me.down('[name=hr_empOrderChgSalPosDet]')
        let gridEmp = me.down('[name=empOrderChgSalEmpDet]')
        let store = gridPos.getStore()
        await gridPos.onRefresh()
        if (store.getCount()) {
          if (!(await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Вже є заповнені дані. Видалити?')))) {
            return
          }
        } else {
          store = gridEmp.getStore()
          await gridEmp.onRefresh()
          if (store.getCount()) {
            if (!(await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n('Вже є заповнені дані. Видалити?')))) {
              return
            }
          }
        }
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_empOrder-params',
          sender: me,
          customParams: {
            onClose: () => {
              gridPos.onRefresh()
              gridEmp.onRefresh()
            }
          }
        })
      }

    })
  }
}

function addBaseActions () {
  this.createActions()
  this.callParent(arguments)
}

function enableControls () {
  const me = this
  const orderState = me.record.get('orderID.orderState') || 'PROJECT'
  let enabled = orderState === 'PROJECT'
  const grid = me.down('[name=empOrderChgSalEmpDet]')
  const fillPersonsAction = grid.down('[actionId=addByList]')
  if (fillPersonsAction) {
    fillPersonsAction.setDisabled(!enabled)
  }
  const clearPersonsAction = grid.down('[actionId=clearPersons]')
  if (clearPersonsAction) {
    clearPersonsAction.setDisabled(!enabled)
  }
  me.orderForm.enableParaControls(this)
}

function beforeSave (me, params) {
  const formData = { detail: {} }
  if (me.gridConfig.detailGrids) {
    me.gridConfig.detailGrids.forEach((item) => {
      let grid = me.down(`[name=${item}]`)
      formData.detail[item] = grid.getAttributeData()
    })
    params.formData = JSON.stringify(formData)
  }
}

function onBeforeSave () {
  const me = this
  return me.validateForm(true).then(res => {
    me.record.set('errorText', me.errors.length ? JSON.stringify(me.errors) : '')
    if (res) {
      me.errorsIsNotSaved = false
    }
    return res
  })
}

function onAfterSave () {
  const me = this
  me.errorsIsNotSaved = true
  const grid = me.down('[name=empOrderChgSalEmpDet]')
  grid.getStore().load()
}

function onFormRefresh () {
  const me = this
  me.validateForm()
}

function validateForm (showMessage = false) {
  const me = this
  let result = true
  let errors = []
  const errorTag = 1
  let accrualCheckParams

  me.clearErrors()

  const empOrderChgSalEmpDet = me.down('[name=empOrderChgSalEmpDet]')
  const listStore = empOrderChgSalEmpDet.store
  const orderID = me.orderForm.instanceID
  const paraID = me.instanceID
  const empDetItems = listStore.data.items.items

  let isListCheckErr = listStore.getCount() === 0
  if (isListCheckErr) {
    errors.push({
      tag: errorTag,
      code: 'empCheck',
      msg: UB.i18n('Не додано інформацію про працівників')
    })
    result = false
  }

  if (paraID) {
    accrualCheckParams = {
      entity: 'hr_empOrderAddsalarygovDet',
      method: 'checkAccrualDates',
      execParams: {
        orderID: orderID,
        paraID: paraID,
        empDetItems: JSON.stringify(empDetItems)
      },
      // monkey request prevention
      currTime: Date.now()
    }
  }

  const resDetItems = me.checkDetItems(empOrderChgSalEmpDet.getData(), me)
  if (resDetItems.error) {
    errors.push({
      tag: errorTag,
      code: 'empCheck',
      msg: resDetItems.messages
    })
    result = false
  }

  return Promise.resolve(true)
    .then(res => {
      if (accrualCheckParams) {
        return $App.connection.run(accrualCheckParams)
      } else {
        return Promise.resolve()
      }
    }).then(mParams => {
      if (mParams && mParams.msg) {
        errors.push({
          tag: errorTag,
          code: 'accrualEmpCheck',
          msg: mParams.msg
        })
      }
      me.errors = HR.controlService.setFormErrors(me, me.errors, errors, errorTag, showMessage && !me.isClosing, 'errorText')
      me.isClosing = false
      me.canClose = result
      return result
    })
}

function checkDetItems (detRows, me) {
  const requiredFields = ['stageYear', 'stageMonth', 'stageDay', 'accrualRate']
  const res = { error: false, messages: [] }

  detRows.forEach(row => {
    requiredFields.forEach(reqField => {
      const detFieldData = me.attr[`empOrderChgSalEmpDet.${reqField}`]
      if (row[reqField] === null && !detFieldData.hidden) {
        res.error = true
        res.messages.push(UB.i18n(`Для працівника {0} не заповнене поле {1}`, row['employeePositionID.description'], detFieldData.text))
      }
    })
  })

  return res
}

function clearErrors () {
  const me = this
  const formErrors = me.errors
  const errorTag = 0
  if (me.errors.length) {
    me.errors = HR.controlService.setFormErrors(me, formErrors, [], errorTag, false, 'errorText')
    me.errorsIsNotSaved = true
  }
}

function empOrderChgSalEmpDetGridBeforeEdit (rowEditor, context) {
  if (context.grid.isEditDisabled) {
    return false
  }
  let me = this
  let editor = rowEditor.editor
  let reco = context.record
  // let grid = context.grid

  if (!reco.get('ID')) {
    reco.set('dateFrom', me.record.get('dateFrom'))
    reco.set('payElID', me.record.get('payElID'))
    reco.set('empOrderType', 'ADDSALARYGOV')
    reco.set('orderID', me.record.get('orderID'))
    reco.set('organizationID', me.record.get('organizationID'))
    reco.set('paraID', me.instanceID)
  }
  let empPos = editor.query(`[name=employeePositionID.description]`)[0]
  let stageYear = editor.query(`[name=stageYear]`)[0]
  let accrualRate = editor.query(`[name=accrualRate]`)[0]
  let stageMonth = editor.query(`[name=stageMonth]`)[0]
  let stageDay = editor.query(`[name=stageDay]`)[0]
  /* let departmentMiDataId = AC.gridUtils.getCurrentRecord(me.getField('departmentID'))

  if (departmentMiDataId) {
    departmentMiDataId = departmentMiDataId.get('mi_data_id')
  } else {
    departmentMiDataId = null
  } */
  me.orderForm.filterEmployeePosition(me, {
    ctrlToFilter: empPos
    // departmentMiDataId: departmentMiDataId
  })
  AC.viewUtils.setWhereListProperty(empPos, [
    ['positionType', '=', '1']
  ])
  stageYear.on('change', ctrl => {
    let years = Number(ctrl.getValue() || 0)
    let payElID = me.record.get('payElID')
    if (years) {
      // UBHR-4203
      UB.Repository('hr_payElExperience').attrs('rate')
        .where('payElID', '=', payElID)
        .where('years', '<=', years)
        .orderByDesc('years')
        .limit(1)
        .selectScalar()
        .then(rate => {
          accrualRate.setValue(rate || null)
        })
      /*
      // UBHR-1942
      // Якщо кількість років стажу <= 16, то надбавка = кількість років * 3
      // Якщо кількість років стажу >= 17, то надбавка = 50
      let perc = Number(years <= 16 ? years * 3 : 50)
      accrualRate.setValue(perc)
*/
    } else {
      accrualRate.setValue(null)
    }
  })

  stageDay.on('change', ctrl => {
    let days = Number(ctrl.getValue() || 0)
    if (days > 30) {
      stageDay.setValue(null)
    }
  })

  stageMonth.on('change', ctrl => {
    let months = Number(ctrl.getValue() || 0)
    if (months > 11) {
      stageMonth.setValue(null)
    }
  })

  empPos.on('select', ctrl => {
    let employeeID = ctrl.getFieldValue('employeeID')
    if (!employeeID) {
      return
    }
    me.getEmployeeExperience(employeeID).then(data => {
      stageYear.setValue(data.years)
    })
  })
}

function onControlChanged (field) {
  const me = this
  switch (field.name) {
    case 'payElID':
      if (field.skipOnChanged) {
        delete field.skipOnChanged
        return
      }
      me.down('[name=dictFundSourceID]').setValueById(field.getFieldValue('dictFundSourceID'))
      me.down('[name=experience]').setValue(field.getFieldValue('dictExperienceID.name'))
  }
}
