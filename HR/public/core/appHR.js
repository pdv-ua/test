/* global $App AC UB appAC Blob saveAs _ Ext */
module.exports = {
  createNewVersion,
  getCurrentPeriod,
  getPeriodOnDate,
  getPeriodByID,
  getAccountantChiefPosition,
  periodExpand,
  showStaffOrderForm,
  stateFormat,
  checkFormByCode,
  regReportSalaryForm,
  getAccCategoryByPositionType,
  getPayElIDDependency,
  showDimensin,
  showEmployeeNumber,
  showRl,
  showTimeSheet,
  getPayOutList,
  setAvgDimensionEdit,
  setAvgDimensionRowEdit,
  showtAvgDimensinEdit,
  getPrintDocument,
  getPrintUniRef
}

function periodExpand (combo) {
  const timerId = setTimeout(() => {
    let val = combo.getValue()
    if (val !== null) {
      let rec = combo.findRecordByValue(combo.getValue())
      let node = combo.picker.getNode(rec)
      if (node) {
        combo.picker.highlightItem(node)
        combo.picker.listEl.scrollChildIntoView(node, false)
      }
    }
    clearInterval(timerId)
  }, 200)
}

function createNewVersion (entityName, defaultValues, afterClose, customParams = null) {
  if (!customParams) {
    customParams = {
      isNameOnly: false
    }
  }
  let config = {
    cmdType: 'showForm',
    formCode: entityName,
    entity: entityName,
    cmpInitConfig: {
      defaultValues: defaultValues,
      afterClose: afterClose
    },
    customParams: customParams
  }
  $App.doCommand(config)
}

function getCurrentPeriod (orgID) {
  return UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo', 'name', 'mi_modifyDate', 'priorPeriodID', 'nextPeriodID', 'description'])
    .where('orgID', '=', orgID)
    .where('isCurrent', '=', true)
    .selectSingle().then(response => {
      return response ? {
        ID: response.ID,
        dateFrom: AC.dateService.shiftDate(response.dateFrom),
        dateTo: AC.dateService.shiftDate(response.dateTo),
        name: response.name,
        priorPeriodID: response.priorPeriodID,
        nextPeriodID: response.nextPeriodID,
        mi_modifyDate: response.mi_modifyDate,
        description: response.description
      } : { ID: null, dateFrom: null, dateTo: null, name: '', description: '' }
    })
}

function getPeriodOnDate (orgID, onDate) {
  return UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'dateFrom', 'dateTo'])
    .where('orgID', '=', orgID)
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .selectSingle().then(response => {
      return response ? {
        ID: response.ID,
        dateFrom: AC.dateService.shiftDate(response.dateFrom),
        dateTo: AC.dateService.shiftDate(response.dateTo)
      } : { ID: null, dateFrom: null, dateTo: null }
    })
}
function getPeriodByID (periodID) {
  return UB.Repository('hr_dictPeriod')
    .attrs(['ID', 'orgID', 'name', 'dateFrom', 'dateTo', 'isClosed'])
    .selectById(periodID).then(response => {
      return response ? {
        ID: response.ID,
        dateFrom: AC.dateService.shiftDate(response.dateFrom),
        dateTo: AC.dateService.shiftDate(response.dateTo),
        name: response.name,
        isClosed: response.isClosed
      } : { ID: null, dateFrom: null, dateTo: null, name: '', isClosed: null }
    })
}

function getAccountantChiefPosition (orgID, onDate) {
  return UB.Repository('hr_orgRespPosition').attrs(['positionID'])
    .where('organizationID', '=', orgID)
    .where('mi_deleteDate', '>=', '#maxdate')
    .where('dateFrom', '<=', onDate)
    .where('dateTo', '>=', onDate)
    .where('respPosition', '=', 'accChief')
    .selectSingle().then(response => {
      return response ? {
        ID: response.positionID
      } : { ID: null }
    })
}

