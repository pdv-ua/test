/* global HR AC $App _ appAC UB Ext saveAs AC Blob */
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
  calcRegistryNetSum,
  initOrderComponentDone,
  reCalc,
  onCheckValidBeforeSaveOrder,
  loadCsv,
  updateIndividuslRate
}

const periodMetods = ['205']

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
    printDocumentAction: true,
    actions: ['fDelete', 'postingAction', 'cancelPostingAction'],
    state: {
      PROJECT: { action: ['postingAction', 'fDelete'] },
      POSTED: { action: ['cancelPostingAction'] }
    }
  }

  me.callParent(arguments)
  HR.orderManager.addOrderAction(me)

  me.actions.filterButtonAction = new Ext.Action({
    xtype: 'button',
    name: 'filterButton',
    iconCls: 'u-icon-layers',
    text: UB.i18n('Додаткові параметри нарахування'),
    handler: function (btn) {
      const localStorageData = JSON.parse(UB.core.UBLocalStorageManager.getItem(`hr_orderRegistryNetSum_${me.attr.payElID.getFieldValue('methodID.code')}_${appAC.globalOrganization()}`) || '{}')
      me.isFilter = !me.isFilter
      if (!localStorageData) {
        UB.core.UBLocalStorageManager.setItem(`hr_orderRegistryNetSum_${me.attr.payElID.getFieldValue('methodID.code')}_${appAC.globalOrganization()}`, {
          isFilter: me.isFilter
        })
      } else {
        UB.core.UBLocalStorageManager.setItem(`hr_orderRegistryNetSum_${me.attr.payElID.getFieldValue('methodID.code')}_${appAC.globalOrganization()}`, {
          isFilter: me.isFilter
        })
        me.down('[name=filterPanel]')[me.isFilter ? 'show' : 'hide']()
      }
      btn.addCls(me.isFilter ? 'custom-action_btn' : '')
      btn.removeCls(!me.isFilter ? 'custom-action_btn' : '')
      btn.setTooltip(me.isFilter ? UB.i18n('Виключити додаткові параметри виплати') : UB.i18n('Додаткові параметри виплати'))
    }
  })

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
      const rate = 0// me.attr.rate.getValue()
      const dictFundSourceID = me.attr.dictFundSourceID.getFieldValue('name')
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
      if (dictFundSourceID) {
        ws.addMerge({ colFrom: 0, colTo: columns.length })
        ws.addRow({
          value: `Джерело фінансування: ${dictFundSourceID}`,
          column: 0,
          style: headerStyle
        }, {}, { height: 30 })
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
        'payElID.description': 50,
        'periodCalcID.name': 50,
        'periodSalaryID.name': 50,
        'dictFundSourceID.name': 50,
        'planSumAvg': 20,
        'baseSum': 20,
        'calculatedSum': 20,
        'paySumAccrual': 20,
        'rateOff': 20,
        'paySumOff': 20,
        'paySumAccrual.paySumOff': 20,
        'paySum': 20,
        'posName': 50,
        'depName': 50
      }
      let colsProperties = []
      let colsHeaders = []
      let isIncludeSummary = false
      const sumAttrs = ['planSumAvg', 'baseSum', 'calculatedSum', 'paySumAccrual', 'paySumAccrual.paySumOff', 'paySumOff', 'paySum']
      const sumColumns = {}
      sumAttrs.forEach(attrName => {
        sumColumns[attrName] = 0
      })

      columns.forEach((el, idx) => {
        colsProperties.push({ column: idx, width: columnsWidth[el[0]] || 20 })
        colsHeaders.push({ column: idx, value: el[1], style: rowHeaderStyle })
        if (sumAttrs.includes(el[0])) {
          isIncludeSummary = true
        }
      })
      ws.setColsProperties(colsProperties)
      ws.addRow(colsHeaders, null, { height: 30 })

      data.forEach(fix => {
        let dataRow = []
        columns.forEach((el, idx) => {
          if (el[0] === 'paySumAccrual.paySumOff') {
            dataRow.push({ column: idx, value: ((fix.paySumAccrual || 0) - (fix.paySumOff || 0)), style: styleCol })
          } else {
            dataRow.push({ column: idx, value: fix[el[0]], style: styleCol })
          }
        })
        sumAttrs.forEach(attrName => {
          sumColumns[attrName] += ((attrName === 'paySumAccrual.paySumOff') ? ((fix.paySumAccrual || 0) - (fix.paySumOff || 0)) : fix[attrName])
        })
        ws.addRow(dataRow, null, { height: 20 })
      })

      if (isIncludeSummary) {
        let includeSummText = false
        let idx = 0
        while (idx < columns.length) {
          if (!sumAttrs.includes(columns[idx][0])) {
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
          if (sumAttrs.includes(el[0])) {
            addSumText(idx)
            dataRow.push({ column: idx, value: sumColumns[el[0]], style: styleSummaryCol })
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
  me.attr.dictFundSourceID.store.ubRequest.method = 'selectByOrg'
  me.attr.dictFundSourceID.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
}

function initOrderComponentDone (me) {
  me.attr.baseSum.on('blur', changeParams)
  me.attr.limitSum.on('blur', changeParams)
  me.attr.baseSum.on('keypress', onKeypress)
  me.attr.limitSum.on('keypress', onKeypress)
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
    case 'limitSum':
      if (value) {
        allRecords.each(record => {
          record.set('flagsFix', record.get('flagsFix') | me.attr.baseSum.flagsFix)
          record.set('planSumAvg', value)
        })
      } else {
        me.updateIndividuslRate(me)
      }
      break
    case 'baseSum':
      if (value) {
        allRecords.each(record => {
          record.set('flagsFix', record.get('flagsFix') | me.attr.baseSum.flagsFix)
          record.set('baseSum', value)
        })
      } else {
        me.updateIndividuslRate(me)
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
      orgID: me.record.get('organizationID'),
      reCalcRate,
      orderDate: me.attr.orderDate.getValue(),
      dictMultiGroupID: me.record.get('dictMultiGroupID'),
      includeSubDepGroup: me.attr.includeSubDepGroup.getValue(),
      depID: me.record.get('departmentID'),
      includeSubDep: me.attr.includeSubDep.getValue()
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
      planSumAvg: data.planSumAvg,
      baseSum: data.baseSum,
      calculatedSum: data.calculatedSum,
      paySumAccrual: data.paySumAccrual,
      paySumOff: data.paySumOff,
      rateOff: data.rateOff,
      sumAvg: data.sumAvg,
      paySum: data.paySum,
      flagsFix: data.flagsFix,
      flagsRec: 2,
      idx: idx,
      dictFundSourceID: clearFundSource ? me.attr.dictFundSourceID.getValue() : data.dictFundSourceID,
      accrualDt: data.accrualDt,
      calcParams: data.calcParams
    })
  })
  me.calcRegistryNetSum(me, params)
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

  const localData = JSON.parse(UB.core.UBLocalStorageManager.getItem(`hr_orderRegistryNetSum_${me.record.get('payElID.methodID.code')}_${appAC.globalOrganization()}`) || '{}')
  if (me.isNewInstance) {
    me.isFilter = localData.isFilter
    localData ? me.down('[name=filterPanel]')[localData.isFilter ? 'show' : 'hide']() : me.down('[name=filterPanel]')[me.isFilter ? 'show' : 'hide']()
    localData && localData.isFilter && me.down('[name=filterButton]').addCls(localData.isFilter ? 'custom-action_btn' : '')
  }
  if (localData && !me.isNewInstance) {
    const filterButton = me.down('[name=filterButton]')
    const filterPanel = me.down('[name=filterPanel]')
    me.isFilter = localData.isFilter
    filterPanel[me.isFilter ? 'show' : 'hide']()
    filterButton.addCls(localData.isFilter ? 'custom-action_btn' : '')
    filterButton.removeCls(!localData.isFilter ? 'custom-action_btn' : '')
    me.isFilter ? filterButton.setTooltip(UB.i18n('Виключити додаткові параметри виплати')) : filterButton.setTooltip(UB.i18n('Додаткові параметри виплати'))
  } else if (!localData && !me.isNewInstance) {
    me.down('[name=filterPanel]').hide()
  }

  AC.viewUtils.setWhereListProperty(me.attr.payElID, [
    ['methodID.methodGroupID.code', '=', 3],
    ['methodID.code', '=', '205'],
    ['dateFrom', 'lessEqual', appAC.globalApplicationDate()],
    ['dateTo', 'moreEqual', appAC.globalApplicationDate()]
  ])
  AC.viewUtils.setFilterValue(me.attr.periodID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodSalaryID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodFromAvg, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.periodToAvg, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.departmentID, { orgID: me.record.get('organizationID') })
  AC.viewUtils.setFilterValue(me.attr.dictMultiGroupID, { orgID: me.record.get('organizationID') })

  const readOnlyAttr = ['orderDate', 'docNumber', 'payElID', 'periodFromAvg', 'periodToAvg']
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

  me.attr.periodFromAvg[periodMetods.includes(me.attr.payElID.getFieldValue('methodID.code')) ? 'show' : 'hide']()
  me.attr.periodToAvg[periodMetods.includes(me.attr.payElID.getFieldValue('methodID.code')) ? 'show' : 'hide']()
  me.attr.baseSum.setReadOnly(me.record.get('orderState') !== 'PROJECT' || me.record.get('empOrderID'))
  me.attr.limitSum.setReadOnly(me.record.get('orderState') !== 'PROJECT' || me.record.get('empOrderID'))
  if (me.attr.departmentID.getValue() || me.attr.dictMultiGroupID.getValue()) {
    me.down('[name=filterPanel]').show()
    me.down('[name=filterButton]').addCls('custom-action_btn')
  }
  me.attr.includeSubDep.setReadOnly(!me.record.get('departmentID'))
  me.attr.includeSubDepGroup.setReadOnly(!me.record.get('dictMultiGroupID'))
  if (me.record.get('empOrderID')) {
    me.attr.orderRegistryDt.hideActions = ['addNewByCurrent', 'del', 'addNew', 'addList']
    me.attr.orderRegistryDt.hideActions.forEach(actName => {
    })
    const toolBar = me.attr.orderRegistryDt.down('toolbar')
    if (toolBar && toolBar.items && toolBar.items.items) {
      toolBar.items.items.forEach(item => {
        item.setDisabled(_.includes(me.attr.orderRegistryDt.hideActions, item.name))
        item.setVisible(!_.includes(me.attr.orderRegistryDt.hideActions, item.name))
      })
    }
    me.attr.dictFundSourceID.hide()
  }

  me.attr.departmentID.setDisabled(true)
  me.attr.dictMultiGroupID.setDisabled(true)
  me.attr.includeSubDep.setDisabled(true)
  me.attr.includeSubDepGroup.setDisabled(true)
}

