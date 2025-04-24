/* global appAC UB HR AC _ $App Ext */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  postInit,
  onFormDataReady,
  onControlChanged,
  onAfterOrderSave,
  initOrderComponentDone,
  beforeGridEditWork,
  beforeGridEditNomenclature,
  beforeGridEditMaterial,
  onGridEditWork,
  onGridEditNomenclature,
  onGridEditMaterial,
  calcRecords,
  calcDocument,
  changeParams,
  setEmployeeNumbers,
  setNomenclatureList,
  setMaterialList,
  onCheckValidBeforeSaveOrder,
  getDimension
}

function initComponentStart () {
  let me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt', 'docRegNomenclature', 'docRegMaterial'] // ,
    // customAddNewByCurrent: true
  }
  HR.orderManager.init(me)
}
function addBaseActions () {
  const me = this
  me.orderActions = {
    actions: ['calcDocAction', 'fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['calcDocAction', 'postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }

  me.actions.calcDocAction = new Ext.Action({
    iconCls: 'fas fa-calculator',
    cls: 'green-action',
    scale: 'medium',
    tooltip: UB.i18n('Розрахувати'),
    text: UB.i18n('Розрахувати'),
    actionId: 'calcDocAction',
    handler: function () {
      me.calcDocument(me)
    }
  })

  me.actions.copyDocAction = new Ext.Action({
    iconCls: 'u-icon-copy',
    cls: 'add-currect-action',
    scale: 'medium',
    tooltip: UB.i18n('Копіювати документ'),
    text: UB.i18n('Копіювати документ'),
    actionId: 'copyDocAction',
    handler: function () {
      copyDocument(me)
    }
  })

  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.docRegNomenclature.length')) {
    me.attr.docRegNomenclature.setLocalStoreData(me.formData.detail.docRegNomenclature)
  } else if (data.method !== 'addnew') {
    me.attr.docRegNomenclature.getStore().removeAll()
  }
  if (_.get(me, 'formData.detail.docRegMaterial.length')) {
    me.attr.docRegMaterial.setLocalStoreData(me.formData.detail.docRegMaterial)
  } else if (data.method !== 'addnew') {
    me.attr.docRegMaterial.getStore().removeAll()
  }
  if (_.get(me, 'formData.detail.orderRegistryDt.length')) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.getStore().removeAll()
  }
  // HR.orderManager.setSourceOrderDescription(me)
  // me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  // me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
}

