/* global appAC AC HR $App UB Ext _ */

exports.formCode = {
  initComponentStart,
  initComponentDone,
  onFormDataReady,
  onClose,
  onAfterSave,
  setPayElEntry,
  setTimeCost,
  setFundSource,
  setWorkPlace,
  addBaseActions
}

function initComponentStart () {
  const me = this
  me.on('controlChanged', onControlChanged, me)
  me.on('formDataReady', onFormDataReady, me)
  me.on('aftersave', onAfterSave, me)
}

function initComponentDone () {
  const me = this
  me.actions.fDelete.hide()
  AC.viewUtils.setAttr(me, ['accountDimensionsControl'])
}

function onAfterSave () {
  this.method = undefined
}

function onFormDataReady () {
  const me = this
  HR.elTabs.getTabConfig(me, me.record.get('methodID'), me.record.get('methodID.code'))
  if (me.method === 'copyRecord') {
    me.record.set('code', null)
    me.record.set('name', null)
  }
  if (!AC.entityUtils.verifyRightsMethod('hr_payEl', 'update')) {
    me.actions.printPayAction.setDisabled(true)
    _.forEach(me.attr, field => {
      field.setReadOnly(true)
    })
  }
  me.attr.dictProgClassID[AC.settings.get('hrProgClassAcc', appAC.globalOrganization()) ? 'show' : 'hide']()
  me.attr.dictProjectID[AC.settings.get('hrProjectAcc', appAC.globalOrganization()) ? 'show' : 'hide']()
}

function onClose (ID, store, formWasSaved) {
  const me = this
  if (me.method === 'copyRecord' && !formWasSaved) {
    $App.connection.run({
      entity: 'hr_payEl',
      method: 'deleteRecord',
      params: {
        entityName: 'hr_payEl',
        safe: false,
        ID: me.instanceID
      }
    }).then(() => {
      me.sourceGrid && me.sourceGrid.onRefresh()
    })
  } else {
    me.sourceGrid && me.sourceGrid.onRefresh()
  }
}

function onControlChanged (field, value) {
  const me = this
  if (!me.formDataReady) {
    return
  }
  const methodCode = me.attr.methodID.getFieldValue('code')
  switch (field.name) {
    case 'methodID':
      me.record.set('calcProportion', null)
      me.record.set('isMtCount', 1)
      me.record.set('isTimeSheet', 1)
      me.record.set('isAutoCalc', 0)
      me.record.set('calcSumType', null)
      me.record.set('calcAvgType', null)
      me.record.set('calcIndAvgType', null)
      me.record.set('periodType', null)
      me.record.set('calcMounth', null)
      me.record.set('roundAverage', 0)
      me.record.set('dictTimeCostID', null)
      me.record.set('dictTimeCostWorkID', null)
      me.record.set('dictTimeCostAvgID', null)
      me.record.set('estimated', null)
      me.record.set('alimonyLessPayment', null)
      me.record.set('typePrepayment', null)
      me.record.set('percPrepayment', null)
      me.record.set('prepaymentDay', null)
      me.record.set('includeSecondJobs', 0)
      me.record.set('ignoreInCalcPay', 0)
      me.record.set('calcAlgorithm', null)
      me.record.set('repaymentOnly', 0)
      me.record.set('shortDay', 1)
      me.record.set('shortWeek', 0)
      me.record.set('onlyPlanTrip', 0)
      me.record.set('accrueFuturePeriod', null)
      me.record.set('calcEarnings', null)
      me.record.set('isParentEmployeeNumber', 0)
      me.record.set('isLastEmployeeNumber', 0)
      me.record.set('isIndividualRate', 0)
      me.record.set('notLimitPayments', 0)
      me.record.set('includeInCalcAvg', null)
      me.record.set('useDictTech', 0)
      me.record.set('useKPI', 0)
      me.record.set('excludeMonthFreeDays', 0)
      me.record.set('baseSumIsAverage', 1)
      me.record.set('isPayInHolidays', 0)
      me.record.set('isCalcReservePart', 0)
      me.record.set('notUseBenefits', 0)
      me.record.set('typeCalcTime', 'TYPEWORK')
      me.record.set('isNormMinSum', 1)
      me.record.set('isLimitTimeSheet', 0)
      me.record.set('sumPayMore', null)
      me.record.set('isCorrectPlan', 0)
      me.record.set('periodSummarized', 'MONTH')
      me.record.set('notReqReport', 0)
      me.record.set('calcPlanType', null)
      me.record.set('dayAccumCondition', null)
      me.record.set('isPayDismAll', 1)
      me.record.set('isPayDismSalPeriod', 1)
      me.record.set('isPayDismCalcPeriod', 0)
      me.record.set('isPayDismOnlyPeriod', 0)
      me.record.set('payElID', null)
      me.record.set('rightRate', null)
      me.record.set('calcMounthRate', null)
      me.record.set('maxMtCount', null)
      me.record.set('dayEarningType', null)
      me.record.set('payDownTime', 0)
      me.record.set('payOverNorm', 0)
      me.record.set('useTimeSheetBy', null)
      me.record.set('usePartialFirstMonth', 0)
      me.record.set('normTimeBy', null)
      me.record.set('calcTimeProportion', null)
      me.record.set('calcByDayEarnPermAcc', 0)
      me.record.set('calcEachPeriod', 0)
      HR.elTabs.getTabConfig(me, value, methodCode)
      me.attr.includeSecondJobs.setValue(methodCode === '26')
      if (methodCode === '21') {
        me.attr.accrueFuturePeriod.setValue('CURRENT')
        me.record.set('dayEarningType', 'PLANAVTO')
      }
      if (methodCode === '2' && !me.record.get('calcProportion')) me.record.set('calcProportion', 'HOUR')
      if (['12', '45', '46', '47', '65', '206'].includes(methodCode)) {
        me.record.set('includeInCalcAvg', '1')
      }
      if (['21', '22', '23', '58', '68', '73'].includes(methodCode)) {
        me.record.set('usePartialFirstMonth', 1)
      }
      if (['204', '205'].includes(methodCode)) {
        me.record.set('calcTimeProportion', 'SALARY')
        me.record.set('isLimitTimeSheet', 1)
        me.record.set('includeSecondJobs', 1)
        me.record.set('sumPayMore', 10)
      }
      if (['45', '46', '47', '65'].includes(methodCode)) {
        me.record.set('calcTimeProportion', 'DAY')
      }
      break
    case 'typePrepayment':
      me.attr.percPrepayment.setFieldLabel(me.attr.typePrepayment.getValue() === '2' ? UB.i18n('Не менше % від плана') : UB.i18n('Відсоток авансу'))
      if (['29'].includes(methodCode)) {
        me.attr.includeSecondJobs[me.attr.typePrepayment.getValue() === '2' ? 'show' : 'hide']()
        if (me.attr.typePrepayment.getValue() !== '2') {
          me.attr.includeSecondJobs.setValue(false)
        }
      }
      break
    case 'calcSumType':
      if (['45', '46', '47', '65'].includes(methodCode)) {
        me.attr.calcSumType.getValue() === 'FACT' ? me.attr.periodType.show() : me.attr.periodType.hide()
        me.attr.periodType.setAllowBlank(me.attr.calcSumType.getValue() !== 'FACT')
      }
      break
  }
}