function setDescription (me) {
  me.attr.name.setValue(`${UB.i18n('Премія чистою сумою')}${me.attr.dictMultiGroupID.getValue()
    ? `, ${UB.i18n('Група підрозділів')}: ${me.attr.dictMultiGroupID.getFieldValue('name') + (me.attr.includeSubDepGroup.getValue() ? `, ${UB.i18n('з підлеглими')}` : '')}` : ''}${me.attr.departmentID.getValue()
    ? `, ${UB.i18n('Підрозділ')}: ${me.attr.departmentID.getFieldValue('name') + (me.attr.includeSubDep.getValue() ? `, ${UB.i18n('з підлеглими')}` : '')}` : ''}`)
}

function onControlChanged (me, field, value) {
  if (['payElID'].includes(field.name)) {
    me.attr.orderRegistryDt.removeAll()
    me.setIsDirty(true)
  }
  switch (field.name) {
    case 'payElID':
      if (value) {
        me.attr.periodFromAvg[periodMetods.includes(me.attr.payElID.getFieldValue('methodID.code')) ? 'show' : 'hide']()
        me.attr.periodToAvg[periodMetods.includes(me.attr.payElID.getFieldValue('methodID.code')) ? 'show' : 'hide']()
        setAvgPeriod(me)
      }
      break
    case 'periodSalaryID':
      if (value) {
        setAvgPeriod(me)
      }
      break
    case 'periodFromAvg':
    case 'periodToAvg':
      const store = me.attr.orderRegistryDt.getStore()
      const allRecords = store.snapshot || store.data
      allRecords.each(rec => {
        // rec.set('flagsFix', rec.get('flagsFix') | field.flagsFix)
        rec.set('dateFromAvg', me.attr.periodFromAvg.getFieldValue('dateFrom'))
        rec.set('dateToAvg', me.attr.periodToAvg.getFieldValue('dateTo'))
      })
      me.reCalc(me)
      break
    case 'dictFundSourceID':
      me.reCalc(me, true)
      break
    case 'dictMultiGroupID': {
      me.attr.includeSubDepGroup.setValue(false)
      me.attr.includeSubDepGroup.setReadOnly(!value)
      if (value) {
        me.attr.departmentID.setValueById(null)
      }
      setDescription(me)
      break
    }
    case 'departmentID': {
      me.attr.includeSubDep.setValue(false)
      me.attr.includeSubDep.setReadOnly(!value)
      if (value) {
        me.attr.dictMultiGroupID.setValueById(null)
      }
      setDescription(me)
      break
    }
    case 'includeSubDepGroup':
    case 'includeSubDep': {
      setDescription(me)
      break
    }
  }
}