function initOrderComponentDone (me) {
  // HR.orderManager.orderRegistryInit(me)
  // me.attr.baseSum.on('blur', changeParams)
  // me.attr.rate.on('blur', changeParams)
  // me.attr.baseSum.on('keypress', onKeypress)
  // me.attr.rate.on('keypress', onKeypress)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance && me.defaultValues) {
    if (me.defaultValues.isCopy) {
      delete me.defaultValues.isCopy
    }
    if (me.defaultValues.docRegNomenclature && me.defaultValues.docRegNomenclature.length) {
      me.attr.docRegNomenclature.setLocalStoreData(me.defaultValues.docRegNomenclature, false, true)
      delete me.defaultValues.docRegNomenclature
    }
    if (me.defaultValues.docRegMaterial && me.defaultValues.docRegMaterial.length) {
      me.attr.docRegMaterial.setLocalStoreData(me.defaultValues.docRegMaterial, false, true)
      delete me.defaultValues.docRegMaterial
    }
    if (me.defaultValues.orderRegistryDt && me.defaultValues.orderRegistryDt.length) {
      me.attr.orderRegistryDt.setLocalStoreData(me.defaultValues.orderRegistryDt, false, true)
      delete me.defaultValues.orderRegistryDt
    }
    _.forEach(me.defaultValues, (value, name) => {
      me.record.set(name, value)
    })
  }
  me.attr.docRegNomenclature.setReadOnly(me.record.get('orderState') === 'POSTED')
  me.attr.docRegMaterial.setReadOnly(me.record.get('orderState') === 'POSTED')
  me.attr.orderRegistryDt.setReadOnly(me.record.get('orderState') === 'POSTED')
  // me.attr.orderRegistryDt.down('[actionId=addNewOrder]')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  // AC.viewUtils.getActionFromContextMenu(me.attr.orderRegistryDt, 'addNewOrder')[me.record.get('orderState') === 'POSTED' ? 'hide' : 'show']()
  if (me.isNewInstance) {
    me.setTitle(`${UB.i18n('Змінний бригадний наряд')} ${me.record.get('orderNumber')} (${UB.i18n('Створення')})`)
  } else {
    me.setTitle(`${UB.i18n('Змінний бригадний наряд')} ${me.record.get('orderNumber')}`)
  }
  HR.orderManager.setOrderRegistryActions(me)
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: appAC.globalOrganization(), isClosed: 0 }, [])
  AC.viewUtils.setFilterValue(me.attr.payElID, { 'methodID.code': '159' })
  if (me.isNewInstance) {
    UB.Repository('hr_payEl')
      .attrs('ID', 'useDictTech')
      .where('methodID.code', '=', '159')
      .selectSingle().then(rec => {
        if (rec) {
          me.record.set('payElID', rec.ID)
          const mainTab = me.down(`[name=orderRegistryDt]`)
          setTabVisible(me, 'docRegNomenclature', rec.useDictTech, mainTab)
          setTabVisible(me, 'docRegMaterial', rec.useDictTech, mainTab)
        }
      })
    UB.Repository('hr_dictPeriod')
      .attrs('ID', 'dateFrom', 'dateTo')
      .where('orgID', '=', appAC.globalOrganization())
      .where('isCurrent', '=', 1)
      .selectSingle()
      .then(rec => {
        if (rec) {
          me.record.set('periodID', rec.ID)
          if (AC.dateService.currentDate() > AC.dateService.shiftDate(rec.dateTo)) {
            me.record.set('orderDate', AC.dateService.shiftDate(rec.dateTo))
          } else if (AC.dateService.currentDate() < AC.dateService.shiftDate(rec.dateFrom)) {
            me.record.set('orderDate', AC.dateService.shiftDate(rec.dateFrom))
          } else {
            me.record.set('orderDate', AC.dateService.currentDate())
          }
        }
      })
  } else {
    const useDictTech = me.record.get('payElID.useDictTech')
    const mainTab = me.down(`[name=orderRegistryDt]`)
    setTabVisible(me, 'docRegNomenclature', useDictTech, mainTab)
    setTabVisible(me, 'docRegMaterial', useDictTech, mainTab)
  }

  if (!me.record.get('orderNumber')) {
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'getOrderNum',
      organizationID: appAC.globalOrganization(),
      onDate: me.attr.periodID.getFieldValue('dateFrom')
    }).then((result) => {
      me.attr.orderNumber.setValue(result.orderNumber)
    })
  }

  const isReadOnly = me.record.get('orderState') === 'POSTED' // || !!me.record.get('empOrderID')
  me.attr['orderDate'].setReadOnly(isReadOnly)
  me.attr['orderNumber'].setReadOnly(isReadOnly)
  me.attr['payElID'].setReadOnly(isReadOnly)
}

function onControlChanged (me, field, value, oldValue) {
  switch (field.name) {
    case 'orderDate':
      if (value) {
        UB.Repository('hr_dictPeriod')
          .attrs('ID')
          .where('orgID', '=', appAC.globalOrganization())
          .where('dateFrom', '<=', value)
          .where('dateTo', '>=', value)
          .selectSingle().then(rec => {
            if (rec) {
              me.attr.periodSalaryID.setValueById(rec.ID)
            }
          })
        me.calcDocument(me)
      }
      break
    case 'payElID':
    case 'periodSalaryID':
      if (value) {
        me.calcDocument(me)
      }
      break
  }
}

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.docRegNomenclature.setLocalStoreData(me.formData.detail.docRegNomenclature, false, true)
    me.attr.docRegMaterial.setLocalStoreData(me.formData.detail.docRegMaterial, false, true)
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
  }
}