function getEntryType (gridName) {
  switch (gridName) {
    case 'payElEntrySum':
      return 'SUM'
    case 'payElEntryMinSum':
      return 'MINSUM'
    case 'payElEntryPlanSum':
      return 'PLANSUM'
    case 'payElTimeCost':
    case 'payElTimeCostOut':
      return 'INTIME'
    case 'payElTimeCostNot':
      return 'NOTTIME'
    case 'payElAddRetention':
      return 'ADDRETENTION'
    case 'payElAccrualReserve':
      return 'ACCRUALRESERVE'
    case 'payElUseReserve':
      return 'USERESERVE'
    case 'payElTimeExcludePremium':
      return 'EXCLUDE_TIME_PREMIUM'
  }
  return 'TIME'
}

function setPayElEntry (me, grid) {
  let payElEntryType = me.attr.methodID.getFieldValue('payElEntryType')
  const payElEntry = me.attr.methodID.getFieldValue(grid.name) ? me.attr.methodID.getFieldValue(grid.name).split(',') : null
  const entryType = getEntryType(grid.name)
  if (entryType === 'ADDRETENTION') {
    payElEntryType = 'OFFTAKE'
  }
  UB.Repository('hr_payElEntry')
    .attrs(['ID', 'payElBaseID', 'dateFrom', 'dateTo'])
    .where('payElID', '=', me.instanceID)
    .where('entryType', '=', entryType)
    .where('payElBaseID.mi_deleteDate', '>=', '#maxdate')
    .orderBy('dateFrom', 'asc')
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_payElSelectWithPeriod',
        cmpInitConfig: {
          withPeriod: true,
          methodCode: payElEntry,
          payElEntryType: payElEntryType ? payElEntryType.replace(/"/g, '').split(',') : null,
          sourceData: result,
          sourceAttr: 'payElBaseID',
          onSelectData: (data) => {
            if (data.remove.length || data.add.length || data.update.length) {
              me.setLoading(true)
              $App.connection.run({
                entity: 'hr_payEl',
                method: 'updatePayElEntry',
                payElID: me.instanceID,
                entryType: getEntryType(grid.name),
                data: JSON.stringify(data)
              }).then(() => {
                grid.getStore().load()
                me.setLoading(false)
              }, (err) => {
                me.setLoading(false)
                throw err
              })
            }
          }
        }
      })
    })
}

