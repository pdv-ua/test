/* global HR AC $App _ appAC UB Ext saveAs AC Blob appHR */
exports.formCode = {
  initComponentStart,
  addBaseActions,
  postInit,
  onFormDataReady,
  onControlChanged,
  onAfterOrderSave,
  beforeGridEdit,
  setEmployeeNumbers,
  onGridEdit,
  calcRegistryRequestEmp,
  initOrderComponentDone,
  reCalc,
  onCheckValidBeforeSaveOrder,
  getDimension
}

function onCheckValidBeforeSaveOrder () {
  const me = this
  const store = me.attr.orderRegistryDt.getStore()
  const allRecords = store.snapshot || store.data
  allRecords.each(function (record) {
    if (!record.get('employeeNumberID') && !record.get('ID')) {
      store.remove(record)
    }
  })
  return Promise.resolve(true)
}

function initComponentStart () {
  const me = this
  me.orderConfig = {
    detailGrids: ['orderRegistryDt'],
    customAddNewByCurrent: true
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

  me.actions.exportExcel = new Ext.Action({
    text: UB.i18n('Вигрузка в Excel'),
    scale: 'medium',
    iconCls: 'fas fa-file-excel',
    tooltip: UB.i18n('Сформувати'),
    cls: 'green-action',
    xtype: 'button',
    handler: function (btn) {
      function setStyles () {
        defFont = stl.fonts.add({
          code: 'def',
          name: 'Calibri',
          fontSize: 11,
          scheme: 'minor'
        })
        stl.fonts.add({
          code: 'defBold',
          name: 'Calibri',
          fontSize: 11,
          scheme: 'minor',
          bold: true
        })

        defBoldFont = stl.fonts.add({
          code: 'defBold',
          name: 'Calibri',
          fontSize: 11,
          scheme: 'minor',
          bold: true
        })

        borderFull = stl.borders.add({
          left: {
            style: 'thin'
          },
          right: {
            style: 'thin'
          },
          top: {
            style: 'thin'
          },
          bottom: {
            style: 'thin'
          }
        })
        stl.alignments.add({
          code: 'Hright',
          horizontal: 'right'
        })
        stl.alignments.add({
          code: 'Hcenter',
          horizontal: 'center',
          wrapText: '1'
        })
        stl.alignments.add({
          code: 'HVright',
          horizontal: 'right',
          vertical: 'right',
          wrapText: '1'
        })
        stl.alignments.add({
          code: 'HVcenter',
          horizontal: 'center',
          vertical: 'center',
          wrapText: '1'
        })
        stl.alignments.add({
          code: 'wrapText',
          wrapText: '1'
        })
        styleCol = stl.getStyle({
          font: defFont
        })
        styleSummaryCol = stl.getStyle({
          font: defBoldFont,
          alignment: stl.alignments.named.HVright
        })
        headerStyle = stl.getStyle({
          font: stl.fonts.named.defBold,
          alignment: stl.alignments.named.HVcenter
        })
        rowHeaderStyle = stl.getStyle({
          font: stl.fonts.named.defBold,
          fill: 'EBEDED',
          border: borderFull,
          alignment: stl.alignments.named.HVcenter
        })
      }

      let wb, defFont, ws, borderFull, headerStyle, rowHeaderStyle, stl, styleCol, styleSummaryCol, defBoldFont
      wb = new window.XLSX.XLSXWorkbook()
      wb.useSharedString = true
      stl = wb.style
      setStyles()
      let data = me.down('grid').getData()
      let columns = me.down('grid').columns.filter(o => !o.hidden).map(o => [o.dataIndex, o.text])
      let fName = UB.i18n('Документ нарахування')
      const orgName = appAC.globalOrganizationName()
      const periodName = me.attr.periodSalaryID.getFieldValue('description')
      const payElID = me.attr.payElID.getFieldValue('description')
      const baseSum = me.attr.baseSum.getValue()
      const rate = me.attr.rate.getValue()
      const docNumber = me.attr.docNumber.getValue()
      const orderDate = me.attr.orderDate.getValue()

      ws = wb.addWorkSheet({ caption: UB.i18n('Документ нарахування'), name: UB.i18n('Документ нарахування') })
      if (orgName) {
        ws.addMerge({ colFrom: 0, colTo: columns.length })
        ws.addRow({ value: `Організація: ${orgName}`, column: 0, style: headerStyle }, {}, { height: 30 })
      }
      if (payElID) {
        ws.addMerge({ colFrom: 0, colTo: columns.length })
        ws.addRow({ value: `Вид оплати: ${payElID}`, column: 0, style: headerStyle }, {}, { height: 30 })
      }
      if (periodName) {
        ws.addMerge({ colFrom: 0, colTo: columns.length })
        ws.addRow({ value: `За період: ${periodName}`, column: 0, style: headerStyle }, {}, { height: 30 })
      }
      if (rate) {
        ws.addMerge({ colFrom: 0, colTo: columns.length })
        ws.addRow({ value: `Відсоток: ${rate}`, column: 0, style: headerStyle }, {}, { height: 30 })
      }
      if (baseSum) {
        ws.addMerge({ colFrom: 0, colTo: columns.length })
        ws.addRow({ value: `Сума: ${baseSum}`, column: 0, style: headerStyle }, {}, { height: 30 })
      }
      if (docNumber) {
        ws.addMerge({ colFrom: 0, colTo: columns.length })
        ws.addRow({
          value: `Наказ №${docNumber}${orderDate ? ' від ' + AC.dateService.formatDate(orderDate) : ''}`,
          column: 0,
          style: headerStyle
        }, {}, { height: 30 })
      }

      let columnsWidth = {
        'employeeNumberID.description': 50,
        'baseSum': 20,
        'rate': 20,
        'paySumAccrual': 20,
        'paySum': 20,
        'posName': 50,
        'depName': 50
      }
      let colsProperties = []
      let colsHeaders = []
      let isIncludeSummary = false
      columns.forEach((el, idx) => {
        colsProperties.push({ column: idx, width: columnsWidth[el[0]] || 20 })
        colsHeaders.push({ column: idx, value: el[1], style: rowHeaderStyle })
        if (['paySum', 'paySumAccrual'].includes(el[0])) {
          isIncludeSummary = true
        }
      })
      ws.setColsProperties(colsProperties)
      ws.addRow(colsHeaders, null, { height: 30 })
      let paySum = 0
      let paySumAccrual = 0
      data.forEach(fix => {
        let dataRow = []
        columns.forEach((el, idx) => {
          dataRow.push({ column: idx, value: fix[el[0]], style: styleCol })
        })
        paySum += fix.paySum
        paySumAccrual += fix.paySumAccrual
        ws.addRow(dataRow, null, { height: 20 })
      })

      if (isIncludeSummary) {
        let includeSummText = false
        let idx = 0
        while (idx < columns.length) {
          if (!['paySum', 'paySumAccrual'].includes(columns[idx][0])) {
            includeSummText = true
            break
          } else {
            break
          }
        }
        let dataRow = []
        const addSumText = (idx) => {
          if (includeSummText) {
            ws.addMerge({ colFrom: 0, colTo: idx - 1 })
            dataRow.push({ column: 0, value: UB.i18n('Всього'), style: styleSummaryCol })
            includeSummText = false
          }
        }

        columns.forEach((el, idx) => {
          switch (el[0]) {
            case 'paySum':
              addSumText(idx)
              dataRow.push({ column: idx, value: paySum, style: styleSummaryCol })
              break
            case 'paySumAccrual':
              addSumText(idx)
              dataRow.push({ column: idx, value: paySumAccrual, style: styleSummaryCol })
              break
            default:

              break
          }
        })
        ws.addRow(dataRow, null, { height: 20 })
      }

      const rData = wb.render()
      const dBlob = new Blob([rData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) // data:  ;base64
      saveAs(dBlob, fName + '.xlsx')
    }
  })
}

function postInit (me, record, data) {
  if (_.get(me, 'formData.detail.orderRegistryDt.length')) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt)
  } else if (data.method !== 'addnew') {
    me.attr.orderRegistryDt.getStore().removeAll()
  }
  HR.orderManager.setSourceOrderDescription(me)
}