function beforeGridEditWork (me, context) {
  if (me.record.get('empOrderID') && !['paySum'].includes(context.column.dataIndex)) {
    context.column.field.setReadOnly(true)
    return false
  }
  if (!me.attr.payElID.getValue()) {
    $App.dialogInfo(UB.i18n('Не вказано вид оплати.'))
    return false
  }
  me.setIsDirty(true)

  if (context.column.dataIndex === 'employeeNumberID.description') {
    AC.viewUtils.setFilterValue(context.column.field, {
      orgID: me.record.get('organizationID'),
      dateFrom: { value: me.attr.orderDate.getValue(), condition: '<=' },
      dateTo: { value: me.attr.orderDate.getValue(), condition: '>=' }
    })
    AC.viewUtils.setValueOnChange(context.column.field,
      {
        'depName': 'depName',
        'posName': 'posName',
        'tabNum': 'tabNum',
        'workPlaceCode': 'employeeNumberID.workPlaceCode',
        'dateToEmpty': 'employeeNumberID.dateToEmpty',
        // 'mi_deleteUser': 'employeeNumberID.mi_deleteUser',
        // 'mi_createDate': 'mi_createDate',
        // 'mi_modifyDate': 'mi_modifyDate',
        'mi_createUser.fullName': 'mi_createUser.fullName',
        'mi_modifyUser.fullName': 'mi_modifyUser.fullName'
      },
      context.record,
      ['clearValue']
    )
  }
  // if (context.column.dataIndex === 'dictFundSourceID.name') {
  //   context.column.field.store.ubRequest.method = 'selectByOrg'
  //   context.column.field.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
  // }

  if ([null, ''].includes(context.record.get('paySum'))) {
    context.record.set('paySum', 0)
  }
}

function onGridEditWork (me, context) {
  const ctrl = context.column.field

  function calcCurrentRecord () {
    const params = {
      orgID: me.record.get('organizationID'),
      periodCalcID: me.attr.periodID.getValue(),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      orderParams: {
        orderDate: me.attr.orderDate.getValue(),
        payElID: me.attr.payElID.getValue()
      },
      workList: [{
        employeeNumberID: context.record.get('employeeNumberID'),
        'employeeNumberID.description': context.record.get('employeeNumberID.description'),
        dictTechID: context.record.get('dictTechID'),
        'dictTechID.description': context.record.get('dictTechID.description'),
        periodCalcID: me.attr.periodID.getValue(),
        periodSalaryID: me.attr.periodSalaryID.getValue(),
        periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
        periodSalary: me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateFrom: me.attr.orderDate.getValue(),
        dateTo: me.attr.orderDate.getValue(),
        payElID: me.attr.payElID.getValue(),
        baseSum: context.record.get('baseSum'),
        // rate: context.record.get('rate'),
        dictWorkOperationID: context.record.get('dictWorkOperationID'),
        'dictWorkOperationID.description': context.record.get('dictWorkOperationID.description'),
        payment: context.record.get('payment'),
        // dictMeasureID: context.record.get('dictMeasureID'),
        norm: context.record.get('norm'),
        planQuantity: context.record.get('planQuantity'),
        yield: context.record.get('yield'),
        paySum: context.record.get('paySum') !== '' ? context.record.get('paySum') : null,
        flagsFix: context.record.get('flagsFix'),
        flagsRec: 1 << 1 | context.record.get('flagsRec'),
        idx: context.rowIdx
      }]
    }
    me.calcRecords(me, params)
  }

  context.record.set('payElID', me.attr.payElID.getValue())
  context.record.set('periodCalcID', me.attr.periodID.getValue())
  context.record.set('periodSalaryID', me.attr.periodSalaryID.getValue())
  context.record.set('periodCalc', me.attr.periodID.getFieldValue('dateFrom'))
  context.record.set('periodSalary', me.attr.periodSalaryID.getFieldValue('dateFrom'))
  context.record.set('dateFrom', me.attr.orderDate.getValue())
  context.record.set('dateTo', me.attr.orderDate.getValue())
  context.record.set('mask', 0)

  // context.column.field.name
  if (context.value !== context.originalValue) {
    if (ctrl.flagsFix) {
      context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
    }
    if (context.record.get('employeeNumberID') && context.record.get('dictWorkOperationID') && context.record.get('dateFrom')) {
      calcCurrentRecord()
    }
  }
}

