/* global UB AC appAC */
module.exports = {
  getTabConfig
}

function getTabConfig (form, methodID, methodCode, data) {
  const tabPanel = form.down('tabpanel')
  if (!methodID) {
    tabPanel.hide()
    return
  }
  let setActiv = false
  form.cfgPanels = []
  tabPanel.show()
  const hrTariffingEducational = AC.settings.get('hrTariffingEducational', appAC.globalOrganization())
  Promise.all([
    UB.Repository('hr_methodCfgPanel').attrs(['cfgPanelID.code', 'cfgPanelID.name', 'cfgPanelNameID.name'])
      .where('methodID', '=', methodID)
      .whereIf(methodCode === '1' && !hrTariffingEducational, 'cfgPanelID.code', '!==', 'payElEntrySum')
      .orderBy('sortOrder')
      .selectAsObject(),
    UB.Repository('hr_methodCfgAttr').attrs(['attrName', 'notAllowBlank'])
      .where('methodID', '=', methodID)
      .selectAsObject()

  ]).then(function ([panels, attrs]) {
    panels.push({
      'cfgPanelID.code': 'commentArea', 'cfgPanelID.name': 'Коментар'
    })
    panels.forEach(row => {
      const tabCode = row['cfgPanelID.code']
      const child = tabPanel.child(`#${tabCode}`)
      const { tab } = child
      if (tab) {
        tab.show()
      }
      form.cfgPanels.push({
        code: tabCode,
        title: row['cfgPanelNameID.name'],
        tab
      })
    })
    tabPanel.items.items.forEach(tab => {
      const panel = form.cfgPanels.find(o => o.code === tab.itemId)
      if (!panel) {
        tabPanel.child(`#${tab.itemId}`).tab.hide()
      } else {
        if (panel.title) {
          tabPanel.child(`#${tab.itemId}`).setTitle(UB.i18n(panel.title))
        }
        if (!setActiv) {
          tabPanel.setActiveTab(tabPanel.child(`#${tab.itemId}`))
          setActiv = true
        }
      }
    })
    const panelAttr = ['prepaymentDay', 'roundUpTo', 'isAutoCalc', 'isRecalculate', 'dictFundSourceID', 'calcProportion',
      'calcSumType', 'periodType', 'estimated', 'dictExperienceID', 'entryOperationID', 'dictTimeCostWorkID',
      'dictTimeCostAvgID', 'calcMounth', 'roundAverage', 'roundAvgUpTo', 'dictTimeCostID', 'percPrepayment',
      'includeSecondJobs', 'typePrepayment', 'alimonyLessPayment', 'isMtCount', 'isTimeSheet', 'ignoreInCalcPay', 'calcAlgorithm',
      'repaymentOnly', 'shortDay', 'shortWeek', 'calcAvgType', 'onlyPlanTrip', 'surchargeExperience', 'calcIndAvgType',
      'accrueFuturePeriod', 'calcEarnings', 'excludePartTimeEmp', 'hiredThisMonth', 'dictTarifCoeffID', 'accrualRate',
      'paymentIfNotLess', 'calcTimeProportion', 'isParentEmployeeNumber', 'isLastEmployeeNumber', 'isIndividualRate',
      'notLimitPayments', 'includeInCalcAvg', 'isPayInHolidays', 'isCalcReservePart', 'notUseBenefits', 'typeCalcTime',
      'useDictTech', 'isNormMinSum', 'useKPI', 'isLimitTimeSheet', 'sumPayMore', 'isCorrectPlan', 'periodSummarized',
      'notReqReport', 'calcPlanType', 'excludeMonthFreeDays', 'baseSumIsAverage', 'isPayDismAll', 'isPayDismSalPeriod',
      'isPayDismCalcPeriod', 'isPayDismOnlyPeriod', 'payElID', 'rightRate', 'calcMounthRate', 'maxMtCount', 'dayAccumCondition',
      'dayEarningType', 'payDownTime', 'useTimeSheetBy', 'usePartialFirstMonth', 'normTimeBy', 'payOverNorm',
      'calcByDayEarnPermAcc', 'calcEachPeriod'
    ]
    panelAttr.forEach(attrName => {
      const attr = attrs.find(o => o.attrName === attrName)
      if (form.attr[attrName].setAllowBlank) {
        form.attr[attrName].setAllowBlank(!attr || !attr.notAllowBlank || (attrName === 'dictTimeCostID' && ['20'].includes(methodCode)))
      }
      form.attr[attrName][attr ? 'show' : 'hide']()
      /* if (!attr && form.attr[attrName].getValue()) {
        form.attr[attrName][form.attr[attrName].setValueById ? 'setValueById' : 'setValue'](form.attr[attrName].setValueById ? null : false)
      } */

      if (attr && attrName === 'dictTarifCoeffID') {
        form.down('[name=dictTarifCoeffLabel]').show()
      }
      if (attr && attrName === 'prepaymentDay') {
        form.attr.prepaymentDay.setMinValue(attr ? 1 : null)
      }
      if (attr && attrName === 'typePrepayment') {
        form.attr.percPrepayment.setFieldLabel(form.attr.typePrepayment.getValue() === '2' ? UB.i18n('Не менше % від плана') : UB.i18n('Відсоток авансу'))
        if (['29'].includes(methodCode)) {
          form.attr.includeSecondJobs[form.attr.typePrepayment.getValue() === '2' ? 'show' : 'hide']()
        }
      }
      form.attr.calcTimeProportion.setFieldLabel(UB.i18n('Розраховується від'))
      if (['45', '46', '47', '65'].includes(methodCode)) {
        form.attr.periodType[form.attr.calcSumType.getValue() === 'FACT' ? 'show' : 'hide']()
        form.attr.calcTimeProportion.setFieldLabel(UB.i18n('Враховувати у розрахунку середнього згідно'))
      }

      if (attr && attrName === 'accrualRate' && methodCode === '137') {
        form.attr[attrName].emptyText = UB.i18n('Розраховується у розмірі 2/3, якщо відсоток не визначено')
        form.attr[attrName].tooltip = UB.i18n('Розраховується у розмірі 2/3, якщо відсоток не визначено')
        form.attr[attrName].getEl && form.attr[attrName].getEl().set({ 'data-qtip': form.attr[attrName].tooltip })
      }
    })
    if (form.isNewInstance) {
      form.attr.ignoreInCalcPay.setValue(methodCode === '74')
    }
    form.attr.ignoreInCalcPay.setDisabled(methodCode === '74')
  })
}