function initOrderComponentDone (me) {
  me.attr.baseSum.on('blur', changeParams)
  me.attr.rate.on('blur', changeParams)
  me.attr.baseSum.on('keypress', onKeypress)
  me.attr.rate.on('keypress', onKeypress)
}

function onKeypress (ctrl, e) {
  if (e.getKey() === e.ENTER) {
    changeParams(ctrl)
  }
}

function changeParams (ctrl) {
  const me = ctrl.up('form')
  const value = ctrl.getValue()
  if (me.record.get('orderState') !== 'PROJECT' || ctrl.readOnly) {
    return
  }
  const store = me.attr.orderRegistryDt.getStore()
  const allRecords = store.snapshot || store.data
  let reCalcRate = false
  switch (ctrl.name) {
    case 'rate':
      if (value) {
        me.attr.baseSum.setValue()
        allRecords.each(record => {
          let flagsFix = record.get('flagsFix')
          flagsFix = ((flagsFix & ~2) & ~me.attr.baseSum.flagsFix) | me.attr.rate.flagsFix
          record.set('flagsFix', flagsFix)
          record.set('rate', value)
        })
        reCalcRate = true
      } else {
        allRecords.each(record => {
          record.set('flagsFix', record.get('flagsFix') & ~(1 << 9))
          record.set('rate', null)
        })
      }
      break
    case 'baseSum':
      if (value) {
        me.attr.rate.setValue()
        allRecords.each(record => {
          let flagsFix = record.get('flagsFix')
          flagsFix = (flagsFix & ~me.attr.rate.flagsFix) | me.attr.baseSum.flagsFix
          record.set('flagsFix', flagsFix)
          record.set('baseSum', value)
          record.set('rate', null)
        })
      } else {
        allRecords.each(record => {
          if (record.get('flagsFix') & 1) {
            record.set('flagsFix', record.get('flagsFix') & ~1)
          }
          record.set('baseSum', 0)
        })
      }
      break
  }
  me.reCalc(me, false, reCalcRate)
}