function setTimeCost (me, grid) {
  UB.Repository('hr_payElTimeCost')
    .attrs(['ID', 'dictTimeCostID'])
    .where('entryType', '=', getEntryType(grid.name))
    .where('payElID', '=', me.instanceID)
    .selectAsObject()
    .then(result => {
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_timeCostSelect',
        entity: 'hr_timeCostSelect',
        cmpInitConfig: {
          selectData: result.map(o => o.dictTimeCostID),
          sourceData: result,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              me.setLoading(true)
              $App.connection.run({
                entity: 'hr_payEl',
                method: 'updateTimeCostEntry',
                payElID: me.instanceID,
                entryType: getEntryType(grid.name),
                data: JSON.stringify(data)
              }).then(() => {
                grid.getStore().load()
                me.setLoading(false)
              }, (err) => {
                me.setLoading(false)
                throw err
              })
            }
          }
        }
      })
    })
}

function setFundSource (me, grid) {
  UB.Repository('ac_fundSource')
    .attrs(['ID', 'name'])
    .orderBy('name')
    .selectAsObject({ 'name': 'description' }).then(sourceData => {
      UB.Repository('hr_payElFundSource')
        .attrs(['ID', 'dictFundSourceID'])
        .where('payElID', '=', me.instanceID)
        .selectAsObject({
          'dictFundSourceID': 'value'
        })
        .then(result => {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_elementSelect',
            cmpInitConfig: {
              sourceData,
              selectData: result,
              onSelectData: (data) => {
                if (data.remove.length || data.add.length) {
                  me.setLoading(true)
                  $App.connection.run({
                    entity: 'hr_payEl',
                    method: 'updateFundSource',
                    payElID: me.instanceID,
                    data: JSON.stringify(data)
                  }).then(() => {
                    grid.getStore().load()
                    me.setLoading(false)
                  }, (err) => {
                    me.setLoading(false)
                    throw err
                  })
                }
              }
            }
          })
        })
    })
}
function setWorkPlace (me, grid) {
  UB.Repository('hr_payElWorkPlace')
    .attrs(['ID', 'workPlace'])
    .where('payElID', '=', me.instanceID)
    .selectAsObject({
      'workPlace': 'value'
    })
    .then(result => {
      const sourceData = []
      UB.core.UBEnumManager.getStore('HR_WORKER_PLACE').each(record => {
        sourceData.push({
          ID: record.get('code'),
          description: record.get('name')
        })
      })
      $App.doCommand({
        cmdType: 'showForm',
        formCode: 'hr_elementSelect',
        cmpInitConfig: {
          sourceData,
          selectData: result,
          onSelectData: (data) => {
            if (data.remove.length || data.add.length) {
              me.setLoading(true)
              $App.connection.run({
                entity: 'hr_payEl',
                method: 'updateWorkPlaceEntry',
                payElID: me.instanceID,
                data: JSON.stringify(data)
              }).then(() => {
                grid.getStore().load()
                me.setLoading(false)
              }, (err) => {
                me.setLoading(false)
                throw err
              })
            }
          }
        }
      })
    })
}
function addBaseActions () {
  const me = this
  me.callParent(arguments)
  if (!me.actions.entryCalcAction) {
    me.actions.entryCalcAction = new Ext.Action({
      iconCls: 'u-icon-layers',
      scale: 'medium',
      cls: 'fill-action',
      actionId: 'entryCalcAction',
      text: UB.i18n('Входження в розрахунки'),
      eventId: 'entryCalcAction',
      handler: function () {
        me.saveForm().then(result => {
          if (result !== -1) {
            $App.doCommand({
              cmdType: 'showForm',
              formCode: 'hr_entryCalcSelect',
              cmpInitConfig: {
                payElID: me.instanceID,
                payElDescription: me.record.get('description'),
                onEditData: () => {
                  me.onRefresh()
                }
              }
            })
          }
        })
      }
    })
  }
  if (!me.actions.printPayAction) {
    me.actions.printPayAction = new Ext.Action({
      iconCls: 'fas fa-print',
      cls: 'blue-action',
      actionId: 'printPayAction',
      text: UB.i18n('Друкувати'),
      eventId: 'printPayAction',
      handler: function () {
        $App.doCommand({
          cmdType: 'showReport',
          caption: UB.i18n('Друкована форма. Вид оплати'),
          tabId: 'printDocument_hr_printPayEl' + Date.now(),
          target: $App.getViewport().centralPanel,
          cmdData: {
            reportCode: 'hr_printPayEl',
            reportParams: {
              payIDs: [me.instanceID]
            },
            reportOptions: {
              allowExportToExcel: true,
              isModal: false
            }
          }
        })
      }
    })
  }
}
