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
    let staffTableID = reportParams.staffTableID || 0
    const organizationID = appAC.globalOrganization()
    let onDate = reportParams.onDate
    if (reportParams.caller && reportParams.caller.record) {
      const reco = reportParams.caller.record
      staffTableID = reportParams.instanceID
      onDate = AC.dateService.shiftDate(reco.get('orderDate'))
    }
    const result = {
      orgUnits: [],
      reconciliation: [],
      agreedData: '',
      agreedFIO: '',
      agreedDepName: '',
      agreedOrgName: ''
    }
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.boldMainDep = settingsOrg.boldMainDep
    result.autoSetDepIdxNum = settingsOrg.autoSetDepIdxNum

    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.organizationName = orgData ? (orgData.nameGen || orgData.name) : ''
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    const orgStruct = await HR.treeUtils.getOrgPlanUnits(staffTableID, [organizationID], onDate)
    if (!orgStruct) {
      return result
    }
    const deptData = await UB.Repository('hr_department')
      .attrs(['ID', 'quantity', 'dictDepTypeID.isLead', 'quantityLead', 'dictDepTypeID.nameGen', 'dictDepTypeID.name',
        'dictDepTypeID.code', 'departmentKindID.code'])
      .whereIf(organizationID, 'orgID', 'in', organizationID)
      .where('liquidate', '=', 0)
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('state', '=', 'ACTIVE', 'active')
      .where('staffOrderID', '=', staffTableID, 'order')
      .misc({ __mip_recordhistory_all: true })
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        .where('mi_deleteDate', '>=', '#maxdate'),
      'notExist')
      .logic('(([active] and [notExist] and [dateFrom] and [dateTo]) or ([order]))')
      .orderBy('idxNum')
      .selectAsObject()

    let recparticipant = await UB.Repository('hr_recparticipant')
      .attrs(['ID', 'recStageID.orderIndex', 'employeePosition', 'employeePosition.organizationID'])
      .where('docID', '=', staffTableID)
      .where('recStageID.entityName', '=', 'hr_recstage')
      .selectAsObject()
    let tasks = await UB.Repository('hr_task')
      .attrs('executionDate', 'participantID')
      .where('docID', '=', staffTableID)
      .where('mi_wfState', '=', 'CLOSED')
      .where('participantID.recStageID.entityName', '=', 'hr_recstage')
      .orderBy('ID', 'desc')
      .selectAsObject()
    tasks = tasks ? _.groupBy(tasks, 'participantID') : []

    recparticipant = recparticipant ? _.groupBy(recparticipant, 'recStageID.orderIndex') : []
    if (recparticipant[1]) {
      const items = _.sortBy(recparticipant[1], 'ID')
      if (items) {
        const cnt = items.length > 2 ? 2 : items.length
        for (let i = 0; i < cnt; i++) {
          const info = await HR.reportUtils.getEmpPosInfo(items[i].employeePosition, onDate)
          result.reconciliation.push({
            name: info.name,
            nameDep: info.fullNameDep
          })
        }
      }
    }
    if (recparticipant[2]) {
      const item = _.sortBy(recparticipant[2], 'ID')[0]
      const info = await HR.reportUtils.getEmpPosInfo(item.employeePosition, onDate)
      result.agreedData = tasks[item.ID] && tasks[item.ID][0].executionDate ? AC.dateService.formatDate(tasks[item.ID][0].executionDate) : ''
      result.agreedFIO = info.name
      result.agreedDepName = info.nameDep
      if (item['employeePosition.organizationID']) {
        const orgName = await UB.Repository('hr_organization')
          .attrs(['name'])
          .where('mi_data_id', '=', item['employeePosition.organizationID'])
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: onDate })
          .selectScalar()
        result.agreedOrgName = orgName || ''
      }
    }

    //, 'printLead'
    const staffTableData = await UB.Repository('hr_staffTable')
      .attrs(['entryOrderID.orderNumber', 'entryOrderID.orderDate'])
      .joinCondition('orgID.mi_dateFrom', '<=', onDate)
      .joinCondition('orgID.mi_dateTo', '>=', onDate)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .selectById(staffTableID)
    if (staffTableData) {
      result.orderDate = staffTableData['entryOrderID.orderDate'] ? AC.dateService.formatDate(staffTableData['entryOrderID.orderDate']) : '____________'
      result.orderNumber = staffTableData['entryOrderID.orderDate'] || '______'
    }

    const printLead = await UB.Repository('hr_staffTableOrgStructure')
      .attrs(['printLead'])
      .where('ID', '=', staffTableID)
      .selectScalar() || false

    const tree = me.generateDataForReport(organizationID, orgStruct, deptData, result.roundToQuantity, printLead, result.boldMainDep, result.autoSetDepIdxNum)
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
              xtype: 'ubcombobox',
              name: 'staffTableID',
              fieldLabel: UB.i18n('Планування структури'),
              labelWidth: 160,
              gridFieldList: ['description', 'orderState', 'entryDate'],
              displayField: 'description',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_staffTableOrgStructure',
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
                orderList: { orderBy: { expression: 'description' } }
              },
              listeners: {
                render: function (ctrl) {
                  const paramForm = ctrl.up('form')
                  const tabForm = paramForm.ownerCt
                  tabForm.globalOrganizationChange = () => {
                    AC.viewUtils.setWhereListProperty(ctrl, [
                      ['orgID', '=', appAC.globalOrganization()]
                    ], null, ['clearStore', 'clearWhereList', 'clearValue'])
                  }
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
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 160,
                  width: 280,
                  fieldLabel: UB.i18n('Станом на'),
                  value: AC.dateService.todayDate()
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const onDate = report.incomeParams && report.incomeParams.onDate
        return {
          staffTableID: frm.findField('staffTableID').getValue() || 0,
          onDate: onDate
        }
      }
    })
    return paramForm
  },

  generateDataForReport: function (itemID, orgStruct, deptData, roundToQuantity, printLead, boldMainDep, autoSetDepIdxNum) {
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
            indexNum: autoSetDepIdxNum ? orgItem.code || '' : `${indexNpp}${npp++}.`,
            name: `${str}${comp2 ? '<i><b>' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${comp2 ? '</b></i>' : ''}`,
            style: level === 1 ? 'font-weight: bold; color: blue;' : (comp2 ? 'color: #274059;' : ''),
            quantity: qnt,
            quantityStr: `${comp2 ? '<i><b>' : ''}${HR.reportUtils.quantityToString(qnt, rtq)}${comp2 ? '</b></i>' : ''}`
          }
          result.data.push(obj)
          result.quantity += obj.quantity
          result.quantityHighLevel += orgItem.parentUnitID === itemID ? obj.quantity : 0
          if (printLead && deptItem && deptItem['dictDepTypeID.isLead'] && (deptItem['quantityLead'] || deptItem['quantityLead'] === 0)) {
            qnt = !roundToQuantity ? deptItem.quantityLead || 0 : AC.currencyService.round(deptItem.quantityLead || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
            rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(qnt)
            const depLead = deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || ''
            result.data.push({
              indexNum: '',
              name: UB.i18n(`{0}<em>Керівництво{1}</em>`, str, depLead ? ' ' + depLead : ''),
              style: '',
              quantity: qnt,
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
            indexNum: autoSetDepIdxNum ? orgItem.code || '' : `${indexNpp}${npp++}.`,
            name: HR.nameCase.cap(orgItem.name || ''),
            style: '',
            quantity: qnt,
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
    // const qnt = !roundToQuantity ? orgTree.quantity || 0 : AC.currencyService.round(orgTree.quantity || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
    const qnt = !roundToQuantity ? orgTree.quantityHighLevel || 0 : AC.currencyService.round(orgTree.quantityHighLevel || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
    const rtq = roundToQuantity || HR.reportUtils.getQuantityFractional(qnt)
    orgTree.data.push({
      name: UB.i18n('ВСЬОГО'),
      style: 'font-weight: bold;',
      quantity: qnt,
      quantityStr: `${HR.reportUtils.quantityToString(qnt, rtq)}`
    })

    return orgTree || []
  }
}