function setAvgPeriod (me) {
  const dateFromAvg = me.attr.periodSalaryID.getFieldValue('dateFrom')
  const dateToAvg = me.attr.periodSalaryID.getFieldValue('dateTo')
  const periodSalaryID = me.attr.periodSalaryID.getValue()
  const periodSalaryName = me.attr.periodSalaryID.getFieldValue('name')
  me.attr.periodFromAvg.suspendEvents()
  me.attr.periodToAvg.suspendEvents()
  me.attr.periodFromAvg.setValueById(me.attr.periodSalaryID.getValue())
  me.attr.periodToAvg.setValueById(me.attr.periodSalaryID.getValue())
  me.attr.periodFromAvg.resumeEvents()
  me.attr.periodToAvg.resumeEvents()
  const allRecords = me.attr.orderRegistryDt.getStore().data
  allRecords.each(record => {
    record.set('dateFromAvg', dateFromAvg)
    record.set('dateToAvg', dateToAvg)
    record.set('dateFrom', AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateFrom')))
    record.set('dateTo', AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateTo')))
    record.set('periodSalaryID', periodSalaryID)
    record.set('periodSalaryID.name', periodSalaryName)
  })
}

function onAfterOrderSave (data) {
  const me = this
  if (!me.notRefreshAfterSave) {
    me.attr.orderRegistryDt.setLocalStoreData(me.formData.detail.orderRegistryDt, false, true)
  }
}
function updateIndividuslRate (me) {
  const store = me.attr.orderRegistryDt.getStore()
  const allRecords = store.snapshot || store.data
  const empIDs = []
  allRecords.each(record => {
    empIDs.push(record.get('employeeNumberID'))
  })
  if (empIDs.length) {
    const dateFrom = me.attr.periodFromAvg.getFieldValue('dateFrom') || me.attr.periodSalaryID.getFieldValue('dateFrom')
    const dateTo = me.attr.periodToAvg.getFieldValue('dateTo') || me.attr.periodSalaryID.getFieldValue('dateTo')
    UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'employeeNumberID', 'payElID', 'dateFrom', 'dateTo', 'accrualSum', 'limitSum'])
      .where('employeeNumberID', 'in', empIDs)
      .where('payElID', '=', me.attr.payElID.getValue())
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('limitSum', '>', 0, 'rate')
      .where('accrualSum', '>', 0, 'sum')
      .logic('([rate] OR [sum])')
      .orderBy('employeeNumberID')
      .orderByDesc('accrualSum')
      .orderBy('dateFrom')
      .selectAsObject().then(payPerms => {
        me.attr.orderRegistryDt.suspendEvents()
        store.suspendEvents()
        allRecords.each(record => {
          const employeeNumberID = record.get('employeeNumberID')
          const empRate = payPerms.find(o => o.employeeNumberID === employeeNumberID)
          record.set('flagsFix', record.get('flagsFix') | me.attr.baseSum.flagsFix)
          record.set('planSumAvg', me.attr.limitSum.getValue() || (empRate ? empRate.limitSum : 0))
          record.set('baseSum', me.attr.baseSum.getValue() || (empRate ? empRate.accrualSum : 0))
        })
        store.resumeEvents()
        me.attr.orderRegistryDt.resumeEvents()
        me.reCalc(me)
      })
  } else {
    me.reCalc(me)
  }
}
function beforeGridEdit (me, context) {
  if (me.record.get('empOrderID') && !['paySum', 'rateOff', 'paySumOff'].includes(context.column.dataIndex)) {
    context.column.field.setReadOnly(true)
    return false
  }
  if (!me.attr.payElID.getValue()) {
    $App.dialogInfo(UB.i18n('Не вказано вид оплати!'))
    return false
  }
  me.setIsDirty(true)
  if (context.record.phantom && context.record.dirtySave !== null) {
    context.record.dirtySave = null
  }
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
  if (context.column.dataIndex === 'dictFundSourceID.name') {
    context.column.field.store.ubRequest.method = 'selectByOrg'
    context.column.field.store.ubRequest.orgID = me.record.get('organizationID') || appAC.globalOrganization()
  }
  if ([null, ''].includes(context.record.get('flagsFix'))) {
    context.record.set('flagsFix', me.attr.baseSum.getValue() ? me.attr.baseSum.flagsFix : 0)
  }
  if ([null, ''].includes(context.record.get('baseSum'))) {
    context.record.set('baseSum', me.attr.baseSum.getValue() ? me.attr.baseSum.getValue() : 0)
  }
  if ([null, ''].includes(context.record.get('planSumAvg'))) {
    context.record.set('planSumAvg', me.attr.limitSum.getValue() ? me.attr.limitSum.getValue() : null)
  }
  if ([null, ''].includes(context.record.get('paySumAccrual'))) {
    context.record.set('paySumAccrual', 0)
  }
  if ([null, ''].includes(context.record.get('paySumOff'))) {
    context.record.set('paySumOff', 0)
  }
  if ([null, ''].includes(context.record.get('rateOff'))) {
    context.record.set('rateOff', 0)
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
        orderDate: me.attr.orderDate.getValue()
      },
      payElParams: [{
        employeeNumberID: context.record.get('employeeNumberID'),
        periodCalcID: me.attr.periodID.getValue(),
        periodSalaryID: me.attr.periodSalaryID.getValue(),
        periodCalc: me.attr.periodID.getFieldValue('dateFrom'),
        periodSalary: me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateFrom: context.record.get('dateFrom') || me.attr.periodSalaryID.getFieldValue('dateFrom'),
        dateTo: context.record.get('dateTo') || me.attr.periodSalaryID.getFieldValue('dateTo'),
        dateFromAvg: context.record.get('dateFromAvg') || (periodMetods.includes(me.attr.payElID.getFieldValue('methodID.code')) ? me.attr.periodFromAvg.getFieldValue('dateFrom') : null),
        dateToAvg: context.record.get('dateToAvg') || (periodMetods.includes(me.attr.payElID.getFieldValue('methodID.code')) ? me.attr.periodToAvg.getFieldValue('dateTo') : null),
        payElID: me.attr.payElID.getValue(),
        planSumAvg: context.record.get('planSumAvg'),
        baseSum: context.record.get('baseSum'),
        calculatedSum: context.record.get('calculatedSum'),
        paySumAccrual: context.record.get('paySumAccrual'),
        paySumOff: context.record.get('paySumOff'),
        rateOff: context.record.get('rateOff'),
        paySum: context.record.get('paySum') !== '' ? context.record.get('paySum') : null,
        sumAvg: context.record.get('sumAvg'),
        flagsFix: context.record.get('flagsFix'),
        flagsRec: 2,
        idx: context.rowIdx,
        dictFundSourceID: context.record.get('dictFundSourceID') || me.attr.dictFundSourceID.getValue()
      }]
    }
    me.calcRegistryNetSum(me, params)
  }

  function individualRate () {
    const dateFrom = me.attr.periodFromAvg.getFieldValue('dateFrom') || me.attr.periodSalaryID.getFieldValue('dateFrom')
    const dateTo = me.attr.periodToAvg.getFieldValue('dateTo') || me.attr.periodSalaryID.getFieldValue('dateTo')
    UB.Repository('hr_employeeAccrual')
      .attrs(['ID', 'accrualSum', 'limitSum'])
      .where('employeeNumberID', '=', context.record.get('employeeNumberID'))
      .where('payElID', '=', me.attr.payElID.getValue())
      .where('dateFrom', '<=', dateTo)
      .where('dateTo', '>=', dateFrom)
      .where('limitSum', '>', 0, 'rate')
      .where('accrualSum', '>', 0, 'sum')
      .logic('([rate] OR [sum])')
      .orderBy('employeeNumberID')
      .orderByDesc('accrualSum')
      .orderBy('dateFrom')
      .limit(1)
      .selectSingle().then(payPerms => {
        context.record.set('flagsFix', context.record.get('flagsFix') | me.attr.baseSum.flagsFix)
        context.record.set('planSumAvg', me.attr.limitSum.getValue() || (payPerms ? payPerms.limitSum : 0))
        context.record.set('baseSum', me.attr.baseSum.getValue() || (payPerms ? payPerms.accrualSum : 0))
        addRecord()
      })
  }

  if (ctrl.flagsFix && context.originalValue !== context.value) {
    if (context.column.dataIndex !== 'paySumOff' || (context.column.dataIndex === 'paySumOff' && !context.record.get('rateOff'))) {
      if (context.value !== null || (['rateOff', 'paySumOff'].includes(context.column.field.name) && ![null, 0].includes(context.value))) {
        context.record.set('flagsFix', context.record.get('flagsFix') | ctrl.flagsFix)
      } else {
        context.record.set('flagsFix', context.record.get('flagsFix') & ~ctrl.flagsFix)
      }
      if (context.column.dataIndex === 'rateOff') {
        context.record.set('paySumOff', 0)
        context.record.set('flagsFix', context.record.get('flagsFix') & ~(1 << 20))
      }
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
              individualRate()
            }
          })
      } else {
        individualRate()
      }
      break
    case 'baseSum':
    case 'paySumOff':
    case 'rateOff':
    case 'planSumAvg':
      if (context.value !== context.originalValue) {
        let flagFix = context.record.get('flagsFix')
        flagFix &= ~(1 << 1)
        context.record.set('flagsFix', flagFix)
        addRecord()
      }
      break
    case 'paySumAccrual':
      if (context.value !== context.originalValue) {
        let flagFix = context.record.get('flagsFix')
        flagFix &= ~(1 << 9)
        flagFix |= (1 << 21)
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
    case 'dictFundSourceID.name':
      if (context.value !== context.originalValue) {
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
  let periodFromID = me.attr.periodFromAvg.getValue() || me.record.get('periodSalaryID')
  let periodToID = me.attr.periodToAvg.getValue() || me.record.get('periodSalaryID')
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_employeeNumberSearch',
    isModal: true,
    cmpInitConfig: {
      orgID: me.record.get('organizationID'),
      readOnlyAttr: ['periodID'],
      parentCode: 'hr_orderRegistryNetSum',
      defaultValues: {
        periodFromID,
        periodToID,
        depID: me.record.get('departmentID'),
        childDep: me.record.get('includeSubDep'),
        dictMultiGroup: me.record.get('dictMultiGroupID'),
        childDictMultiGroup: me.record.get('includeSubDepGroup')
      },
      onSelect: async (data) => {
        const addEmployeeNumbers = []
        const flagsFix = me.attr.baseSum.flagsFix
        const setIndividuslRate = () => {
          me.attr.orderRegistryDt.getStore().un('clear', setIndividuslRate)
          if (data.length) {
            const empIDs = data.map(o => o.employeeNumberID)
            const dateFrom = me.attr.periodFromAvg.getFieldValue('dateFrom') || me.attr.periodSalaryID.getFieldValue('dateFrom')
            const dateTo = me.attr.periodToAvg.getFieldValue('dateTo') || me.attr.periodSalaryID.getFieldValue('dateTo')
            UB.Repository('hr_employeeAccrual')
              .attrs(['ID', 'employeeNumberID', 'payElID', 'dateFrom', 'dateTo', 'accrualSum', 'limitSum'])
              .where('employeeNumberID', 'in', empIDs)
              .where('payElID', '=', me.attr.payElID.getValue())
              .where('dateFrom', '<=', dateTo)
              .where('dateTo', '>=', dateFrom)
              .where('limitSum', '>', 0, 'rate')
              .where('accrualSum', '>', 0, 'sum')
              .logic('([rate] OR [sum])')
              .orderBy('employeeNumberID')
              .orderByDesc('accrualSum')
              .orderBy('dateFrom')
              .selectAsObject().then(payPerms => {
                data.forEach(row => {
                  if ((me.attr.limitSum.getValue() && me.attr.baseSum.getValue())) {
                    const newRow = Object.assign({}, row)
                    newRow.flagsFix = flagsFix
                    newRow.planSumAvg = me.attr.limitSum.getValue()
                    newRow.baseSum = me.attr.baseSum.getValue()
                    newRow['employeeNumberID.dateToEmpty'] = row['dateToEmpty']
                    delete newRow['dateToEmpty']
                    newRow['employeeNumberID.workPlaceCode'] = row['workPlaceCode']
                    delete newRow['workPlaceCode']
                    newRow.dateFrom = AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateFrom'))
                    newRow.dateTo = AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateTo'))
                    newRow.dateFromAvg = AC.dateService.shiftDate(dateFrom)
                    newRow.dateToAvg = AC.dateService.shiftDate(dateTo)
                    addEmployeeNumbers.push(newRow)
                  } else {
                    const payPerm = payPerms.filter(o => o.employeeNumberID === row.employeeNumberID)
                    payPerm.forEach(empRate => {
                      const newRow = Object.assign({}, row)
                      newRow.flagsFix = flagsFix
                      newRow.planSumAvg = me.attr.limitSum.getValue() || empRate.limitSum
                      newRow.baseSum = me.attr.baseSum.getValue() || empRate.accrualSum
                      newRow['employeeNumberID.dateToEmpty'] = row['dateToEmpty']
                      delete newRow['dateToEmpty']
                      newRow['employeeNumberID.workPlaceCode'] = row['workPlaceCode']
                      delete newRow['workPlaceCode']
                      newRow.dateFrom = AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateFrom'))
                      newRow.dateTo = AC.dateService.shiftDate(me.attr.periodSalaryID.getFieldValue('dateTo'))
                      newRow.dateFromAvg = AC.dateService.shiftDate(Math.max(AC.dateService.shiftDate(dateFrom), AC.dateService.shiftDate(empRate.dateFrom)))
                      newRow.dateToAvg = AC.dateService.shiftDate(Math.min(AC.dateService.shiftDate(dateTo), AC.dateService.shiftDate(empRate.dateTo)))
                      addEmployeeNumbers.push(newRow)
                    })
                  }
                })
                if (addEmployeeNumbers.length) {
                  const bind = () => {
                    me.attr.orderRegistryDt.getStore().un('add', bind)
                    me.reCalc(me, false, true)
                  }
                  me.attr.orderRegistryDt.getStore().on('add', bind)
                  me.attr.orderRegistryDt.getStore().insert(me.attr.orderRegistryDt.getStore().data.length, addEmployeeNumbers)
                }
              })
          }
        }
        $App.connection.run({
          entity: 'hr_orderRegistry',
          method: 'getEmployeePremiumList',
          params: JSON.stringify({
            departmentID: me.attr.departmentID.getValue(),
            includeSubDep: me.attr.includeSubDep.getValue(),
            dictMultiGroupID: me.attr.dictMultiGroupID.getValue(),
            includeSubDepGroup: me.attr.includeSubDepGroup.getValue(),
            periodFromID,
            periodToID,
            orgID: appAC.globalOrganization()
          })
        }).then(response => {
          let employeeData = JSON.parse(response.resultData)
          if (employeeData.length) data = data.filter(el => employeeData.includes(el.employeeNumberID))
          if (me.attr.orderRegistryDt.getStore().count()) {
            $App.dialogYesNo('Попередження', UB.i18n('Видалити раніше внесені нарахування?'))
              .then(res => {
                if (res) {
                  me.attr.orderRegistryDt.getStore().on('clear', setIndividuslRate)
                  me.attr.orderRegistryDt.removeAll()
                } else {
                  setIndividuslRate()
                }
              })
          } else {
            setIndividuslRate()
          }
        })
      }
    }
  })
}