function reCalc (me, clearFundSource, reCalcRate) {
  const params = {
    orgID: me.record.get('organizationID'),
    periodCalcID: me.attr.periodID.getValue(),
    periodSalaryID: me.attr.periodSalaryID.getValue(),
    orderParams: {
      orderRate: me.attr.rate.getValue(),
      reCalcRate,
      orderDate: me.attr.orderDate.getValue(),
      dailyWage: me.attr.dailyWage.getValue(),
      checkBalance: me.attr.checkBalance.getValue()
    },
    payElParams: []
  }
  me.attr.orderRegistryDt.getStore().clearFilter()
  me.attr.orderRegistryDt.getData().forEach((data, idx) => {
    params.payElParams.push({
      employeeNumberID: data.employeeNumberID,
      periodCalcID: me.attr.periodID.getValue(),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
      periodSalary: me.attr.periodSalaryID.getFieldValue('dateFrom'),
      dateFrom: data.dateFrom || me.attr.periodSalaryID.getFieldValue('dateFrom'),
      dateTo: data.dateTo || me.attr.periodSalaryID.getFieldValue('dateTo'),
      dateFromAvg: data.dateFromAvg,
      dateToAvg: data.dateToAvg,
      payElID: me.attr.payElID.getValue(),
      baseSum: data.baseSum,
      rate: data.rate,
      paySum: data.paySum,
      paySumAccrual: data.paySum,
      flagsFix: data.flagsFix,
      flagsRec: 2,
      idx: idx
    })
  })
  me.calcRegistryRequestEmp(me, params)
}

