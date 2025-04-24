/* global HR AC $App _ Ext appAC UB */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  postInit,
  onFormDataReady,
  onControlChanged,
  onAddNewByCurrent,
  onAfterOrderSave,
  beforeGridEdit,
  viewMark,
  setEmployeeList,
  onGridEdit,
  calc,
  setEmployeeNumbers,
  getPrintDocument
}

function initComponentStart () {
  let me = this
  me.orderConfig = {
    detailGrids: ['payRollDt'],
    customAddNewByCurrent: true,
    hideEditDocNumber: true
  }
  me.viewReason = false
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

  me.actions.printAction = new Ext.Action({
    iconCls: 'fas fa-print',
    cls: 'blue-action',
    actionId: 'printDocumentAction',
    text: UB.i18n('Друкувати'),
    eventId: 'printDocumentAction',
    disabled: true,
    menu: [
      {
        text: UB.i18n('Платіжна відомість. Типова форма № 53'),
        handler: function () {
          getPrintDocument(me, me.instanceID, 'pdf')
        }
      },
      {
        text: UB.i18n('Платіжна відомість. Типова форма № 53 (word)'),
        handler: function () {
          getPrintDocument(me, me.instanceID, 'docx')
        }
      }
    ]
  })
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.payRollDt.length')) {
    me.attr.payRollDt.setLocalStoreData(me.formData.detail.payRollDt)
    me.viewMark(me)
  } else if (data.method !== 'addnew') {
    me.attr.payRollDt.getStore().removeAll()
  }
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.methodGroupID.code': [128, 129] })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })
  me.attr.departmentID.store.ubRequest.__mip_ondate = appAC.globalApplicationDate()
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('organizationID') })
  checkPayOut(me, me.record.get('payElID.methodID.code'))

  me.actions.printAction.setDisabled(me.isNewInstance)
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'payElID':
      if (value) {
        const store = me.attr.payRollDt.getStore()
        const allRecords = store.snapshot || store.data
        allRecords.each(record => {
          record.set('payElID', value)
          record.set('payElID.description', field.getFieldValue('description'))
        })
        me.attr.payRollDt.removeAll()
        checkPayOut(me, field.getFieldValue('methodID.code'))
      }
      break
    case 'departmentID':
    case 'periodSalaryID': {
      me.attr.payRollDt.removeAll()
    }
  }
}

function checkPayOut (me, payElCode) {
  if (['31', '61'].includes(payElCode)) {
    me.down('[name=addBtn]').hide()
  } else {
    me.down('[name=addBtn]').show()
  }
}

function onAddNewByCurrent (data) {
  let me = this
  me.formData = {}
  let detail = data.detail || null
  if (detail && me.isNewInstance) {
    me.docConfig.detailGrids.forEach((detName) => {
      me.attr[detName].setLocalStoreData([])
      detail[detName].forEach((item) => {
        delete item.ID
        delete item.mi_modifyDate
        me.attr[detName].addNewRecord(item)
      })
    })
  }
}

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.payRollDt.setLocalStoreData(me.formData.detail.payRollDt, false, true)
    me.viewMark(me)
  }
}

function beforeGridEdit (me, gridName, context) {
}

function onGridEdit (me, gridName, context) {
  const ctrl = context.column.field
  if (ctrl.flagsFix) {
    if (context.value === null) {
      context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
    } else {
      if (context.column.field.prevValue !== context.value) {
        context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
      }
    }
  }
  context.record.set('reason', (context.record.get('paySum') > 0) ? '0' : '1')
  context.record.set('accrualDt', HR.accrualService.correctAccrualDt(context.record.get('accrualDt'), context.record.get('paySum')))
}
function viewMark (me) {
  if (me.attr.payRollDt.getStore().filters.items.length) {
    me.attr.payRollDt.getStore().removeFilter(me.attr.payRollDt.getStore().filters.items[0])
  }
  me.attr.payRollDt.getStore().addFilter(function (rec) {
    return (me.viewReason ? rec.get('reason') !== '0' : rec.get('reason') === '0')
  })
  me.attr.payRollDt.GridSummary.dataBind()
}

function setEmployeeList (me) {
  if (!me.attr.payElID.getValue() || !me.attr.periodSalaryID.getValue()) {
    return
  }
  const count = me.attr.payRollDt.getStore().snapshot ? me.attr.payRollDt.getStore().snapshot.getCount()
    : me.attr.payRollDt.getStore().count()

  if (count) {
    $App.dialogYesNo('Попередження', UB.i18n('Видалити існуючі записи?'))
      .then(res => {
        if (res) {
          me.attr.payRollDt.removeAll()
          calc(me, true)
        }
      })
  } else {
    me.attr.payRollDt.removeAll()
    calc(me, true)
  }
}

