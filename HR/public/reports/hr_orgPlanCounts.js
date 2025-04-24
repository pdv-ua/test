/* global Ext _ UB AC appAC HR */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const organizationID = appAC.globalOrganization()
    const result = {
      showQuantity: (reportParams.showQuantity !== undefined) ? reportParams.showQuantity : true,
      orgUnits: []
    }
    result.colCount = 3 - (result.showQuantity ? 0 : 1)
    result.sheetWidth = 640 - (result.showQuantity ? 0 : 90)
    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .selectSingle()
    result.organizationName = orgData ? (orgData.nameGen || orgData.name) : ''
    result.onDate = AC.dateService.getStringFormatDate(reportParams.onDate, '', '', UB.i18n(' р.'))

    const orgStruct = await HR.treeUtils.getOrgPlanUnits(reportParams.staffTableID, [organizationID], reportParams.onDate)
    if (!orgStruct) {
      return result
    }

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.boldMainDep = settingsOrg.boldMainDep
    result.autoSetDepIdxNum = settingsOrg.autoSetDepIdxNum

    const deptData = await UB.Repository('hr_department')
      .attrs(['ID', 'quantity', 'idxNum', 'dictDepTypeID.isLead', 'quantityLead', 'dictDepTypeID.nameGen', 'dictDepTypeID.name',
        'dictDepTypeID.code', 'departmentKindID.code'])
      .whereIf(organizationID, 'orgID', 'in', organizationID)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', reportParams.onDate, 'dateFrom')
      .where('mi_dateTo', '>=', reportParams.onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('staffOrderID', '=', reportParams.staffTableID, 'order')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', reportParams.staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .misc({ __mip_recordhistory_all: true })
      .selectAsObject()

    const printLead = await UB.Repository('hr_staffTableOrgStructure')
      .attrs(['printLead'])
      .where('ID', '=', reportParams.staffTableID)
      .selectScalar() || false

    const tree = me.generateDataForReport(organizationID, orgStruct, deptData, result.roundToQuantity, printLead, result.boldMainDep, result.autoSetDepIdxNum, result.showQuantity)
    result.data = tree && tree.data ? tree.data : []

    return result
  },
  onParamPanelConfig: function () {
    const report = this
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'checkboxfield',
              name: 'showQuantity',
              fieldLabel: UB.i18n('Виводити кількість посад'),
              labelWidth: 210,
              value: true
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const params = _.merge(report.incomeParams, {
          showQuantity: frm.findField('showQuantity').getValue() || false
        })
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    return paramForm
  },
  generateDataForReport: function (itemID, orgStruct, deptData, roundToQuantity, printLead, boldMainDep, autoSetDepIdxNum, showQuantity) {
    if (!orgStruct || !orgStruct.length) return {}

    function getData (indexNpp, parentID, level = 1) {
      const result = {
        data: [],
        quantity: 0,
        quantityHighLevel: 0
      }
      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
      let npp = 1
      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_position') {
          const deptItem = _.find(deptData, { ID: orgItem.ID })

          let qnt = !roundToQuantity ? deptItem.quantity || 0 : AC.currencyService.round(deptItem.quantity || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
          let rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(qnt)
          const comp2 = level > 1 && boldMainDep && deptItem['dictDepTypeID.code'] === '2' && deptItem['departmentKindID.code'] === '2'
          const obj = {
            showQuantity: showQuantity,
            indexNum: autoSetDepIdxNum ? orgItem.code || '' : `${indexNpp}${npp++}.`,
            name: `${str}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}`,
            style: level === 1 ? 'font-weight: bold; color: blue;' : (comp2 ? 'color: #274059;' : ''),
            style2: comp2 ? 'font-weight: bold; font-style: italic;' : '',
            quantity: qnt,
            roundToQuantity: rtq,
            quantityStr: `${comp2 ? '<i><b>' : ''}${HR.reportUtils.quantityToString(qnt, rtq)}${comp2 ? '</b></i>' : ''}`
          }
          result.data.push(obj)
          result.quantity += obj.quantity
          result.quantityHighLevel += orgItem.parentUnitID === itemID ? obj.quantity : 0
          if (printLead && deptItem && deptItem['dictDepTypeID.isLead'] && (deptItem['quantityLead'] || deptItem['quantityLead'] === 0)) {
            qnt = !roundToQuantity ? deptItem.quantityLead || 0 : AC.currencyService.round(deptItem.quantityLead || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
            const depLead = deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || ''
            rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(qnt)
            result.data.push({
              indexNum: '',
              name: UB.i18n(`{0}<em>Керівництво{1}</em>`, str, depLead ? ' ' + depLead : ''),
              style: '',
              style2: '',
              quantity: qnt,
              roundToQuantity: rtq,
              quantityStr: `<em>${HR.reportUtils.quantityToString(qnt, rtq)}</em>`
            })
          }

          const subTree = getData(obj.indexNum, orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            result.data.push(...subTree.data)

            obj.quantity += subTree.quantity
            obj.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(obj.quantity)
            result.quantity += subTree.quantity
            result.quantityHighLevel += subTree.quantityHighLevel
          }
        } else if (orgItem.parentUnitID === itemID) {
          const qnt = !roundToQuantity ? orgItem.quantity || 0 : AC.currencyService.round(orgItem.quantity || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
          const rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(qnt)
          const obj = {
            showQuantity: showQuantity,
            indexNum: autoSetDepIdxNum ? orgItem.code || '' : `${indexNpp}${npp++}.`,
            name: HR.nameCase.cap(orgItem.name || ''),
            style: '',
            style2: '',
            quantity: qnt,
            roundToQuantity: rtq,
            quantityStr: `${HR.reportUtils.quantityToString(qnt, rtq)}`
          }
          result.data.push(obj)
          result.quantity += obj.quantity
          result.quantityHighLevel += orgItem.parentUnitID === itemID ? obj.quantity : 0
        }
      })

      return result
    }

    const orgTree = getData('', itemID)
    const qnt = !roundToQuantity ? orgTree.quantityHighLevel || 0 : AC.currencyService.round(orgTree.quantityHighLevel || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
    const rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(qnt)
    if (showQuantity) {
      orgTree.data.push({
        showQuantity: showQuantity,
        name: UB.i18n('ВСЬОГО'),
        style: 'font-weight: bold;',
        style2: '',
        quantity: qnt,
        roundToQuantity: rtq,
        quantityStr: `${HR.reportUtils.quantityToString(qnt, rtq)}`
      })
    }

    return orgTree || []
  }

}