function onFormDataReady () {
  const me = this
  if (me.isNewInstance) {
    me.record.set('periodSalaryID', me.record.get('periodID'))
    if (me.defaultValues) {
      _.forEach(me.defaultValues, (value, name) => {
        me.record.set(name, value)
      })
    }
  }
  const globalOrganization = appAC.globalOrganization()
  appHR.getCurrentPeriod(globalOrganization).then(response => {
    let payElStore = me.attr.payElID.getStore()
    if (response) {
      AC.viewUtils.setFilterValue(me.attr.payElID, {
        'methodID.code': '62',
        'dateTo': { value: response.dateFrom, condition: '>=' },
        'dateFrom': { value: response.dateTo, condition: '<=' }
      })
    }
    payElStore.load()
  })
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })

  const readOnlyAttr = ['orderDate', 'docNumber', 'payElID']
  const isReadOnly = me.record.get('orderState') === 'POSTED' || !!me.record.get('empOrderID')
  readOnlyAttr.forEach(attrName => {
    me.attr[attrName].setReadOnly(isReadOnly)
  })
  if (!me.record.get('docNumber')) {
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'getOrderNum',
      organizationID: appAC.globalOrganization(),
      onDate: me.attr.periodID.getFieldValue('dateFrom')
    }).then((result) => {
      me.attr.docNumber.setValue(result.orderNumber)
    })
  }
  me.attr.baseSum.setReadOnly(me.record.get('orderState') !== 'PROJECT' || me.record.get('empOrderID') ||
    !['SUMRATE', 'SUM'].includes(me.attr.payElID.getFieldValue('methodID.valuation')))
  me.attr.rate.setReadOnly(me.record.get('orderState') !== 'PROJECT' || me.record.get('empOrderID') ||
    !['SUMRATE', 'RATE'].includes(me.attr.payElID.getFieldValue('methodID.valuation')))
  if (me.record.get('empOrderID')) {
    me.attr.orderRegistryDt.hideActions = ['addNewByCurrent', 'del', 'addNew', 'addList']
    me.attr.orderRegistryDt.hideActions.forEach(actName => {
    })
    // me.attr.orderRegistryDt.menu.items.items.forEach(act => { act.setDisabled(true) })
    const toolBar = me.attr.orderRegistryDt.down('toolbar')
    if (toolBar && toolBar.items && toolBar.items.items) {
      toolBar.items.items.forEach(item => {
        item.setDisabled(_.includes(me.attr.orderRegistryDt.hideActions, item.name))
        item.setVisible(!_.includes(me.attr.orderRegistryDt.hideActions, item.name))
      })
    }
  }
}

function onControlChanged (me, field, value) {
  switch (field.name) {
    case 'payElID':
      if (value) {
        me.attr.baseSum.setReadOnly(!['SUMRATE', 'SUM'].includes(me.attr.payElID.getFieldValue('methodID.valuation')))
        me.attr.rate.setReadOnly(!['SUMRATE', 'RATE'].includes(me.attr.payElID.getFieldValue('methodID.valuation')))
        const rate = me.attr.rate.getValue()
        if (rate) {
          const store = me.attr.orderRegistryDt.getStore()
          const allRecords = store.snapshot || store.data
          allRecords.each(record => {
            let flagsFix = record.get('flagsFix')
            record.set('flagsFix', ((flagsFix & ~2) & ~me.attr.baseSum.flagsFix) | me.attr.rate.flagsFix)
            record.set('rate', rate)
            record.set('baseSum', null)
          })
        }

        me.reCalc(me, false, !!rate)
      }
      break
    case 'periodSalaryID':
      if (value) {
        me.reCalc(me, false, true)
      }
      break
    case 'dailyWage':
    case 'checkBalance':
      me.reCalc(me, false, false)
      break
  }
}

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
  }
}