function calc (me, reload) {
  me.setLoading(true)
  let allRecord = me.attr.payRollDt.getStore().snapshot || me.attr.payRollDt.getStore().data
  const params = {
    orgID: me.record.get('organizationID'),
    depID: me.record.get('departmentID'),
    reloadEmployee: reload || false,
    periodCalcID: me.record.get('periodCalcID'),
    periodSalaryID: me.attr.periodSalaryID.getValue(),
    payElID: me.attr.payElID.getValue(),
    orderID: me.instanceID,
    paymentMethod: '3',
    accruals: [],
    orderDate: me.attr.orderDate.getValue()
  }
  if (!reload) {
    allRecord.items.forEach((row, idx) => {
      params.accruals.push(Object.assign(row.getData(), { idx: idx }))
    })
  }

  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'calcPayRollPost',
    params: JSON.stringify(params)
  }).then(response => {
    let data = JSON.parse(response.resultData)
    const store = me.attr.payRollDt.getStore()
    if (reload) {
      for (let i = data.accruals.length - 1; i >= 0; i--) {
        if (data.accruals[i].remove) {
          data.accruals.splice(i, 1)
        } else {
          data.accruals[i].payRolID = me.instanceID
        }
      }
      store.insert(store.data.length, data.accruals)
    } else {
      const updateAttrNames = ['baseSum', 'taxSum', 'paySum', 'reason', 'payRetentionID',
        'employeePayOutID', 'periodCalc', 'periodSalary', 'periodCalcID', 'periodSalaryID', 'dateFrom', 'dateTo',
        'mask', 'rate', 'source', 'sourceID', 'incomingDebtSum', 'repaymentDebtSum', 'calculatedSum', 'repaymentSum',
        'accrualDt'
      ]
      data.accruals.forEach(accr => {
        const record = allRecord.getAt(accr.idx)
        if (accr.remove) {
          me.attr.payRollDt.getStore().remove(record)
        } else {
          updateAttrNames.forEach(attrName => {
            record.set(attrName, accr.hasOwnProperty(attrName) ? accr[attrName] : null)
          })
        }
      })
    }
    me.viewMark(me)
    me.setIsDirty(true)
    me.setLoading(false)
  }, (err) => {
    me.setLoading(false)
    throw err
  })
}
function setEmployeeNumbers (me) {
  if (!me.attr.payElID.getValue() || !me.attr.periodSalaryID.getValue()) {
    return
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberSearch',
    isModal: true,
    cmpInitConfig: {
      orgID: me.record.get('organizationID'),
      readOnlyAttr: ['periodID'],
      defaultValues: {
        periodID: me.record.get('periodSalaryID'),
        depID: me.record.get('departmentID')
      },
      onSelect: (data) => {
        const addEmployeeNumbers = []
        const store = me.attr.payRollDt.getStore()
        const allRecords = store.snapshot || store.data
        const existEmployeeNumbers = []
        const bind = () => {
          me.attr.payRollDt.getStore().un('add', bind)
          me.attr.payRollDt.GridSummary.dataBind()
          me.calc(me)
        }

        data.forEach(row => {
          if (!allRecords.findBy(o => o.get('employeeNumberID') === row.employeeNumberID)) {
            addEmployeeNumbers.push({
              employeeNumberID: row.employeeNumberID,
              'employeeNumberID.description': row['employeeNumberID.description'],
              depName: row.depName,
              posName: row.posName
            })
          } else {
            existEmployeeNumbers.push(row['employeeNumberID.description'])
          }
        })
        me.attr.payRollDt.getStore().on('add', bind)
        me.attr.payRollDt.getStore().insert(allRecords.getCount(), addEmployeeNumbers)
        if (existEmployeeNumbers.length) {
          $App.dialogInfo(UB.i18n(`Працівники які вже були додані раніше </br> {0}`, existEmployeeNumbers.join('</br>')))
        }
      }

    }
  })
}

async function getPrintDocument (me, instanceID, type) {
  me.setLoading(false)
  const isSaved = await me.saveForm()

  if (isSaved === -1) {
    return
  }
  $App.connection.run({
    entity: 'hr_payRoll',
    method: 'docPrintForm',
    params: {
      instanceID,
      type
    }
  }).then(function (result) {
    if (result.doc) {
      switch (type) {
        case 'pdf':
          const report_code = 'payForm53'
          let report = Ext.create('UBS.UBReport', {
            code: report_code,
            type: 'html',
            params: JSON.parse(result.doc)
          })

          report.init().then(function () {
            let config = {
              cmdType: 'showForm',
              formCode: 'ac_documentViewer',
              caption: UB.i18n('Друкована форма'),
              cmpInitConfig: { report }, //, reportData: data.reportData},
              tabId: 'printDocument' + report_code + me.instanceID,
              description: me.initialConfig.commandConfig.description,
              target: $App.getViewport().centralPanel
            }
            $App.doCommand(config)
          })
          break
        case 'docx':
          let doc = JSON.parse(result.doc)
          const fileContent = JSON.parse(doc.fileContent)
          const contentLength = fileContent.length
          const pdfArray = new Uint8Array(new ArrayBuffer(contentLength))
          const filename = doc.fileName + '.docx'
          for (let i = 0; i < contentLength; i++) {
            pdfArray[i] = fileContent.charCodeAt(i)
          }
          const dBlob = new Blob([pdfArray], { type: 'application/msword' })
          saveAs(dBlob, filename)
          break
      }
    }
  }).then(function () {
    me.setLoading(false)
  })
}