function calcRecords (me, params) {
  if (!!params.periodSalaryID && !!me.attr.payElID.getValue()) {
    me.setLoading('Розрахунок...')
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'calcRegistryWorkShift',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)

      const nomenclatureStore = me.attr.docRegNomenclature.getStore()
      data.nomenclatureList.forEach(row => {
        let record = nomenclatureStore.getAt(row.idx)
        if (!record) {
          nomenclatureStore.insert(row.idx, { dictTechID: row.dictTechID, nomenclatureID: row.nomenclatureID })
          record = nomenclatureStore.getAt(row.idx)
        }
        record.set('dictTechID.description', row['dictTechID.description'])
        record.set('nomenclatureID.description', row['nomenclatureID.description'])
        record.set('norm', row.norm)
        record.set('planQuantity', row.planQuantity)
        record.set('quantity', row.quantity)
      })
      me.attr.docRegNomenclature.GridSummary.dataBind()

      const materialStore = me.attr.docRegMaterial.getStore()
      data.materialList.forEach(row => {
        let record = materialStore.getAt(row.idx)
        if (!record) {
          materialStore.insert(row.idx, { dictTechID: row.dictTechID, nomenclatureID: row.nomenclatureID })
          record = materialStore.getAt(row.idx)
        }
        record.set('baseSum', row.baseSum)
        record.set('dictTechID', row.dictTechID)
        record.set('dictTechID.description', row['dictTechID.description'])
        record.set('nomenclatureID', row.nomenclatureID)
        record.set('nomenclatureID.description', row['nomenclatureID.description'])
        record.set('norm', row.norm)
        record.set('planQuantity', row.planQuantity)
        record.set('quantity', row.quantity)
        record.set('flagsFix', row.flagsFix)
      })
      // me.attr.docRegMaterial.GridSummary.dataBind()

      const workStore = me.attr.orderRegistryDt.getStore()
      data.workList.forEach(row => {
        let record = workStore.getAt(row.idx)
        if (!record) {
          workStore.insert(row.idx, {
            employeeNumberID: row.employeeNumberID,
            dictTechID: row.dictTechID,
            dictWorkOperationID: row.dictWorkOperationID
          })
          record = workStore.getAt(row.idx)
        }
        if (row['employeeNumberID.description']) {
          record.set('employeeNumberID.description', row['employeeNumberID.description'])
        }
        if (row['dictTechID.description']) {
          record.set('dictTechID.description', row['dictTechID.description'])
        }
        if (row['dictWorkOperationID.description']) {
          record.set('dictWorkOperationID.description', row['dictWorkOperationID.description'])
        }
        record.set('baseSum', row.baseSum)
        record.set('paySum', row.paySum)
        record.set('periodCalcID', me.attr.periodID.getValue())
        record.set('periodCalc', me.attr.periodID.getFieldValue('dateFrom'))
        record.set('periodSalaryID', row.periodSalaryID)
        record.set('periodSalary', row.periodSalary)
        record.set('dateFrom', row.dateFrom)
        record.set('dateTo', row.dateTo)
        record.set('mask', row.mask)
        record.set('days', row.days)
        record.set('hours', row.hours)
        record.set('planHours', row.planHours)
        record.set('planDays', row.planDays)
        record.set('dictWorkOperationID', row.dictWorkOperationID)
        record.set('payment', row.payment)
        const paymentEnum = row.payment ? UB.core.UBEnumManager.getStore('PIECEWORK_PAYMENT').getById(row.payment) : null
        record.set('payment.name', paymentEnum ? paymentEnum.get('name') : '')
        // record.set('dictMeasureID', row.dictMeasureID)
        record.set('norm', row.norm)
        record.set('planQuantity', row.planQuantity)
        record.set('yield', row.yield)
        record.set('payElID', me.attr.payElID.getValue())
        record.set('payElID.description', me.attr.payElID.getFieldValue('description'))
        record.set('dictFundSourceID', row.dictFundSourceID)
        record.set('dictFundSourceID.name', row['dictFundSourceID.name'])
        record.set('flagsRec', row.flagsRec)
        record.set('accrualDt', JSON.stringify(row.accrualDt))
      })
      me.attr.orderRegistryDt.GridSummary.dataBind()
      calcNomenclaturePaySum(me)
      me.attr.docRegNomenclature.GridSummary.dataBind()
      me.setIsDirty(true)
      me.setLoading(false)
    }, function (err) {
      me.setLoading(false)
      throw err
    })
  }
}