function beforeGridEdit (me, context) {
  if (me.record.get('empOrderID') && !['paySum'].includes(context.column.dataIndex)) {
    context.column.field.setReadOnly(true)
    return false
  }
  if (!me.attr.payElID.getValue()) {
    $App.dialogInfo(UB.i18n('Не вказано вид оплати!'))
    return false
  }
  me.setIsDirty(true)

  if (context.column.dataIndex === 'employeeNumberID.description') {
    AC.viewUtils.setFilterValue(context.column.field, {
      orgID: me.record.get('organizationID'),
      dateFrom: { value: me.attr.periodID.getFieldValue('dateTo'), condition: '<=' }
    })
    AC.viewUtils.setValueOnChange(context.column.field,
      {
        'depName': 'depName',
        'posName': 'posName',
        'tabNum': 'tabNum',
        'workPlaceCode': 'employeeNumberID.workPlaceCode',
        'dateToEmpty': 'employeeNumberID.dateToEmpty',
        'mi_deleteUser': 'employeeNumberID.mi_deleteUser',
        'mi_createDate': 'mi_createDate',
        'mi_modifyDate': 'mi_modifyDate',
        'mi_createUser.fullName': 'mi_createUser.fullName',
        'mi_modifyUser.fullName': 'mi_modifyUser.fullName'
      },
      context.record,
      ['clearValue']
    )
  }
  if ([null, ''].includes(context.record.get('flagsFix'))) {
    context.record.set('flagsFix', me.attr.rate.getValue() ? me.attr.rate.flagsFix : me.attr.baseSum.getValue() ? me.attr.baseSum.flagsFix : 0)
  }
  if ([null, ''].includes(context.record.get('baseSum'))) {
    context.record.set('baseSum', me.attr.baseSum.getValue() ? me.attr.baseSum.getValue() : 0)
  }
  if ([null, ''].includes(context.record.get('rate'))) {
    context.record.set('rate', me.attr.rate.getValue() ? me.attr.rate.getValue() : null)
    if (me.attr.rate.getValue()) {
      me.reCalcRate = true
    }
  }
  if ([null, ''].includes(context.record.get('paySumAccrual'))) {
    context.record.set('paySumAccrual', 0)
  }
  if ([null, ''].includes(context.record.get('paySum'))) {
    context.record.set('paySum', 0)
  }
}

