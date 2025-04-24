/* global UB AC HR appAC Ext */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    // hr_empOrderVacationapschedAdd
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const result = {
      orgUnits: []
    }

    // если вызывается с приказа
    const orderID = reportParams.instanceID || 0
    // если вызывается как отчет
    let organizationID = reportParams.organizationID || 0
    const departmentID = reportParams.departmentID || 0
    const subDepartment = reportParams.subDepartment || false
    if (reportParams.category === '1') {
      result.category = UB.i18n('Керівники')
    } else if (reportParams.category === '2') {
      result.category = UB.i18n('Інші')
    }

    let onDate
    result.year = reportParams.year || 0

    if (orderID) {
      const order = await HR.reportUtils.getEmpOrder(orderID)
      if (!order) {
        return result
      }
      organizationID = order.organizationID
      result.order = {
        orderDate: AC.dateService.getStringFormatDate(order.orderDate, '', ''),
        orderNumber: `${order.orderNumber || ''}${order['dictEmpOrderIndexID.code'] ? '/' + order['dictEmpOrderIndexID.code'] : ''}`,
        orgName: order['organizationID.name']
      }
      result.organizationName = order.orderOrganizationName
      result.year = '????'
      onDate = order.orderDate || appAC.globalApplicationDate()
    } else {
      onDate = appAC.globalApplicationDate()
      const orgName = await UB.Repository('hr_organization')
        .attrs(['fullName'])
        .where('mi_data_id', '=', organizationID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectScalar()
      result.organizationName = orgName.toUpperCase() || ''
    }
    let deptName
    let deptIDs
    if (departmentID) {
      const dept = await UB.Repository('hr_department')
        .attrs(['fullName', 'mi_treePath'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate })
        .selectSingle()
      deptName = dept.fullName
      if (subDepartment) {
        const departments = await UB.Repository('hr_department')
          .attrs(['mi_data_id'])
          .where('orgID', '=', organizationID)
          .where('state', '=', 'ACTIVE')
          .where('mi_dateFrom', '<=', onDate)
          .where('mi_dateTo', '>=', onDate)
          .where('mi_treePath', 'startsWith', dept.mi_treePath)
          .misc({ __mip_recordhistory_all: true })
          .groupBy('mi_data_id')
          .selectAsObject()
        if (departments.length) {
          deptIDs = departments.map(o => o.mi_data_id)
        } else {
          deptIDs = [departmentID]
        }
      } else {
        deptIDs = [departmentID]
      }
    }
    result.departmentName = deptName || ''

    const onDateSql = AC.dateService.shiftDate(onDate)
    const orgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'fullName', 'mi_unityEntity'])
      .where('state', '=', 'ACTIVE')
      .where('mi_dateFrom', '<=', onDateSql)
      .where('mi_dateTo', '>=', onDateSql)
      .where('orgID', '=', organizationID)
      .orderBy('idxNum')
      .selectAsObject()

    let storeData
    if (orderID) {
      storeData = await UB.Repository('hr_empOrderVacSchedListDet')
        .attrs(['vacationScheduleID.employeePositionID', 'vacationScheduleID.employeePositionID.posMiTreePath',
          'vacationScheduleID.employeePositionID.depMiTreePath', 'vacationScheduleID.employeePositionID.posName',
          'vacationScheduleID.employeePositionID.posParentUnitID', 'vacationScheduleID.employeePositionID.posIdxNum',
          'vacationScheduleID.employeeNumberID.employeeID.fullFIO', 'vacationScheduleID.dateFrom', 'vacationScheduleID.dateTo',
          'vacationScheduleID.year', 'orderDetID.positionCategory', 'vacationScheduleID.employeePositionID.posCatCode'])
        .where('orderDetID.mi_deleteDate', '>=', '#maxdate')
        .where('orderDetID.orderID', '=', orderID)
        .whereIf(deptIDs && deptIDs.length, 'vacationScheduleID.employeePositionID.departmentID', 'in', deptIDs)
        .selectAsObject({
          'vacationScheduleID.employeePositionID': 'employeePositionID',
          'vacationScheduleID.employeePositionID.posMiTreePath': 'employeePositionID.posMiTreePath',
          'vacationScheduleID.employeePositionID.depMiTreePath': 'employeePositionID.depMiTreePath',
          'vacationScheduleID.employeePositionID.posName': 'employeePositionID.posName',
          'vacationScheduleID.employeePositionID.posParentUnitID': 'employeePositionID.posParentUnitID',
          'vacationScheduleID.employeePositionID.posIdxNum': 'employeePositionID.posIdxNum',
          'vacationScheduleID.employeeNumberID.employeeID.fullFIO': 'employeeNumberID.employeeID.fullFIO',
          'vacationScheduleID.dateFrom': 'dateFrom',
          'vacationScheduleID.dateTo': 'dateTo',
          'vacationScheduleID.year': 'year',
          'vacationScheduleID.employeePositionID.posCatCode': 'posCatCode'
        })
    } else {
      storeData = await UB.Repository('hr_vacationSchedule')
        .attrs(['employeePositionID', 'employeePositionID.posMiTreePath',
          'employeePositionID.depMiTreePath', 'employeePositionID.posName',
          'employeePositionID.posParentUnitID', 'employeePositionID.posIdxNum',
          'employeeNumberID.employeeID.fullFIO', 'dateFrom', 'dateTo', 'employeePositionID.posCatCode'])
        .where('organizationID', '=', organizationID)
        .where('year', '=', result.year)
        .whereIf(deptIDs && deptIDs.length, 'employeePositionID.departmentID', 'in', deptIDs)
        .selectAsObject({
          'employeePositionID.posCatCode': 'posCatCode'
        })
    }

    if (reportParams.category) {
      storeData = storeData.filter(item => (reportParams.category === '1' ? (item.posCatCode || '0') === '1' : (item.posCatCode || '0') !== '1'))
    }

    const orgIds = []
    storeData.forEach(item => {
      if (orderID) {
        result.year = item.year
        if (item['orderDetID.positionCategory'] && item['orderDetID.positionCategory'] === '1') result.category = UB.i18n('Керівники')
        if (item['orderDetID.positionCategory'] && item['orderDetID.positionCategory'] !== '1') result.category = UB.i18n('Інші')
      }
      const miTreePath = item['employeePositionID.posMiTreePath'] || item['employeePositionID.depMiTreePath']
      if (miTreePath) {
        const itemIds = miTreePath.split('/')
        for (let i = 1; i < itemIds.length - 2; i++) {
          orgIds.push(itemIds[i])
        }
      }
    })

    let indexNum = 0
    let rootstoreData
    let orgStruct1
    if (departmentID) {
      orgStruct1 = orgStruct.filter(orgItem => orgItem.mi_data_id === departmentID)
    } else if (organizationID) {
      rootstoreData = storeData.filter(item => item['employeePositionID.posParentUnitID'] === organizationID)
      orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === organizationID)
    }
    if (rootstoreData && rootstoreData.length) {
      const rootstoreDataObjs = getItems(rootstoreData, indexNum)
      result.pos = rootstoreDataObjs.data
      indexNum = rootstoreDataObjs.indexNum
    }

    for (let i = 0; i < orgStruct1.length; i++) {
      const orgUnit1 = orgStruct1[i]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      const posItems1 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit1.mi_data_id)
      if ((orgUnits1.length && orgIds.includes(orgUnit1.mi_data_id.toString())) || posItems1.length) {
        /* дані по 1-му підрозділу заносяться в "header", щоб при !departmentID цей запис не виводився */
        const orgUnitHeader = departmentID ? [] : [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase() }]
        const orgUnitItem1 = { header: orgUnitHeader, units: [], pos: undefined }

        const posItemObjs1 = getItems(posItems1, indexNum)
        orgUnitItem1.pos = posItemObjs1.data

        indexNum = posItemObjs1.indexNum
        for (let j = 0; j < orgUnits1.length; j++) {
          const orgUnit2 = orgUnits1[j]
          const orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          const posItems2 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit2.mi_data_id)
          if ((orgUnits2.length && orgIds.includes(orgUnit2.mi_data_id.toString())) || posItems2.length) {
            const orgUnitItem2 = { orgUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, units: [], pos: undefined }

            const posItemObjs2 = getItems(posItems2, indexNum)
            orgUnitItem2.pos = posItemObjs2.data

            indexNum = posItemObjs2.indexNum
            for (let j2 = 0; j2 < orgUnits2.length; j2++) {
              const orgUnit3 = orgUnits2[j2]
              const orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              const posItems3 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit3.mi_data_id)
              if ((orgUnits3.length && orgIds.includes(orgUnit3.mi_data_id.toString())) || posItems3.length) {
                const orgUnitItem3 = { orgUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, units: [], pos: undefined }

                const posItemObjs3 = getItems(posItems3, indexNum)
                orgUnitItem3.pos = posItemObjs3.data

                indexNum = posItemObjs3.indexNum
                for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                  const orgUnit4 = orgUnits3[j3]
                  const orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  const posItems4 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit4.mi_data_id)
                  if ((orgUnits4.length && orgIds.includes(orgUnit4.mi_data_id.toString())) || posItems4.length) {
                    const orgUnitItem4 = { orgUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, units: [], pos: undefined }

                    const posItemObjs4 = getItems(posItems4, indexNum)
                    orgUnitItem4.pos = posItemObjs4.data

                    indexNum = posItemObjs4.indexNum
                    for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                      const orgUnit5 = orgUnits4[j4]
                      const orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      const posItems5 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit5.mi_data_id)
                      if ((orgUnits5.length && orgIds.includes(orgUnit5.mi_data_id.toString())) || posItems5.length) {
                        const orgUnitItem5 = { orgUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, units: [], pos: undefined }

                        const posItemObjs5 = getItems(posItems5, indexNum)
                        orgUnitItem5.pos = posItemObjs5.data

                        indexNum = posItemObjs5.indexNum
                        for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                          const orgUnit6 = orgUnits5[j5]
                          const posItems6 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit6.mi_data_id)
                          if (posItems6.length) {
                            const orgUnitItem6 = { orgUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, units: [], pos: undefined }

                            const posItemObjs6 = getItems(posItems6, indexNum)
                            orgUnitItem6.pos = posItemObjs6.data
                            indexNum = posItemObjs6.indexNum
                            orgUnitItem5.units.push(orgUnitItem6)
                          }
                        }
                        orgUnitItem4.units.push(orgUnitItem5)
                      }
                    }
                    orgUnitItem3.units.push(orgUnitItem4)
                  }
                }
                orgUnitItem2.units.push(orgUnitItem3)
              }
            }
            orgUnitItem1.units.push(orgUnitItem2)
          }
        }
        result.orgUnits.push(orgUnitItem1)
      }
    }

    return result
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'left' },
          items: [
            {
              xtype: 'numberfield',
              name: 'year',
              labelWidth: 150,
              width: 270,
              fieldLabel: UB.i18n('Рік'),
              allowBlank: false,
              vtype: 'numberValidator',
              maxValue: 2099,
              minValue: 2000,
              value: new Date().getFullYear()
            },
            HR.controlService.getOrgCombo({
              labelWidth: 150,
              width: 550,
              readOnly: true,
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const departmentID = form.down('[name=departmentID]')
                  const orgID = ctrl.getValue()
                  const whereList = [
                    ['orgID', '=', orgID || 0],
                    ['state', '=', 'ACTIVE']
                  ]
                  AC.viewUtils.setWhereListProperty(departmentID, whereList, null, ['clearStore', 'clearWhereList', 'clearValue'])
                  departmentID.setDisabled(!orgID)
                }
              }
            }),
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 150,
                  width: 550,
                  displayField: 'description',
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=subDepartment]').setDisabled(!value)
                      if (!value) {
                        form.down('[name=subDepartment]').setValue(false)
                      }
                    }
                  }
                }),
                {
                  xtype: 'checkboxfield',
                  labelWidth: 200,
                  name: 'subDepartment',
                  fieldLabel: UB.i18n('з підлеглими підрозділами'),
                  checked: false,
                  disabled: true
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'checkboxfield',
                  name: 'catChiefs',
                  fieldLabel: UB.i18n(`Категорія 'Керівники'`),
                  labelWidth: 160,
                  checked: true
                },
                {
                  xtype: 'checkboxfield',
                  name: 'catOthers',
                  fieldLabel: UB.i18n(`'Інші'`),
                  labelWidth: 70,
                  checked: true
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const catChiefs = frm.findField('catChiefs').getValue()
        const catOthers = frm.findField('catOthers').getValue()
        return {
          year: frm.findField('year').getValue() || 0,
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          subDepartment: frm.findField('subDepartment').getValue() || false,
          category: catChiefs && !catOthers ? '1' : (!catChiefs && catOthers ? '2' : undefined)
        }
      }
    })
    return paramForm
  }
}