function showStaffOrderForm (staffTableID, entryOrderID) {
  function showOrderForm (orderID) {
    UB.Repository('hr_empOrder')
      .attrs(['empOrderType'])
      .where('ID', '=', orderID)
      .selectScalar().then(empOrderType => {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_empOrder',
          entity: 'hr_empOrder',
          instanceID: orderID,
          tabId: 'tmp_empOrder_' + orderID,
          target: $App.getViewport().centralPanel,
          cmpInitConfig: { defaultValues: { empOrderType: empOrderType } }
        })
      })
  }

  if (!staffTableID) return
  if (entryOrderID) {
    showOrderForm(entryOrderID)
  } else {
    UB.Repository('hr_empOrder')
      .attrs('ID')
      .where('empOrderType', '=', 'STAFFLIST')
      .where('staffTableID', '=', staffTableID)
      .orderBy('orderDate', 'desc')
      .selectSingle()
      .then(item => {
        if (item) {
          showOrderForm(item.ID)
        } else {
          AC.viewUtils.showToast(UB.i18n('Помилка'), UB.i18n('Наказ не знайдено'))
        }
      })
  }
}

function stateFormat (value) {
  const enumStore = UB.core.UBEnumManager.getStore('HR_ORDER_STATE')
  const enumRow = enumStore.getById(value)
  return enumRow.get('name') || null
}

function checkFormByCode (formCode) {
  const formStore = UB.core.UBStoreManager.getFormStore()
  let res = formStore.findRecord('code', formCode, 0, false, true, true)
  return !!res
}

async function regReportSalaryForm (defaultValues = {}) {
  const config = {
    caption: UB.i18n('Створити звіт'),
    cmdType: 'showForm',
    formCode: 'ac_regReportSelect',
    cmpInitConfig: {
      caption: UB.i18n('Створити звіт'),
      tip: UB.i18n('Створити звіт'),
      repCode: [
        'J05001',
        'J30004', 'J30401', 'J30402', 'J30403', 'J30404', 'J30405', 'J30406', 'J30407', 'J30408', 'J30409',
        'S03010', 'S03011', 'S02201', 'S03030',
        'C11001', 'C11101', 'C11102', 'C11103', 'C11104', 'C11105', 'C11002',
        'H03010', 'H01100', 'H02100', 'H04010'
      ],
      repGroup: ['statistical', 'taxation', 'fssu', 'pf'],
      model: 'HR',
      defaultParams: defaultValues
    },
    inWindow: 1
  }
  $App.doCommand(config)
}

function getAccCategoryByPositionType (positionType) {
  switch (positionType) {
    case '1': // Держслужбовець
      return '2' // Держслужбовець
    case '2': // Службовець
    case '3': // Працівник, з функцій обслуговування
      return '1' // Працівник
    case '4': // Військовослужбовець
      return '4' // Військовий
    case '5': // Політична посада
      return '1' // Працівник
    case '6': // Патронатна служба
      return '2' // Держслужбовець
    case '7': // Робітник
    case '8': // Працівник за тарифним розрядом
    case '9': // Службовець організації місцевого самоврядування
    case '10': // Працівник правоохоронних органів
    case '11': // Нотаріус
    case '12': // Працівник виробництва
      return '1' // Працівник
    default:
      return '1' // Працівник
  }
}