function onGridEdit (me, context) {
  const ctrl = context.column.field

  function addRecord () {
    const params = {
      orgID: me.record.get('organizationID'),
      periodCalcID: me.attr.periodID.getValue(),
      periodSalaryID: me.attr.periodSalaryID.getValue(),
      orderParams: {
        orderRate: me.attr.rate.getValue(),
        reCalcRate: true, //!!me.reCalcRate,
        orderDate: me.attr.orderDate.getValue(),
        dailyWage: me.attr.dailyWage.getValue(),
        checkBalance: me.attr.checkBalance.getValue()
      },
      orderRate: me.attr.rate.getValue(),
      payElParams: [{
        employeeNumberID: context.record.get('employeeNumberID'),
        periodCalcID: me.attr.periodID.getValue(),
        periodSalaryID: me.attr.periodSalaryID.getValue(),
        periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
        periodSalary: me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateFrom: context.record.get('dateFrom') || me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateTo: context.record.get('dateTo') || me.attr.periodSalaryID.getFieldValue('dateTo'),
        payElID: me.attr.payElID.getValue(),
        baseSum: context.record.get('baseSum'),
        rate: context.record.get('rate'),
        paySumAccrual: 0,
        paySum: context.record.get('paySum') !== '' ? context.record.get('paySum') : null,
        flagsFix: context.record.get('flagsFix'),
        flagsRec: 2,
        idx: context.rowIdx
      }]
    }
    me.calcRegistryRequestEmp(me, params)
  }

  if (ctrl.flagsFix) {
    if (context.value !== null) {
      context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
    } else {
      context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
    }
  }

  const data = context.grid.getData()
  switch (context.column.field.name) {
    case 'employeeNumberID.description':
      if (data.filter(o => o.employeeNumberID === context.record.get('employeeNumberID')).length > 1) {
        $App.dialogYesNo('Попередження', UB.i18n(`Табельний номер {0} додано декілька разів! Продовжити?`, context.record.get('employeeNumberID.description')))
          .then(choice => {
            if (!choice) {
              context.store.remove(context.record)
              return false
            } else {
              addRecord()
            }
          })
      } else {
        addRecord()
      }
      break
    case 'baseSum':
      if (context.value !== context.originalValue) {
        addRecord()
      }
      break
    case 'rate':
      if (context.value !== context.originalValue) {
        let flagFix = context.record.get('flagsFix')
        flagFix &= ~(1 << 21)
        flagFix |= (1 << 9)
        context.record.set('flagsFix', flagFix)
        addRecord()
      }
      break
    case 'paySum':
      if (context.value !== context.originalValue) {
        let flagFix = context.record.get('flagsFix')
        flagFix |= (1 << 1)
        context.record.set('flagsFix', flagFix)
        addRecord()
      }
      break
  }
  me.reCalcRate = false
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
        const addEmployeeNumbers = []
        const store = me.attr.orderRegistryDt.getStore()
        const flagsFix = me.attr.rate.getValue() ? me.attr.rate.flagsFix : me.attr.baseSum.getValue() ? me.attr.baseSum.flagsFix : 0
        const setData = () => {
          me.attr.orderRegistryDt.getStore().un('clear', setData)
          data.forEach(row => {
            if (!store.findRecord('employeeNumberID', row.employeeNumberID)) {
              row.baseSum = me.attr.baseSum.getValue()
              row.rate = me.attr.rate.getValue()
              row.flagsFix = flagsFix
              row['employeeNumberID.dateToEmpty'] = row['dateToEmpty']
              delete row['dateToEmpty']
              row['employeeNumberID.workPlaceCode'] = row['workPlaceCode']
              delete row['workPlaceCode']
              row.dateFrom = me.attr.periodSalaryID.getFieldValue('dateFrom')
              row.dateTo = me.attr.periodSalaryID.getFieldValue('dateTo')
              addEmployeeNumbers.push(row)
            }
          })
          if (addEmployeeNumbers.length) {
            const bind = () => {
              me.attr.orderRegistryDt.getStore().un('add', bind)
              me.attr.orderRegistryDt.GridSummary.dataBind()
              me.reCalc(me, false, true)
            }
            me.attr.orderRegistryDt.getStore().on('add', bind)
            me.attr.orderRegistryDt.getStore().insert(me.attr.orderRegistryDt.getStore().data.length, addEmployeeNumbers)
          }
        }
        if (me.attr.orderRegistryDt.getStore().count()) {
          $App.dialogYesNo('Попередження', UB.i18n('Видалити раніше внесені нарахування?'))
            .then(res => {
              if (res) {
                me.attr.orderRegistryDt.getStore().on('clear', setData)
                me.attr.orderRegistryDt.removeAll()
              } else {
                setData()
              }
            })
        } else {
          setData()
        }
      }
    }
  })
}

function calcRegistryRequestEmp (me, params) {
  if (!!params.payElParams.length && !!params.periodSalaryID && !!me.attr.payElID.getValue()) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'calcRegistryRequestEmp',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)
      const store = me.attr.orderRegistryDt.getStore()
      data.forEach(row => {
        const record = store.getAt(row.idx)
        record.set('rate', row.rate)
        record.set('baseSum', row.baseSum)
        record.set('paySum', row.paySum)
        record.set('paySumAccrual', row.calculatedSum)
        record.set('periodCalcID', null)
        record.set('periodCalc', null)
        record.set('periodSalaryID', row.periodSalaryID)
        record.set('periodSalary', row.periodSalary)
        record.set('dateFrom', row.dateFrom)
        record.set('dateTo', row.dateTo)
        record.set('mask', row.mask)
        record.set('days', row.days)
        record.set('hours', row.hours)
        record.set('planHours', row.planHours)
        record.set('planDays', row.planDays)
        record.set('dateFromAvg', row.dateFromAvg)
        record.set('dateToAvg', row.dateToAvg)
        record.set('payElID', row.payElID)
        record.set('dictFundSourceID', row.dictFundSourceID)
        record.set('flagsRec', row.flagsRec)
        record.set('calcSum', row.sumAvg)
        record.set('extraRate', row.extraRate)
        record.set('accrualDt', JSON.stringify(row.accrualDt))
      })
      me.attr.orderRegistryDt.GridSummary.dataBind()
      me.setIsDirty(true)
      me.setLoading(false)
    }, function (err) {
      me.setLoading(false)
      throw err
    })
  }
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
