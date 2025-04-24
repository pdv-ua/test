/* global Ext _ UB AC appAC HR $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    let paramStaffTableID = reportParams.staffTableID
    let staffTableID = paramStaffTableID
    let departmentID = null
    let dictFundSourceID = null
    let onDate = reportParams.onDate
    if (reportParams.caller && reportParams.caller.record) {
      const reco = reportParams.caller.record
      dictFundSourceID = reco.get('dictFundSourceID')
      departmentID = reco.get('departmentID')
      paramStaffTableID = reportParams.instanceID
      /* UBHR-9048, в звітах "Штатний розпис" та "Перелік змін" staffTableID береться з instanceID, а не staffTableID */
      staffTableID = /* reco.get('staffTableID') || */ paramStaffTableID
      onDate = AC.dateService.shiftDate(reco.get('entryDate'))
    }
    const result = {
      title: UB.i18n('ШТАТНИЙ РОЗПИС'),
      orgUnits: [],
      approvedData: '',
      approvedFIO: '',
      approvedDepName: '',
      agreedData: '',
      agreedFIO: '',
      agreedDepName: '',
      agreedOrgName: '',
      agreedOrg: '',
      totalFunsSumToWord: '',
      departmentName: '',
      fundName: '',
      progClassName: '',
      signData: [],
      agreeData: [],
      approverData: []
    }
    const staffTable = await UB.Repository('hr_staffTable')
      .attrs(['orderDate', 'groupJobsPrint', 'docType', 'printSignerInfo', 'dictFundSourceID', 'departmentID',
        'respPositionID', 'respEmployeePositionID', 'respPosition2ID', 'respEmployeePosition2ID',
        'respPosition3ID', 'respEmployeePosition3ID', 'respPosition4ID', 'respEmployeePosition4ID', 'respPosition5ID', 'respEmployeePosition5ID'])
      .misc({ __mip_recordhistory_all: true })
      .selectById(staffTableID)
    if (!onDate) {
      if ((staffTable && staffTable.orderDate)) {
        onDate = AC.dateService.shiftDate(staffTable.orderDate)
      } else {
        onDate = appAC.globalApplicationDate()
      }
    }
    if (!dictFundSourceID && staffTable && staffTable.dictFundSourceID) {
      dictFundSourceID = staffTable.dictFundSourceID
    }
    if (!departmentID && staffTable && staffTable.departmentID) {
      departmentID = staffTable.departmentID
    }
    if (reportParams.caller && reportParams.caller.record) {
      result.ecoPrintPlan = reportParams.caller && reportParams.caller.attr.ecoPrint ? reportParams.caller.attr.ecoPrint.getValue() || false : false
    }
    result.fontSizeH = result.ecoPrintPlan ? 12 : 14
    result.fontSizeT = result.ecoPrintPlan ? 10 : 12
    result.rowHeightDefault = result.ecoPrintPlan ? 24 : 26

    result.title = ['ACCRUAL_CHANGES', 'CHANGES'].includes(staffTable.docType) ? UB.i18n('ПЕРЕЛІК ЗМІН') : UB.i18n('ШТАТНИЙ РОЗПИС')
    const groupJobsPrint = staffTable && staffTable.groupJobsPrint
    result.printSignerInfo = staffTable ? staffTable.printSignerInfo : result.printSignerInfo
    const organizationID = appAC.globalOrganization()
    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .misc({ __mip_ondate: onDate })
      .selectAsObject()
    result.year = onDate.getFullYear()
    result.orgName = orgData.length && (orgData[0].nameGen || orgData[0].name)
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    const orgIDs = [organizationID]
    const orgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], onDate, undefined, false, departmentID)
    if (!orgStruct) {
      return result
    }
    const deptData = await HR.reportUtils.getDepartmentTypeNames(organizationID, onDate)
    orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
      const deptItem = _.find(deptData, { ID: item.ID })
      item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
    })

    if (departmentID) {
      const depNames = await UB.Repository('hr_department')
        .attrs(['nameGen', 'name'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()
      result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
    }

    if (dictFundSourceID) {
      const fundSource = await UB.Repository('ac_dictFundSource')
        .attrs(['dictFundTypeID.name'].concat($App.domainInfo.entities.ac_dictFundSource.dictProgClassID ? ['dictProgClassID.description'] : []))
        .where('organizationID', '=', organizationID)
        .where('fundSourceID', '=', dictFundSourceID)
        .selectSingle()
      result.fundName = HR.nameCase.cap(fundSource && fundSource['dictFundTypeID.name'] ? fundSource['dictFundTypeID.name'] + UB.i18n(' фонд') : '')
      result.progClassName = HR.nameCase.cap((fundSource && fundSource['dictProgClassID.description']) || '')
    }

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.fullName', 'dictPositionID.name', 'dictStatePayID',
        'positionType', 'quantity'])
      .where('orgID', 'in', orgIDs)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('staffOrderID', '=', staffTableID, 'order')
      .whereIf(dictFundSourceID, 'dictFundSourceID', '=', dictFundSourceID)
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .misc({ __mip_recordhistory_all: true })
      .orderBy('dictPositionID.fullName')
      .orderBy('dictPositionID.name')
      .selectAsObject()

    const accrualData = await UB.Repository('hr_staffTableAccrual')
      .attrs(['dictPositionID', 'dictStatePayID', 'positionType', 'accrualSum', 'staffTableAccrualID', 'positionID'])
      .where('staffTableID', '=', paramStaffTableID)
      .selectAsObject()

    const agreedOrg = await HR.reportUtils.getStaffAgreedOrgName(organizationID)
    if (agreedOrg) {
      result.agreedOrg = agreedOrg
    }
    if (result.printSignerInfo && staffTable) {
      const par = {
        respPositionID1: staffTable.respPositionID,
        respEmp1: staffTable.respEmployeePositionID,
        respPositionID2: staffTable.respPosition2ID,
        respEmp2: staffTable.respEmployeePosition2ID,
        respPositionID3: staffTable.respPosition3ID,
        respEmp3: staffTable.respEmployeePosition3ID,
        respPositionID4: result.twoApprover ? staffTable.respPosition4ID : null,
        respEmp4: result.twoApprover ? staffTable.respEmployeePosition4ID : null,
        respPositionID5: staffTable.respPosition5ID,
        respEmp5: staffTable.respEmployeePosition5ID
      }
      await HR.orgStructReportUtils.getSingers(result, par, onDate)

      let maxLen = result.showAccrual ? 70 : 55
      let rowHeight = result.ecoPrintPlan ? 22 : 26
      result.signData.forEach(el => {
        el.rowHeight = el.posName && el.posName.length > maxLen ? rowHeight * Math.ceil(el.posName.length / maxLen) : rowHeight
      })

      maxLen = result.showAccrual ? 60 : 40
      rowHeight = 26
      result.agreeData.forEach((el, idx) => {
        el.fontSizeH = result.fontSizeH
        el.rowHeight = el.posName && el.posName.length > maxLen ? rowHeight * Math.ceil(el.posName.length / maxLen) : rowHeight
        result[idx === 0 ? 'agreeDataFirst' : 'agreeDataSecond'] = el
      })
      result.approverData.forEach(el => {
        el.fontSizeH = result.fontSizeH
        el.approverRowHeight = el.approverPosName && el.approverPosName.length > maxLen ? rowHeight * Math.ceil(el.approverPosName.length / maxLen) : rowHeight
        if (result['agreeDataFirst']) {
          el.approverRowHeight = Math.max(el.approverRowHeight, result['agreeDataFirst'].rowHeight)
        }
        result['approvedDataFirst'] = el
        if (el.approverOrgID === organizationID) {
          el.approverOrgName = ''
        }
      })
    }

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.showTotals = settingsOrg.showTotals
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.twoApprover = settingsOrg.twoApprover

    const orgBoss = await HR.reportUtils.getOrgBossInfo(organizationID, onDate)
    result.orgBossPos = orgBoss && orgBoss['positionID.name'] ? orgBoss['positionID.name'] : UB.i18n('___________________________<посада пiдписанта>')
    result.orgBossFirstName = orgBoss && orgBoss['employeeID.firstName'] ? orgBoss['employeeID.firstName'] : UB.i18n('___________________<Iм\'я ПРIЗВИЩЕ пiдписанта>')
    result.orgBossLastName = orgBoss && orgBoss['employeeID.lastName'] ? orgBoss['employeeID.lastName'].toUpperCase() : ''

    const tree = HR.reportUtils.generateDataForStructReport('orgPlan', organizationID, departmentID || organizationID, orgStruct, posData, accrualData, groupJobsPrint, result.roundTo, result.roundToQuantity, result.showTotals ? 2 : 1, false)
    result.data = tree && tree.data ? tree.data : []
    result.totalQuantityStr = HR.reportUtils.quantityToString(tree.quantity, tree.roundToQuantity)
    result.totalFunsSumStr = HR.reportUtils.quantityToString(tree.fundSum, result.roundTo)
    // result.totalFunsSumToWord = tree.fundSum > 0 ? `${AC.currencyService.currencyToWordsUkr(tree.fundSum, true)}` : '_________________'
    if (tree.fundSum > 0) {
      let currencyStr = AC.currencyService.currencyToWordsUkr(tree.fundSum, false)
      if (result.roundTo === 'numberGroup') {
        currencyStr = currencyStr.split(' ')
        currencyStr = currencyStr.filter((val, key) => key < (currencyStr.length - 2)).join(' ')
      } else {
        currencyStr = currencyStr.replace(UB.i18n(' копійка'), UB.i18n('&nbsp;копійка'))
        currencyStr = currencyStr.replace(UB.i18n(' копійки'), UB.i18n('&nbsp;копійки'))
        currencyStr = currencyStr.replace(UB.i18n(' копійок'), UB.i18n('&nbsp;копійок'))
      }
      currencyStr = currencyStr.replace(UB.i18n(' гривня'), UB.i18n('&nbsp;гривня'))
      currencyStr = currencyStr.replace(UB.i18n(' гривні'), UB.i18n('&nbsp;гривні'))
      currencyStr = currencyStr.replace(UB.i18n(' гривень'), UB.i18n('&nbsp;гривень'))
      result.totalFunsSumToWord = ` (${currencyStr.toLowerCase()})`
    }

    return result
  },
  onParamPanelConfig: function () {
    const report = this
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        afterrender: function () {
          HR.orderManager.disableContextMenuItems(this.down('[name=organizationID]'), ['editItem', 'showLookup', 'addItem', 'clearValue'])
        }
      },
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getOrgCombo({
              readOnly: true,
              labelWidth: 140
            }),
            {
              xtype: 'ubcombobox',
              name: 'staffTableID',
              fieldLabel: UB.i18n('Штатний розпис'),
              labelWidth: 140,
              gridFieldList: ['description', 'orderState', 'entryDate'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_staffTable',
                fieldList: ['ID', 'description'],
                whereList: {
                  orgID: {
                    expression: '[orgID]',
                    condition: '=',
                    values: {
                      value: appAC.globalOrganization()
                    }
                  }
                },
                orderList: { orderBy: { expression: 'orderDate' } }
              },
              listeners: {
                render: function (ctrl) {
                  if (report.incomeParams && report.incomeParams.staffTableID) {
                    ctrl.store.on('load', () => {
                      if (!ctrl.store.isLoaded) {
                        ctrl.store.isLoaded = true
                        ctrl.setValueById(report.incomeParams.staffTableID)
                      }
                    })
                    ctrl.store.load()
                  }
                }
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const onDate = this.incomeParams && this.incomeParams.onDate
        return {
          staffTableID: frm.findField('staffTableID').getValue() || 0,
          onDate: onDate
        }
      }
    })
    return paramForm
  }
}