function calcDocument (me) {
  const params = {
    orgID: me.record.get('organizationID'),
    periodCalcID: me.attr.periodID.getValue(),
    periodSalaryID: me.attr.periodSalaryID.getValue(),
    orderParams: {
      orderDate: me.attr.orderDate.getValue(),
      payElID: me.attr.payElID.getValue()
    }
  }
  params.nomenclatureList = getNomenclatureList(me)
  params.materialList = getMaterialList(me)
  params.workList = getWorkList(me)
  if (params.nomenclatureList.length || params.workList.length) {
    me.calcRecords(me, params)
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  if (me.record.get('orderState') !== 'PROJECT' || ctrl.readOnly) {
    return
  }
  me.calcDocument(me)
  me.setIsDirty(true)
}

function setEmployeeNumbers (me) {
  if (!me.attr.payElID.getValue()) {
    $App.dialogInfo(UB.i18n('Не вказано вид оплати!'))
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
        periodID: me.record.get('periodID')
      },
      onSelect: (data) => {
        const records = []
        const store = me.attr.orderRegistryDt.getStore()
        const insertGridRecords = () => {
          me.attr.orderRegistryDt.getStore().un('clear', insertGridRecords)
          data.forEach(row => {
            if (!store.findRecord('employeeNumberID', row.employeeNumberID)) {
              row['employeeNumberID.dateToEmpty'] = row['dateToEmpty']
              delete row['dateToEmpty']
              row['employeeNumberID.workPlaceCode'] = row['workPlaceCode']
              delete row['workPlaceCode']
              row.payElID = me.attr.payElID.getValue()
              row.periodCalcID = me.attr.periodID.getValue()
              row.periodSalaryID = me.attr.periodSalaryID.getValue()
              row.periodCalc = me.attr.periodID.getFieldValue('dateFrom')
              row.periodSalary = me.attr.periodSalaryID.getFieldValue('dateFrom')
              row.dateFrom = me.attr.orderDate.getValue()
              row.dateTo = me.attr.orderDate.getValue()
              row.mask = 0
              records.push(row)
            }
          })
          if (records.length) {
            const bind = () => {
              me.attr.orderRegistryDt.getStore().un('add', bind)
              me.attr.orderRegistryDt.GridSummary.dataBind()
              me.calcDocument(me)
              me.attr.docRegNomenclature.GridSummary.dataBind()
              me.setIsDirty(true)
            }
            me.attr.orderRegistryDt.getStore().on('add', bind)
            me.attr.orderRegistryDt.getStore().insert(me.attr.orderRegistryDt.getStore().data.length, records)
          }
        }

        if (me.attr.orderRegistryDt.getStore().count()) {
          $App.dialogYesNo('Попередження', UB.i18n('Видалити наявні записи?'))
            .then(res => {
              if (res) {
                me.attr.orderRegistryDt.getStore().on('clear', insertGridRecords)
                me.attr.orderRegistryDt.removeAll()
              } else {
                insertGridRecords()
              }
            })
        } else {
          insertGridRecords()
        }
      }
    }
  })
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  const workStore = me.attr.orderRegistryDt.getStore()
  const workRecords = workStore.snapshot || workStore.data
  if (workRecords.find(record => !record.get('employeeNumberID'))) {
    $App.dialogInfo(UB.i18n('Не призначено виконавців робіт. Збереження неможливе.'))
    return Promise.resolve(false)
  }
  return Promise.resolve(true)
}

function getDimension (me, record) {
  if (record) {
    const accrualDt = record.get('accrualDt')
    if (accrualDt) {
      $App.connection.run({
        entity: 'hr_rl',
        method: 'getDimension',
        params: typeof accrualDt === 'object' ? JSON.stringify(accrualDt) : accrualDt,
        orgID: me.record.get('organizationID')
      }).then(response => {
        const data = JSON.parse(response.resultData)
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rlDimension',
          isModal: true,
          cmpInitConfig: {
            defaultValues: data,
            typeData: 'orderRegistryDt'
          }
        })
      })
    }
  }
}

function beforeGridEditNomenclature (me, context) {
  // if (me.record.get('empOrderID') && !['paySum'].includes(context.column.dataIndex)) {
  //   context.column.field.setReadOnly(true)
  //   return false
  // }
  // if (!me.attr.payElID.getValue()) {
  //   $App.dialogInfo(UB.i18n('Не вказано вид оплати.'))
  //   return false
  // }
  me.setIsDirty(true)

  // if (context.column.dataIndex === 'employeeNumberID.description') {
  //   AC.viewUtils.setFilterValue(context.column.field, {
  //     orgID: me.record.get('organizationID'),
  //     dateFrom: { value: me.attr.orderDate.getValue(), condition: '<=' },
  //     dateTo: { value: me.attr.orderDate.getValue(), condition: '>=' }
  //   })
  //   AC.viewUtils.setValueOnChange(context.column.field,
  //     {
  //       'depName': 'depName',
  //       'posName': 'posName',
  //       'tabNum': 'tabNum',
  //       'workPlaceCode': 'employeeNumberID.workPlaceCode',
  //       'dateToEmpty': 'employeeNumberID.dateToEmpty',
  //       'mi_deleteUser': 'employeeNumberID.mi_deleteUser',
  //       'mi_createDate': 'mi_createDate',
  //       'mi_modifyDate': 'mi_modifyDate',
  //       'mi_createUser.fullName': 'mi_createUser.fullName',
  //       'mi_modifyUser.fullName': 'mi_modifyUser.fullName'
  //     },
  //     context.record,
  //     ['clearValue']
  //   )
  // }

  // if ([null, ''].includes(context.record.get('paySum'))) {
  //   context.record.set('paySum', 0)
  // }
}