function getPayElIDDependency () {
  return [ // [ dictStaffCatID, workPlace, workerType, payElID ]
    ['1', '1', '1', '1'], ['1', '1', '1', '2'], ['1', '1', '1', '44'], ['1', '1', '1', '63'], ['1', '1', '1', '3'], ['1', '1', '1', '77'],
    ['1', '1', '2', '1'], ['1', '1', '2', '2'], ['1', '1', '2', '44'], ['1', '1', '2', '63'], ['1', '1', '2', '3'], ['1', '1', '2', '77'],
    ['1', '1', '3', '1'], ['1', '1', '3', '2'], ['1', '1', '3', '44'], ['1', '1', '3', '63'], ['1', '1', '3', '3'], ['1', '1', '3', '77'],
    ['1', '1', '4', '1'], ['1', '1', '4', '2'], ['1', '1', '4', '44'], ['1', '1', '4', '63'], ['1', '1', '4', '3'], ['1', '1', '4', '77'],

    ['1', '2', '1', '1'], ['1', '2', '1', '2'], ['1', '2', '1', '44'], ['1', '2', '1', '63'], ['1', '2', '1', '3'], ['1', '2', '1', '77'],
    ['1', '2', '2', '1'], ['1', '2', '2', '2'], ['1', '2', '2', '44'], ['1', '2', '2', '63'], ['1', '2', '2', '3'], ['1', '2', '2', '77'],
    ['1', '2', '3', '1'], ['1', '2', '3', '2'], ['1', '2', '3', '44'], ['1', '2', '3', '63'], ['1', '2', '3', '3'], ['1', '2', '3', '77'],
    ['1', '2', '4', '1'], ['1', '2', '4', '2'], ['1', '2', '4', '44'], ['1', '2', '3', '63'], ['1', '2', '3', '3'], ['1', '2', '3', '77'],

    ['1', '3', '1', '1'], ['1', '3', '1', '2'], ['1', '3', '1', '44'], ['1', '3', '1', '63'], ['1', '3', '1', '3'], ['1', '3', '1', '77'],
    ['1', '3', '2', '1'], ['1', '3', '2', '2'], ['1', '3', '2', '44'], ['1', '3', '2', '63'], ['1', '3', '2', '3'], ['1', '3', '2', '77'],
    ['1', '3', '3', '1'], ['1', '3', '3', '2'], ['1', '3', '3', '44'], ['1', '3', '2', '63'], ['1', '3', '2', '3'], ['1', '3', '2', '77'],
    ['1', '3', '4', '1'], ['1', '3', '4', '2'], ['1', '3', '4', '44'], ['1', '3', '4', '63'], ['1', '3', '4', '3'], ['1', '3', '4', '77'],

    ['1', '4', '1', '1'], ['1', '4', '1', '2'], ['1', '4', '1', '44'], ['1', '4', '1', '63'], ['1', '4', '1', '3'], ['1', '4', '1', '77'],
    ['1', '4', '2', '1'], ['1', '4', '2', '2'], ['1', '4', '2', '44'], ['1', '4', '2', '63'], ['1', '4', '2', '3'], ['1', '4', '2', '77'],
    ['1', '4', '3', '1'], ['1', '4', '3', '2'], ['1', '4', '3', '44'], ['1', '4', '3', '63'], ['1', '4', '3', '3'], ['1', '4', '3', '77'],
    ['1', '4', '4', '1'], ['1', '4', '4', '2'], ['1', '4', '4', '44'], ['1', '4', '4', '63'], ['1', '4', '4', '3'], ['1', '4', '4', '77'],

    ['1', '5', '1', '1'], ['1', '5', '1', '2'], ['1', '5', '1', '44'], ['1', '5', '1', '63'], ['1', '5', '1', '3'], ['1', '5', '1', '77'],
    ['1', '5', '2', '1'], ['1', '5', '2', '2'], ['1', '5', '2', '44'], ['1', '5', '2', '63'], ['1', '5', '2', '3'], ['1', '5', '2', '77'],
    ['1', '5', '3', '1'], ['1', '5', '3', '2'], ['1', '5', '3', '44'], ['1', '5', '3', '63'], ['1', '5', '3', '3'], ['1', '5', '3', '77'],
    ['1', '5', '4', '1'], ['1', '5', '4', '2'], ['1', '5', '4', '44'], ['1', '5', '4', '63'], ['1', '5', '4', '3'], ['1', '5', '4', '77'],

    // ----------------------------------------------------------------
    ['2', '1', '1', '1'], ['2', '1', '1', '44'], ['2', '1', '1', '3'], ['2', '1', '1', '77'],
    ['2', '1', '2', '1'], ['2', '1', '2', '44'], ['2', '1', '2', '3'], ['2', '1', '2', '77'],
    ['2', '5', '1', '1'], ['2', '5', '1', '44'], ['2', '5', '1', '3'], ['2', '5', '1', '77'],
    ['2', '5', '2', '1'], ['2', '5', '2', '44'], ['2', '5', '2', '3'], ['2', '5', '2', '77'],
    // ----------------------------------------------------------------
    ['3', '1', '1', '1'], ['3', '1', '1', '44'], ['3', '1', '1', '3'], ['3', '1', '1', '77'],
    ['3', '1', '2', '1'], ['3', '1', '2', '44'], ['3', '1', '2', '3'], ['3', '1', '2', '77'],
    ['3', '5', '1', '1'], ['3', '5', '1', '44'], ['3', '5', '1', '3'], ['3', '5', '1', '77'],
    ['3', '5', '2', '1'], ['3', '5', '2', '44'], ['3', '5', '2', '3'], ['3', '5', '2', '77'],
    // ----------------------------------------------------------------
    ['4', '1', '1', '1'], ['4', '1', '1', '44'], ['4', '1', '1', '3'], ['4', '1', '1', '77'],
    ['4', '1', '2', '1'], ['4', '1', '2', '44'], ['4', '1', '2', '3'], ['4', '1', '2', '77'],
    ['4', '1', '4', '1'], ['4', '1', '4', '44'], ['4', '1', '4', '3'], ['4', '1', '4', '77'],
    ['4', '5', '1', '1'], ['4', '5', '1', '44'], ['4', '5', '1', '3'], ['4', '5', '1', '77'],
    ['4', '5', '2', '1'], ['4', '5', '2', '44'], ['4', '5', '2', '3'], ['4', '5', '2', '77'],
    ['4', '5', '4', '1'], ['4', '5', '4', '44'], ['4', '5', '4', '3'], ['4', '5', '4', '77'],
    // ----------------------------------------------------------------
    ['5', '1', '1', '1'], ['5', '1', '1', '44'], ['5', '1', '1', '3'], ['5', '1', '1', '77'],
    ['5', '1', '2', '1'], ['5', '1', '2', '44'], ['5', '1', '2', '3'], ['5', '1', '2', '77'],
    ['5', '5', '1', '1'], ['5', '5', '1', '44'], ['5', '5', '1', '3'], ['5', '5', '1', '77'],
    ['5', '5', '2', '1'], ['5', '5', '2', '44'], ['5', '5', '2', '3'], ['5', '5', '2', '77'],
    // ----------------------------------------------------------------
    ['6', '4', '1', '1'], ['6', '4', '1', '2'], ['6', '4', '1', '44'], ['6', '4', '1', '63'], ['6', '4', '1', '3'], ['6', '4', '1', '77'],
    ['6', '4', '2', '1'], ['6', '4', '2', '2'], ['6', '4', '2', '44'], ['6', '4', '2', '63'], ['6', '4', '2', '3'], ['6', '4', '2', '77'],
    ['6', '4', '3', '1'], ['6', '4', '3', '2'], ['6', '4', '3', '44'], ['6', '4', '3', '63'], ['6', '4', '3', '3'], ['6', '4', '3', '77'],
    ['6', '4', '4', '1'], ['6', '4', '4', '2'], ['6', '4', '4', '44'], ['6', '4', '4', '63'], ['6', '4', '4', '3'], ['6', '4', '4', '77'],
    ['6', '5', '1', '1'], ['6', '5', '1', '2'], ['6', '5', '1', '44'], ['6', '5', '1', '63'], ['6', '5', '1', '3'], ['6', '5', '1', '77'],
    ['6', '5', '2', '1'], ['6', '5', '2', '2'], ['6', '5', '2', '44'], ['6', '5', '2', '63'], ['6', '5', '2', '3'], ['6', '5', '2', '77'],
    ['6', '5', '3', '1'], ['6', '5', '3', '2'], ['6', '5', '3', '44'], ['6', '5', '3', '63'], ['6', '5', '3', '3'], ['6', '5', '3', '77'],
    ['6', '5', '4', '1'], ['6', '5', '4', '2'], ['6', '5', '4', '44'], ['6', '5', '4', '63'], ['6', '5', '4', '3'], ['6', '5', '4', '77'],
    // ----------------------------------------------------------------
    ['7', '4', '1', '1'], ['7', '4', '1', '3'], ['7', '4', '1', '77'],
    ['7', '4', '2', '1'], ['7', '4', '2', '3'], ['7', '4', '2', '77'],
    ['7', '4', '3', '1'], ['7', '4', '3', '3'], ['7', '4', '3', '77'],
    ['7', '4', '4', '1'], ['7', '4', '4', '3'], ['7', '4', '4', '77'],
    ['7', '5', '1', '1'], ['7', '5', '1', '3'], ['7', '5', '1', '77'],
    ['7', '5', '2', '1'], ['7', '5', '2', '3'], ['7', '5', '2', '77'],
    ['7', '5', '3', '1'], ['7', '5', '3', '3'], ['7', '5', '3', '77'],
    ['7', '5', '4', '1'], ['7', '5', '4', '3'], ['7', '5', '4', '77']
  ]
}
function showDimensin (orgID, accrualDt) {
  if (orgID && accrualDt) {
    $App.connection.run({
      entity: 'hr_rl',
      method: 'getDimension',
      params: accrualDt,
      orgID: orgID
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

function showEmployeeNumber (employeeNumberID, isModal = false) {
  if (employeeNumberID && AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'view')) {
    UB.Repository('hr_employeeNumberSR').attrs(['ID', 'limitedAccess']).selectById(employeeNumberID).then(res => {
      if (res && res.ID && (AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess') || !res.limitedAccess)) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employeeNumber',
          entity: 'hr_employeeNumber',
          instanceID: employeeNumberID,
          tabId: !isModal ? `hr_employeeNumber-${employeeNumberID}` : null,
          target: !isModal ? $App.getViewport().centralPanel : null,
          isModal: isModal
        })
      }
    })
  }
}

function showRl (employeeNumberID, periodID, defaultValues = {}) {
  if (employeeNumberID && AC.entityUtils.verifyRightsMethod('hr_rl', 'view')) {
    UB.Repository('hr_employeeNumberSR').attrs(['ID', 'limitedAccess']).selectById(employeeNumberID).then(res => {
      if (res && res.ID && (AC.entityUtils.verifyRightsMethod('hr_employeeNumber', 'employeeLimitedAccess') || !res.limitedAccess)) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_rl',
          entity: 'hr_rl',
          cmpInitConfig: {
            defaultValues: Object.assign({
              employeeNumberID,
              periodID
            }, defaultValues)
          },
          tabId: `hr_rl-${employeeNumberID}`,
          target: $App.getViewport().centralPanel
        })
      }
    })
  }
}