function getItems (dataItems, indexNum) {
  const result = {
    data: [],
    indexNum: indexNum
  }
  if (dataItems.length) {
    for (let i = 0; i < dataItems.length; i++) {
      const dataItem = dataItems[i]
      const mons = { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: '', 9: '', 10: '', 11: '' }
      const df = (dataItem.dateFrom).getMonth()
      const dt = (dataItem.dateTo).getMonth()
      let d1
      let d2
      if (df <= dt) {
        for (let k = df; k <= dt; k++) {
          d1 = k === df ? dataItem.dateFrom : AC.dateService.firstDayOfMonth(AC.dateService.addMonths(dataItem.dateFrom, k - df))
          d2 = k === dt ? dataItem.dateTo : AC.dateService.lastDayOfMonth(AC.dateService.addMonths(dataItem.dateFrom, k - df))
          d1 = AC.dateService.formatDate(d1, 'dd')
          d2 = AC.dateService.formatDate(d2, 'dd')
          mons[k] = d1 === d2 ? `${d1}` : `${d1} - ${d2}`
        }
      } else {
        for (let k = df; k <= 11; k++) {
          d1 = k === df ? dataItem.dateFrom : AC.dateService.firstDayOfMonth(AC.dateService.addMonths(dataItem.dateFrom, k - df))
          d2 = k === dt ? dataItem.dateTo : AC.dateService.lastDayOfMonth(AC.dateService.addMonths(dataItem.dateFrom, k - df))
          d1 = AC.dateService.formatDate(d1, 'dd')
          d2 = AC.dateService.formatDate(d2, 'dd')
          mons[k] = d1 === d2 ? `${d1}` : `${d1} - ${d2}`
        }
        for (let k = 0; k <= dt; k++) {
          d1 = k === df ? dataItem.dateFrom : AC.dateService.firstDayOfMonth(AC.dateService.addMonths(dataItem.dateFrom, k - df))
          d2 = k === dt ? dataItem.dateTo : AC.dateService.lastDayOfMonth(AC.dateService.addMonths(dataItem.dateFrom, k - df))
          d1 = AC.dateService.formatDate(d1, 'dd')
          d2 = AC.dateService.formatDate(d2, 'dd')
          mons[k] = d1 === d2 ? `${d1}` : `${d1} - ${d2}`
        }
      }
      let resItem = result.data.find(item => item.employeePositionID === dataItem.employeePositionID)
      if (!resItem) {
        resItem = {
          employeePositionID: dataItem.employeePositionID,
          indexNum: dataItem['employeePositionID.posIdxNum'] || 99999999,
          posName: dataItem['employeePositionID.posName'],
          empName: dataItem['employeeNumberID.employeeID.fullFIO'],
          m1: mons[0],
          m2: mons[1],
          m3: mons[2],
          m4: mons[3],
          m5: mons[4],
          m6: mons[5],
          m7: mons[6],
          m8: mons[7],
          m9: mons[8],
          m10: mons[9],
          m11: mons[10],
          m12: mons[11]
        }
        result.data.push(resItem)
      } else {
        if (mons[0].length) { resItem.m1 += (resItem.m1.length ? ', ' + mons[0] : mons[0]) }
        if (mons[1].length) { resItem.m2 += (resItem.m2.length ? ', ' + mons[1] : mons[1]) }
        if (mons[2].length) { resItem.m3 += (resItem.m3.length ? ', ' + mons[2] : mons[2]) }
        if (mons[3].length) { resItem.m4 += (resItem.m4.length ? ', ' + mons[3] : mons[3]) }
        if (mons[4].length) { resItem.m5 += (resItem.m5.length ? ', ' + mons[4] : mons[4]) }
        if (mons[5].length) { resItem.m6 += (resItem.m6.length ? ', ' + mons[5] : mons[5]) }
        if (mons[6].length) { resItem.m7 += (resItem.m7.length ? ', ' + mons[6] : mons[6]) }
        if (mons[7].length) { resItem.m8 += (resItem.m8.length ? ', ' + mons[7] : mons[7]) }
        if (mons[8].length) { resItem.m9 += (resItem.m9.length ? ', ' + mons[8] : mons[8]) }
        if (mons[9].length) { resItem.m10 += (resItem.m10.length ? ', ' + mons[9] : mons[9]) }
        if (mons[10].length) { resItem.m11 += (resItem.m11.length ? ', ' + mons[10] : mons[10]) }
        if (mons[11].length) { resItem.m12 += (resItem.m12.length ? ', ' + mons[11] : mons[11]) }
      }
    }
    result.data.forEach(item => {
      item.indexNum = ++indexNum
    })
    result.indexNum = indexNum
  }
  return result
}