function onGridEditNomenclature (me, context) {
  const ctrl = context.column.field
  if (context.value !== context.originalValue) {
    if (ctrl.flagsFix) {
      context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
    }
  }
  switch (context.column.field.name) {
    case 'dictTechID.description':
      context.record.set('nomenclatureID', ctrl.getFieldValue('nomenclatureID'))
      context.record.set('nomenclatureID.description', ctrl.getFieldValue('nomenclatureID.description'))
      context.record.set('norm', ctrl.getFieldValue('quantity'))
      context.record.set('planQuantity', ctrl.getFieldValue('planQuantity'))
      context.record.set('quantity', ctrl.getFieldValue('quantity'))
      context.record.set('nomenclatureID.dictMeasureID.symbolUkr', ctrl.getFieldValue('nomenclatureID.dictMeasureID.symbolUkr'))
      me.calcDocument(me)
      break
    case 'norm':
    case 'planQuantity':
      me.calcDocument(me)
      break
  }
}

function beforeGridEditMaterial (me, context) {
  // if (me.record.get('empOrderID') && !['paySum'].includes(context.column.dataIndex)) {
  //   context.column.field.setReadOnly(true)
  //   return false
  // }
  // if (!me.attr.payElID.getValue()) {
  //   $App.dialogInfo(UB.i18n('Не вказано вид оплати.'))
  //   return false
  // }
  me.setIsDirty(true)

  // if (context.column.dataIndex === 'employeeNumberID.description') {
  //   AC.viewUtils.setFilterValue(context.column.field, {
  //     orgID: me.record.get('organizationID'),
  //     dateFrom: { value: me.attr.orderDate.getValue(), condition: '<=' },
  //     dateTo: { value: me.attr.orderDate.getValue(), condition: '>=' }
  //   })
  //   AC.viewUtils.setValueOnChange(context.column.field,
  //     {
  //       'depName': 'depName',
  //       'posName': 'posName',
  //       'tabNum': 'tabNum',
  //       'workPlaceCode': 'employeeNumberID.workPlaceCode',
  //       'dateToEmpty': 'employeeNumberID.dateToEmpty',
  //       'mi_deleteUser': 'employeeNumberID.mi_deleteUser',
  //       'mi_createDate': 'mi_createDate',
  //       'mi_modifyDate': 'mi_modifyDate',
  //       'mi_createUser.fullName': 'mi_createUser.fullName',
  //       'mi_modifyUser.fullName': 'mi_modifyUser.fullName'
  //     },
  //     context.record,
  //     ['clearValue']
  //   )
  // }

  // if ([null, ''].includes(context.record.get('paySum'))) {
  //   context.record.set('paySum', 0)
  // }
}

function onGridEditMaterial (me, context) {
  const ctrl = context.column.field
  if (context.value !== context.originalValue) {
    if (ctrl.flagsFix) {
      context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
    }
  }
  switch (context.column.field.name) {
    case 'planQuantity':
      if (context.value !== context.originalValue && !(context.record.get('flagsFix') & 1)) {
        context.record.set('quantity', context.value)
      }
      break
  }
}