function showTimeSheet (employeeNumberID, periodID) {
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'tim_timeSheet',
    entity: 'tim_timeSheet',
    cmpInitConfig: {
      defaultValues: {
        employeeNumberID,
        periodID
      }
    },
    tabId: `tim_timeSheet${employeeNumberID}`,
    target: $App.getViewport().centralPanel
  })
}

function getPayOutList (orgID) {
  return UB.Repository('hr_organization')
    .attrs('mi_treePath')
    .where('mi_data_id', '=', orgID)
    .where('state', '=', 'ACTIVE')
    .limit(1)
    .selectScalar()
    .then(treePath => {
      return UB.Repository('hr_payOut').attrs('ID')
        .where('organizationID', 'equal', orgID, 'org')
        .where('subOrg', 'equal', 1, 'sub')
        .where('organizationID', 'in', treePath ? treePath.split('/').map(o => Number(o)) : [orgID], 'parent')
        .logic('([org] OR ([parent] AND [sub]))')
        .selectAsObject()
        .then(payOutList => {
          return payOutList.map(o => o.ID)
        })
    })
}

function setAvgDimensionEdit (me, gridName, setFlagsFix, recalcFunction) {
  const grid = me.attr[gridName]
  $App.doCommand({
    cmdType: 'showForm',
    formCode: 'hr_avgDimensionEdit',
    isModal: true,
    cmpInitConfig: {
      orgID: me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization(),
      employeeNumberID: me.attr.employeeNumberID.getValue(),
      employeeID: me.attr.employeePositionID.getFieldValue('employeeID'),
      readOnly: me.record.get('orderState') === 'POSTED',
      calcEarnings: me.attr.calcEarnings ? me.attr.calcEarnings.getValue() : 'DAYS',
      data: grid.getData(),
      setFlagsFix,
      onSave: (data) => {
        const allRecords = grid.getStore().snapshot || grid.getStore().data
        allRecords.each(record => {
          const periodData = data.find(o => o.periodID === record.get('periodID'))
          if (periodData && (periodData.flagsFix & setFlagsFix) === setFlagsFix) {
            record.set('accrualDt', periodData.accrualDt)
            record.set('opSum', periodData.paySum)
            record.set('baseSum', AC.currencyService.round((periodData.paySum - (record.get('baseSumNotIndex') || 0)) / (record.get('opKoef') || 1)), 2)
            record.set('flagsFix', periodData.flagsFix)
          }
        })
        if (recalcFunction) {
          me[recalcFunction](me)
        }
      }
    }
  })
}
function setAvgDimensionRowEdit (me, record, setFlagsFix, recalcFunction) {
  if (record) {
    $App.doCommand({
      cmdType: 'showForm',
      formCode: 'hr_avgDimensionEdit',
      isModal: true,
      cmpInitConfig: {
        orgID: me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization(),
        employeeNumberID: me.attr.employeeNumberID.getValue(),
        employeeID: me.attr.employeePositionID.getFieldValue('employeeID'),
        readOnly: me.record.get('orderState') === 'POSTED',
        calcEarnings: me.attr.calcEarnings ? me.attr.calcEarnings.getValue() : 'DAYS',
        data: [record.getData()],
        setFlagsFix,
        onSave: (data) => {
          const periodData = data.find(o => o.periodID === record.get('periodID'))
          if (periodData && (periodData.flagsFix & setFlagsFix) === setFlagsFix) {
            record.set('accrualDt', periodData.accrualDt)
            record.set('opSum', periodData.paySum)
            record.set('baseSum', AC.currencyService.round((periodData.paySum - (record.get('baseSumNotIndex') || 0)) / (record.get('opKoef') || 1)), 2)
            record.set('flagsFix', periodData.flagsFix)
          }
          if (recalcFunction) {
            me[recalcFunction](me)
          }
        }
      }
    })
  }
}