function calcRegistryNetSum (me, params) {
  if (!!params.payElParams.length && !!params.periodSalaryID && !!me.attr.payElID.getValue()) {
    me.setLoading(true)
    $App.connection.run({
      entity: 'hr_orderRegistry',
      method: 'calcRegistryNetSum',
      params: JSON.stringify(params)
    }).then(response => {
      const data = JSON.parse(response.resultData)
      const store = me.attr.orderRegistryDt.getStore()
      data.forEach(row => {
        const record = store.getAt(row.idx)
        record.set('baseSum', row.baseSum)
        record.set('paySum', row.paySum)
        record.set('paySumAccrual', row.paySumAccrual)
        record.set('planSumAvg', row.planSumAvg)
        record.set('sumAvg', row.sumAvg)
        record.set('calculatedSum', row.calculatedSum)
        record.set('paySumOff', row.paySumOff)
        record.set('rateOff', row.rateOff)
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
        record.set('payElID.description', me.attr.payElID.getFieldValue('description'))
        record.set('dictFundSourceID', row.dictFundSourceID)
        record.set('dictFundSourceID.name', row['dictFundSourceID.name'])
        record.set('flagsRec', row.flagsRec)
        record.set('extraRate', row.extraRate)
        record.set('accrualDt', JSON.stringify(row.accrualDt))
        record.set('calcParams', row.calcParams ? JSON.stringify(row.calcParams) : null)
      })
      me.setIsDirty(true)
      me.setLoading(false)
    }, function (err) {
      me.setLoading(false)
      throw err
    })
  }
}