function setNomenclatureList (me) {
  if (!me.attr.payElID.getValue()) {
    $App.dialogInfo(UB.i18n('Не вказано вид оплати!'))
    return
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_dictTechList',
    isModal: true,
    cmpInitConfig: {
      onDate: me.attr.orderDate.getValue(),
      onSelect: (data) => {
        const records = []
        const store = me.attr.docRegNomenclature.getStore()
        const insertGridRecords = () => {
          me.attr.docRegNomenclature.getStore().un('clear', insertGridRecords)
          data.forEach(row => {
            if (!store.findRecord('dictTechID', row.dictTechID)) {
              const record = {
                ID: null,
                dictTechID: row.ID,
                'dictTechID.description': row.description,
                nomenclatureID: row.nomenclatureID,
                'nomenclatureID.description': row['nomenclatureID.description'],
                norm: row.quantity,
                planQuantity: row.quantity,
                quantity: row.quantity,
                flagsFix: 0,
                paySum: 0
              }
              records.push(record)
            }
          })
          if (records.length) {
            const bind = () => {
              me.attr.docRegNomenclature.getStore().un('add', bind)
              me.attr.docRegNomenclature.GridSummary.dataBind()
            }
            me.attr.docRegNomenclature.getStore().on('add', bind)
            me.attr.docRegNomenclature.getStore().insert(me.attr.docRegNomenclature.getStore().data.length, records)
            me.calcDocument(me)
            me.setIsDirty(true)
          }
        }

        if (me.attr.docRegNomenclature.getStore().count()) {
          $App.dialogYesNo('Попередження', UB.i18n('Видалити наявні записи?'))
            .then(res => {
              if (res) {
                me.attr.docRegMaterial.removeAll()
                me.attr.orderRegistryDt.removeAll()
                me.attr.docRegNomenclature.getStore().on('clear', insertGridRecords)
                me.attr.docRegNomenclature.removeAll()
              } else {
                insertGridRecords()
              }
            })
        } else {
          insertGridRecords()
        }
      }
    }
  })
}

function setMaterialList (me) {
  if (!me.attr.payElID.getValue()) {
    $App.dialogInfo(UB.i18n('Не вказано вид оплати!'))
    return
  }
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_dictMaterialList',
    isModal: true,
    cmpInitConfig: {
      onDate: me.attr.orderDate.getValue(),
      onSelect: (data) => {
        const records = []
        const store = me.attr.docRegMaterial.getStore()
        const insertGridRecords = () => {
          me.attr.docRegMaterial.getStore().un('clear', insertGridRecords)
          data.forEach(row => {
            if (!store.findRecord('nomenclatureID', row.ID)) {
              const record = {
                ID: null,
                nomenclatureID: row.ID,
                'nomenclatureID.description': row.description,
                norm: 0,
                planQuantity: 0,
                quantity: 0,
                flagsFix: 0
              }
              records.push(record)
            }
          })
          if (records.length) {
            const bind = () => {
              me.attr.docRegMaterial.getStore().un('add', bind)
              // me.attr.docRegMaterial.GridSummary.dataBind()
            }
            me.attr.docRegMaterial.getStore().on('add', bind)
            me.attr.docRegMaterial.getStore().insert(me.attr.docRegMaterial.getStore().data.length, records)
            // me.calcDocument(me)
            me.setIsDirty(true)
          }
        }

        if (me.attr.docRegMaterial.getStore().count()) {
          $App.dialogYesNo('Попередження', UB.i18n('Видалити наявні записи?'))
            .then(res => {
              if (res) {
                me.attr.docRegMaterial.getStore().on('clear', insertGridRecords)
                me.attr.docRegMaterial.removeAll()
              } else {
                insertGridRecords()
              }
            })
        } else {
          insertGridRecords()
        }
      }
    }
  })
}

function setTabVisible (me, tabName, visible, mainTab) {
  const tabs = me.down('[name=tabs]')
  const child = tabs.child(`[name=${tabName}]`)
  const { tab } = child
  if (tab) {
    if (visible) {
      tab.show()
    } else {
      const activeTab = tabs.getActiveTab()
      if (activeTab.name === tabName) {
        tabs.setActiveTab(mainTab)
      }
      tab.hide()
    }
  }
}