function showtAvgDimensinEdit (me, record, setFlagsFix, recalcFunction) {
  if (record) {
    const accrualDt = record.get('accrualDt') || '[]'
    $App.connection.run({
      entity: 'hr_rl',
      method: 'getDimension',
      params: accrualDt,
      orgID: me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization()
    }).then(response => {
      const data = JSON.parse(response.resultData)
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_rlDimension',
        isModal: true,
        cmpInitConfig: {
          readOnly: me.record.get('orderState') === 'POSTED',
          defaultValues: data,
          paySum: record.get('opSum'),
          checkPaySum: false,
          orgID: me.record.get('orderRegistryID.organizationID') || appAC.globalOrganization(),
          employeeNumberID: me.attr.employeeNumberID.getValue(),
          typeData: 'accrual',
          onSave: (accrualDt, paySum) => {
            let flagsFix = (record.get('flagsFix') || 0) | 1 << 17
            if (AC.currencyService.round(paySum) !== AC.currencyService.round(record.get('opSum'))) {
              if (!record.get('opDays')) {
                record.set('opDays', 1)
              }
              flagsFix = flagsFix | setFlagsFix
              record.set('baseSum', AC.currencyService.round((paySum - (record.get('baseSumNotIndex') || 0)) / (record.get('opKoef') || 1)), 6)
            }
            record.set('flagsFix', flagsFix)
            record.set('accrualDt', JSON.stringify(accrualDt))
            me[recalcFunction](me)
          }
        }
      })
    })
  }
}