function loadCsv (ctrl) {
  const me = ctrl.up('form')
  const entityName = 'hr_orderRegistryDt'
  const entityAttrs = AC.entityUtils.getAttributes(entityName)
  Ext.create('AC.controls.acUploadFileAjax', {
    scope: this,
    height: 200,
    customArea: {
      xtype: 'panel',
      region: 'center',
      height: 140,
      items: [
        {
          xtype: 'combobox',
          width: 250,
          editable: false,
          name: 'encoding',
          fieldLabel: UB.i18n('Кодування'),
          allowBlank: false,
          store: Ext.create('Ext.data.Store', {
            fields: ['text', 'value'],
            data: [
              {
                text: 'utf8',
                value: 'utf8'
              },
              {
                text: 'win1251',
                value: 'win1251'
              }
            ]
          })
        }
      ]
    },
    listeners: {
      afterrender: function (cmp) {
        this.fieldFile.fileInputEl.set({
          accept: '.csv'
        })
        const encodingCtrl = this.down('[name=encoding]')
        encodingCtrl.setValue('utf8')
      }
    },
    upLoad: function (btn) {
      me.setLoading(true)
      const dialogWindow = btn.up('window')
      const inputDom = this.fieldFile.fileInputEl.dom
      if (inputDom.files.length === 0) {
        return
      }
      const file = inputDom.files[0]
      if (file.name.toLowerCase().indexOf('.csv', file.name.length - 4) === -1) {
        $App.dialogInfo(UB.i18n('Невірний формат файлу, для завантаження використовується формат csv'))
        me.setLoading(false)
        return
      }
      const encodingCtrl = this.down('[name=encoding]')
      const encoding = (encodingCtrl ? encodingCtrl.getValue() : null) || 'utf8'
      UB.connection.post('loadImportDataEx', file, {
        params: {
          entityName: '',
          encoding,
          fileName: file.name
        },
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }).then(response => {
        me.setLoading(false)
        const data = response.data
        const attrs = data[0]
        const sourceRows = data.slice(1, data.length)
        const parsedData = []
        sourceRows && sourceRows.forEach((item, key) => {
          let row = {}
          attrs.forEach((attr, idx) => {
            if (!entityAttrs[attr]) {
              row[attr] = item[idx] || ''
            } else {
              switch (entityAttrs[attr].dataType) {
                case 'Date':
                case 'DateTime':
                  row[attr] = item[idx] ? new Date(AC.moment(item[idx], 'DD.MM.YYYY').toDate()) : ''
                  break
                default:
                  row[attr] = item[idx] || ''
              }
            }
          })
          row.periodCalcID = me.attr.periodID.getValue()
          row.periodSalaryID = me.attr.periodSalaryID.getValue()
          row.periodCalc = me.attr.periodID.getFieldValue('dateFrom')
          row.periodSalary = me.attr.periodSalaryID.getFieldValue('dateFrom')
          row.dateFrom = row.dateFrom || me.attr.periodSalaryID.getFieldValue('dateFrom')
          row.dateTo = row.dateTo || me.attr.periodSalaryID.getFieldValue('dateTo')
          row.payElID = me.attr.payElID.getValue()
          row.flagsRec = 2
          row.idx = key
          row.dictFundSourceID = me.attr.dictFundSourceID.getValue()
          parsedData.push(row)
        })

        const params = {
          orgID: me.record.get('organizationID'),
          periodCalcID: me.attr.periodID.getValue(),
          periodSalaryID: me.attr.periodSalaryID.getValue(),
          orderParams: {
            orderDate: me.attr.orderDate.getValue()
          },
          payElParams: parsedData
        }

        if (!!params.payElParams.length && !!params.periodSalaryID && !!me.attr.payElID.getValue()) {
          me.setLoading(true)
          $App.connection.run({
            entity: 'hr_orderRegistry',
            method: 'loadRegistryPremium',
            params: JSON.stringify(params)
          }).then(response => {
            const data = JSON.parse(response.resultData)
            data.forEach(row => {
              row.accrualDt = JSON.stringify(row.accrualDt)
            })
            if (data.length) {
              const bind = () => {
                me.attr.orderRegistryDt.getStore().un('add', bind)
              }
              me.attr.orderRegistryDt.removeAll()
              me.attr.orderRegistryDt.getStore().on('add', bind)
              me.attr.orderRegistryDt.getStore().insert(me.attr.orderRegistryDt.getStore().data.length, data)
            }
            me.setIsDirty(true)
            me.setLoading(false)
          }, function (err) {
            me.setLoading(false)
            throw err
          })
          dialogWindow.close()
        }
      })
    }
  })
}