function calcNomenclaturePaySum (me, includeExtraPaySum = true) {
  me.attr.docRegNomenclature.getStore().data.items.forEach((nomenclature, idx) => {
    nomenclature.set('paySum',
      me.attr.orderRegistryDt.getStore().data.items
        .filter(o => o.get('dictTechID') === nomenclature.get('dictTechID'))
        .reduce((a, b) => { return a + b.get('paySum') }, 0)
    )
  })

  if (includeExtraPaySum) {
    const extraPaySum = me.attr.orderRegistryDt.getStore().data.items
      .filter(o => !o.get('dictTechID'))
      .reduce((a, b) => { return a + b.get('paySum') }, 0)
    if (extraPaySum) {
      const nomenclatureList = me.attr.docRegNomenclature.getStore().data.items
      const totalPaySum = nomenclatureList.reduce((a, b) => { return a + b.get('paySum') }, 0)
      if (totalPaySum) {
        let leftOver = extraPaySum
        nomenclatureList.forEach((nomenclature, idx) => {
          let paySum = nomenclature.get('paySum')
          if (paySum) {
            const addSum = AC.currencyService.round(extraPaySum * nomenclature.get('paySum') / totalPaySum, 2)
            paySum += addSum
            nomenclature.set('paySum', paySum)
            leftOver -= addSum
          }
        })
        if (leftOver) {
          const index = nomenclatureList.findIndex(o => o.get('paySum'))
          if (index >= 0) {
            let paySum = nomenclatureList[index].get('paySum')
            paySum += leftOver
            nomenclatureList[index].set('paySum', paySum)
          }
        }
      }
    }
  }
}

function copyDocument (me) {
  const defaultValues = {}
  Object.keys(me.attr)
    .filter(name => typeof me.attr[name].getValue === 'function')
    .forEach(name => { defaultValues[name] = me.attr[name].getValue() })
  defaultValues['orderNumber'] = null
  defaultValues['orderState'] = 'PROJECT'
  defaultValues['docRegNomenclature'] = getNomenclatureList(me)
  defaultValues['docRegMaterial'] = getMaterialList(me)
  defaultValues['orderRegistryDt'] = getWorkList(me)
  defaultValues['isCopy'] = true
  HR.orderManager.createNewOrder('hr_orderRegistry', defaultValues, 'hr_orderRegistryWorkShift')
}

function getNomenclatureList (me) {
  const nomenclatureList = []
  me.attr.docRegNomenclature.getStore().clearFilter()
  me.attr.docRegNomenclature.getData()
    .filter((rec) => rec.dictTechID)
    .forEach((data, idx) => {
      nomenclatureList.push({
        dictTechID: data.dictTechID,
        'dictTechID.description': data['dictTechID.description'],
        nomenclatureID: data.nomenclatureID,
        'nomenclatureID.description': data['nomenclatureID.description'],
        norm: data.norm,
        planQuantity: data.planQuantity,
        quantity: data.quantity,
        flagsFix: data.flagsFix,
        paySum: data.paySum,
        idx: idx
      })
    })
  return nomenclatureList
}

function getMaterialList (me) {
  const materialList = []
  me.attr.docRegMaterial.getStore().clearFilter()
  me.attr.docRegMaterial.getData()
    .filter((rec) => rec.nomenclatureID)
    .forEach((data, idx) => {
      materialList.push({
        dictTechID: data.dictTechID,
        'dictTechID.description': data['dictTechID.description'],
        nomenclatureID: data.nomenclatureID,
        'nomenclatureID.description': data['nomenclatureID.description'],
        norm: data.norm,
        planQuantity: data.planQuantity,
        quantity: data.quantity,
        flagsFix: data.flagsFix,
        idx: idx
      })
    })
  return materialList
}

function getWorkList (me) {
  const workList = []
  me.attr.orderRegistryDt.getStore().clearFilter()
  me.attr.orderRegistryDt.getData()
    .filter((rec) => rec.employeeNumberID && rec.dictWorkOperationID && rec.dateFrom)
    .forEach((data, idx) => {
      workList.push({
        employeeNumberID: data.employeeNumberID,
        'employeeNumberID.description': data['employeeNumberID.description'],
        dictTechID: data.dictTechID,
        'dictTechID.description': data['dictTechID.description'],
        periodCalcID: me.attr.periodID.getValue(),
        periodSalaryID: me.attr.periodSalaryID.getValue(),
        periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
        periodSalary: me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateFrom: me.attr.orderDate.getValue(),
        dateTo: me.attr.orderDate.getValue(),
        dictWorkOperationID: data.dictWorkOperationID,
        'dictWorkOperationID.description': data['dictWorkOperationID.description'],
        payment: data.payment,
        // dictMeasureID: data.dictMeasureID,
        mask: data.mask,
        norm: data.norm,
        planQuantity: data.planQuantity,
        yield: data.yield,
        payElID: me.attr.payElID.getValue(),
        baseSum: data.baseSum,
        paySum: data.paySum,
        flagsFix: data.flagsFix,
        flagsRec: 1 << 1,
        idx: idx,
        dictFundSourceID: data.dictFundSourceID
      })
    })
  return workList
}