async function getPrintDocument (me, code, reportConfig, employeeID, employeeNumberID) {
  if (['dergSlugOsobovaKartka2020', 'dergSlugOsobovaKartka'].includes(code)) {
    (UB.Repository('hr_employeePositionSR')
      .attrs(['*'])
      .where('employeeID', '=', employeeID)
      .where('organizationID', '=', appAC.globalOrganization())
      .where('employeeNumberID', '=', employeeNumberID)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('positionID.positionType', '=', 1)
      .orderBy('dateFrom', 'asc')
      .selectSingle()).then(res => {
      if (res) {
        formPrintDocument(me, code, 'docx')
      } else {
        $App.dialogInfo(UB.i18n('Особа не є державним службовцем, використайте іншу особову картку'))
      }
    })
  } else {
    formPrintDocument(me, code, reportConfig, employeeID, employeeNumberID)
  }
}

async function formPrintDocument (me, code, reportConfig, employeeID, employeeNumberID) {
  if (me.setLoading) me.setLoading(true)
  $App.connection.run({
    entity: 'hr_employee',
    method: reportConfig.refParams.type === 'docx' ? 'docPrintForm' : 'repPrintForm',
    params: {
      code: code,
      type: reportConfig.refParams.type,
      reportCode: reportConfig.refParams.reportCode,
      instanceID: employeeID,
      onDate: appAC.globalApplicationDate(),
      orgID: appAC.globalOrganization(),
      tabNumID: employeeNumberID
    }
  }).then(function (result) {
    if (me.setLoading) me.setLoading(false)
    if (result.params.type === 'docx') {
      if (result.docs) {
        const docs = JSON.parse(result.docs)
        _.forEach(docs, function (item) {
          const fileContent = JSON.parse(item.fileContent)
          const contentLength = fileContent.length
          const pdfArray = new Uint8Array(new ArrayBuffer(contentLength))
          const filename = item.fileName + '.docx'
          for (let i = 0; i < contentLength; i++) {
            pdfArray[i] = fileContent.charCodeAt(i)
          }
          const dBlob = new Blob([pdfArray], { type: 'application/msword' })
          saveAs(dBlob, filename)
        })
      }
    } else if (result.params.type === 'report' || result.params.type === 'report2') {
      const reportDesc = (me.initialConfig && me.initialConfig.commandConfig && me.initialConfig.commandConfig.description) || undefined
      $App.doCommand({
        cmdType: 'showForm',
        formCode: result.params.type === 'report' ? 'hr_repParamEmpInfo' : 'hr_repParamEmpInfo2',
        caption: reportDesc,
        cmpInitConfig: {
          signerAllowBlank: true,
          defaultRefSigner: true,
          reportCode: result.params.reportCode,
          reportViewCode: code,
          employeeID: employeeID,
          reportDescription: reportDesc,
          reportIdx: reportConfig.refParams.reportIdx,
          employeeNumberID: employeeNumberID,
          onDate: appAC.globalApplicationDate()
        }
      })
    } else if (result.params.type === 'reportDovidka') {
      const reportDesc = (me.initialConfig && me.initialConfig.commandConfig && me.initialConfig.commandConfig.description) || undefined
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_repParamEmpDovidka',
        caption: reportDesc,
        cmpInitConfig: {
          signerAllowBlank: true,
          reportCode: result.params.reportCode,
          reportViewCode: code,
          employeeID: employeeID,
          reportDescription: reportDesc,
          reportIdx: code,
          employeeNumberID: employeeNumberID,
          onDate: appAC.globalApplicationDate()
        }
      })
    } else if (result.params.type === 'reportPDF') {
      const reportDesc = (me.initialConfig && me.initialConfig.commandConfig && me.initialConfig.commandConfig.description) || undefined
      const report = Ext.create('UBS.UBReport', {
        code: result.params.reportCode,
        type: 'pdf',
        params: {
          employeeID: employeeID,
          employeeNumberID: employeeNumberID,
          tabNum: me.tabNum,
          reportDescription: reportDesc
        }
      })
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'ac_documentViewer',
        caption: UB.i18n('Друкована форма'),
        cmpInitConfig: { report: report },
        tabId: 'printDocument_' + result.params.reportCode + '_' + me.instanceID,
        description: reportDesc,
        target: $App.getViewport().centralPanel
      })
    } else if (result.params.type === 'excel') {
      const expOnDate = AC.dateService.currentDate()

      $App.doCommand({
        cmdType: 'showReport',
        caption: UB.i18n('Друкована форма'),
        tabId: 'printDocument_' + result.params.reportCode + Date.now(),
        target: $App.getViewport().centralPanel,
        cmdData: {
          reportCode: result.params.reportCode,
          reportParams: {
            expOnDate: expOnDate,
            employeeNumberID: employeeNumberID || 0,
            instanceID: employeeID
          },
          reportOptions: {
            showParamForm: result.params.reportCode === 'hr_printEmployeeWorkbookDtCode6' || result.params.reportCode === 'hr_reportCalcExperience',
            allowExportToExcel: true,
            isModal: false
          }
        }
      })
    } else if (result.params.type === 'reportAccrual') {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_accrual-report',
        tabId: result.params.reportCode + Date.now(),
        target: $App.getViewport().centralPanel,
        cmpInitConfig: {
          defaultEmployeeNumberID: employeeNumberID
        },
        cmdData: {
          reportCode: result.params.reportCode,
          reportOptions: { allowExportToExcel: reportConfig.refParams.allowExportToExcel }
        }
      })
    }
  }).then(function () {
    if (me.setLoading) me.setLoading(false)
  })
}

async function getPrintUniRef (me, code, employeeID, employeeNumberID) {
  if (me.setLoading) me.setLoading(true)

  $App.connection.run({
    entity: 'hr_dictUniversalRef',
    method: 'getReport',
    params: {
      refCode: code,
      onDate: appAC.globalApplicationDate(),
      organizationID: appAC.globalOrganization(),
      employeeNumberID: employeeNumberID
    }
  }).then(function (result) {
    if (me.setLoading) me.setLoading(false)

    $App.doCommand({
      cmdType: 'showForm',
      formCode: 'ac_documentViewer',
      caption: UB.i18n('Друкована форма'),
      cmpInitConfig: {
        reportType: 'html',
        htmlData: result.refText,
        fileName: result.refName,
        report: { hiddenActions: ['actionPDF'], reportOptions: { pageOrientation: 'portrait', pageMargin: result.pageMargin } }
      },
      tabId: 'printDocument_' + me.reportCode + '_' + me.reportIdx + '_' + employeeID,
      description: me.reportDescription,
      target: $App.getViewport().centralPanel
    })
  }).then(function () {
    if (me.setLoading) me.setLoading(false)
  })
}
