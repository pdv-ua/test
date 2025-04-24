/* global Ext _ UB AC HR $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const result = {
      orgUnits: []
    }

    // hr_vacanciesCompetitionList

    const orgName = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', reportParams.organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: reportParams.onDate })
      .selectScalar()
    result.organizationName = orgName || ''
    let deptName
    if (reportParams.departmentID) {
      deptName = await UB.Repository('hr_department')
        .attrs(['fullName'])
        .where('mi_data_id', '=', reportParams.departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: reportParams.onDate })
        .selectScalar()
    }
    result.departmentName = deptName || ''
    result.onDate = AC.dateService.getStringFormatDate(reportParams.onDate, '', '', UB.i18n(' р.'))

    const posVacObj = await $App.connection.run({
      entity: 'hr_positionVac',
      method: 'selectVacanciesWithVacFrom',
      orgs: reportParams.organizationID,
      onDate: reportParams.onDate
    })
    let posVacData = JSON.parse(posVacObj.resultData)
    posVacData = posVacData ? _.groupBy(posVacData, 'mi_data_id') : []

    const orgStruct = await UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'fullName', 'mi_unityEntity', 'accrualSum'])
      .where('state', '=', 'ACTIVE')
      /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
      .where('mi_dateFrom', '<=', reportParams.onDate)
      .where('mi_dateTo', '>=', reportParams.onDate)
      .whereIf(reportParams.organizationID, 'orgID', '=', reportParams.organizationID)
      .whereIf(!reportParams.organizationID, 'parentUnitID', 'isNotNull')
      .orderBy('idxNum')
      .selectAsObject()
    if (!orgStruct) {
      return result
    }

    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'fullName', 'quantity', 'vacancyRate', 'dateToEmpty', 'accrualSum'])
      .misc({ __mip_ondate: reportParams.onDate })
      .where('state', '=', 'ACTIVE')
      .whereIf(reportParams.organizationID, 'orgID', '=', reportParams.organizationID)
      .selectAsObject()

    let existNumber = await UB.Repository('hr_employeePositionS')
      .attrs(['departmentID', 'organizationID', 'positionID', 'employeeID.shortFIO', 'dateToEmpty'])
      .where('dateFrom', '<=', reportParams.onDate)
      .where('dateTo', '>=', reportParams.onDate)
      .whereIf(reportParams.organizationID, 'organizationID', '=', reportParams.organizationID)
      .whereIf(reportParams.departmentID, 'departmentID', '=', reportParams.departmentID)
      .orderBy('employeeID.shortFIO')
      .selectAsObject()

    const ordersInfo = await UB.Repository('hr_empOrderCompetitionadPosDet')
      .attrs(['ID', 'orderID.orderDate', 'orderID.description', 'positionID'])
      .where('orderID', 'isNotNull')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(reportParams.organizationID, 'organizationID', '=', reportParams.organizationID)
      .whereIf(reportParams.departmentID, 'departmentID', '=', reportParams.departmentID)
      .orderBy('orderID.orderDate')
      .selectAsObject({
        'orderID.orderDate': 'orderDate',
        'orderID.description': 'description'
      })

    const posContestInfo = await UB.Repository('hr_listPosContest')
      .attrs(['ID', 'orderID.orderDate', 'positionID', 'state.name'])
      .where('orderID', 'isNotNull')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(reportParams.organizationID, 'organizationID', '=', reportParams.organizationID)
      .orderBy('orderID.orderDate')
      .selectAsObject({
        'orderID.orderDate': 'orderDate',
        'state.name': 'state'
      })

    const empInfo = await UB.Repository('hr_listPosContestDet')
      .attrs(['ID', 'employeeID.shortFIO', 'listPosContestID.orderID.orderDate', 'listPosContestID.positionID'])
      .where('listPosContestID.orderID', 'isNotNull')
      .where('listPosContestID.orderID.mi_deleteDate', '>=', '#maxdate')
      .where('listPosContestID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(reportParams.organizationID, 'listPosContestID.organizationID', '=', reportParams.organizationID)
      .orderBy('employeeID.shortFIO')
      .selectAsObject({
        'employeeID.shortFIO': 'shortFIO',
        'listPosContestID.orderID.orderDate': 'orderDate',
        'listPosContestID.positionID': 'positionID'
      })

    let indexNum = 0
    let rootPos
    let orgStruct1
    if (reportParams.departmentID) {
      orgStruct1 = orgStruct.filter(orgItem => orgItem.mi_data_id === reportParams.departmentID)
    } else if (reportParams.organizationID) {
      rootPos = posData.filter(pos => pos.parentUnitID === reportParams.organizationID)
      orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === reportParams.organizationID)
    } else {
      orgStruct1 = await HR.treeUtils.getRootUnits(reportParams.onDate, ['parentUnitID', 'code', 'fullName', 'mi_unityEntity', 'accrualSum'])
    }
    if (rootPos && rootPos.length) {
      const emp = existNumber ? existNumber.filter(pos => pos.organizationID === reportParams.organizationID && !pos.departmentID) : []
      const rootPosObjs = getPosItems(rootPos, indexNum, emp, posVacData, ordersInfo, posContestInfo, empInfo)
      result.pos = rootPosObjs.data
      indexNum = rootPosObjs.indexNum
    }

    existNumber = existNumber ? _.groupBy(existNumber, 'departmentID') : []
    for (let i = 0; i < orgStruct1.length; i++) {
      const orgUnit1 = orgStruct1[i]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      const posItems1 = posData.filter(pos => pos.parentUnitID === orgUnit1.mi_data_id)
      if (orgUnits1.length || posItems1.length) {
        /* дані по 1-му підрозділу заносяться в "header", щоб при !departmentID цей запис не виводився */
        const orgUnitHeader = reportParams.departmentID ? [] : [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase() }]
        const orgUnitItem1 = { header: orgUnitHeader, units: [], pos: undefined }
        // let orgUnitQuantity1 = 0
        let orgUnitVacancyRate1 = 0
        const posItemObjs1 = getPosItems(posItems1, indexNum, existNumber[orgUnit1.mi_data_id], posVacData, ordersInfo, posContestInfo, empInfo)
        orgUnitItem1.pos = posItemObjs1.data
        // orgUnitQuantity1 += posItemObjs1.countQuantity
        orgUnitVacancyRate1 += posItemObjs1.countVacancy

        indexNum = posItemObjs1.indexNum
        for (let j = 0; j < orgUnits1.length; j++) {
          const orgUnit2 = orgUnits1[j]
          const orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          const posItems2 = posData.filter(pos => pos.parentUnitID === orgUnit2.mi_data_id)
          if (orgUnits2.length || posItems2.length) {
            const orgUnitItem2 = { orgUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, units: [], pos: undefined }
            // let orgUnitQuantity2 = 0
            let orgUnitVacancyRate2 = 0
            const posItemObjs2 = getPosItems(posItems2, indexNum, existNumber[orgUnit2.mi_data_id], posVacData, ordersInfo, posContestInfo, empInfo)
            orgUnitItem2.pos = posItemObjs2.data
            // orgUnitQuantity2 += posItemObjs2.countQuantity
            orgUnitVacancyRate2 += posItemObjs2.countVacancy

            indexNum = posItemObjs2.indexNum
            for (let j2 = 0; j2 < orgUnits2.length; j2++) {
              const orgUnit3 = orgUnits2[j2]
              const orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              const posItems3 = posData.filter(pos => pos.parentUnitID === orgUnit3.mi_data_id)
              if (orgUnits3.length || posItems3.length) {
                const orgUnitItem3 = { orgUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, units: [], pos: undefined }
                // let orgUnitQuantity3 = 0
                let orgUnitVacancyRate3 = 0
                const posItemObjs3 = getPosItems(posItems3, indexNum, existNumber[orgUnit3.mi_data_id], posVacData, ordersInfo, posContestInfo, empInfo)
                orgUnitItem3.pos = posItemObjs3.data
                // orgUnitQuantity3 += posItemObjs3.countQuantity
                orgUnitVacancyRate3 += posItemObjs3.countVacancy

                indexNum = posItemObjs3.indexNum
                for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                  const orgUnit4 = orgUnits3[j3]
                  const orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  const posItems4 = posData.filter(pos => pos.parentUnitID === orgUnit4.mi_data_id)
                  if (orgUnits4.length || posItems4.length) {
                    const orgUnitItem4 = { orgUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, units: [], pos: undefined }
                    // let orgUnitQuantity4 = 0
                    let orgUnitVacancyRate4 = 0
                    const posItemObjs4 = getPosItems(posItems4, indexNum, existNumber[orgUnit4.mi_data_id], posVacData, ordersInfo, posContestInfo, empInfo)
                    orgUnitItem4.pos = posItemObjs4.data
                    // orgUnitQuantity4 += posItemObjs4.countQuantity
                    orgUnitVacancyRate4 += posItemObjs4.countVacancy

                    indexNum = posItemObjs4.indexNum
                    for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                      const orgUnit5 = orgUnits4[j4]
                      const orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      const posItems5 = posData.filter(pos => pos.parentUnitID === orgUnit5.mi_data_id)
                      if (orgUnits5.length || posItems5.length) {
                        const orgUnitItem5 = { orgUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, units: [], pos: undefined }
                        // let orgUnitQuantity5 = 0
                        let orgUnitVacancyRate5 = 0
                        const posItemObjs5 = getPosItems(posItems5, indexNum, existNumber[orgUnit5.mi_data_id], posVacData, ordersInfo, posContestInfo, empInfo)
                        orgUnitItem5.pos = posItemObjs5.data
                        // orgUnitQuantity5 += posItemObjs5.countQuantity
                        orgUnitVacancyRate5 += posItemObjs5.countVacancy

                        indexNum = posItemObjs5.indexNum
                        for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                          const orgUnit6 = orgUnits5[j5]
                          const orgUnits6 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit6.mi_data_id)
                          const posItems6 = posData.filter(pos => pos.parentUnitID === orgUnit6.mi_data_id)
                          if (orgUnits6.length || posItems6.length) {
                            const orgUnitItem6 = { orgUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, units: [], pos: undefined }
                            // let orgUnitQuantity6 = 0
                            let orgUnitVacancyRate6 = 0
                            const posItemObjs6 = getPosItems(posItems6, indexNum, existNumber[orgUnit6.mi_data_id], posVacData, ordersInfo, posContestInfo, empInfo)
                            orgUnitItem6.pos = posItemObjs6.data
                            // orgUnitQuantity6 += posItemObjs6.countQuantity
                            orgUnitVacancyRate6 += posItemObjs6.countVacancy

                            indexNum = posItemObjs6.indexNum
                            // orgUnitItem6.orgUnitQuantity = orgUnitQuantity6
                            orgUnitItem6.orgUnitVacancyRate = orgUnitVacancyRate6
                            if (orgUnitItem6.orgUnitVacancyRate > 0) {
                              orgUnitItem5.units.push(orgUnitItem6)
                            }
                            // orgUnitQuantity5 += orgUnitItem6.orgUnitQuantity
                            orgUnitVacancyRate5 += orgUnitItem6.orgUnitVacancyRate
                          }
                        }
                        // orgUnitItem5.orgUnitQuantity = orgUnitQuantity5
                        orgUnitItem5.orgUnitVacancyRate = orgUnitVacancyRate5
                        if (orgUnitItem5.orgUnitVacancyRate > 0) {
                          orgUnitItem4.units.push(orgUnitItem5)
                        }
                        // orgUnitQuantity4 += orgUnitItem5.orgUnitQuantity
                        orgUnitVacancyRate4 += orgUnitItem5.orgUnitVacancyRate
                      }
                    }
                    // orgUnitItem4.orgUnitQuantity = orgUnitQuantity4
                    orgUnitItem4.orgUnitVacancyRate = orgUnitVacancyRate4
                    if (orgUnitItem4.orgUnitVacancyRate > 0) {
                      orgUnitItem3.units.push(orgUnitItem4)
                    }
                    // orgUnitQuantity3 += orgUnitItem4.orgUnitQuantity
                    orgUnitVacancyRate3 += orgUnitItem4.orgUnitVacancyRate
                  }
                }
                // orgUnitItem3.orgUnitQuantity = orgUnitQuantity3
                orgUnitItem3.orgUnitVacancyRate = orgUnitVacancyRate3
                if (orgUnitItem3.orgUnitVacancyRate > 0) {
                  orgUnitItem2.units.push(orgUnitItem3)
                }
                // orgUnitQuantity2 += orgUnitItem3.orgUnitQuantity
                orgUnitVacancyRate2 += orgUnitItem3.orgUnitVacancyRate
              }
            }
            // orgUnitItem2.orgUnitQuantity = orgUnitQuantity2
            orgUnitItem2.orgUnitVacancyRate = orgUnitVacancyRate2
            if (orgUnitItem2.orgUnitVacancyRate > 0) {
              orgUnitItem1.units.push(orgUnitItem2)
            }
            // orgUnitQuantity1 += orgUnitItem2.orgUnitQuantity
            orgUnitVacancyRate1 += orgUnitItem2.orgUnitVacancyRate
          }
        }
        // orgUnitItem1.orgUnitQuantity = orgUnitQuantity1
        orgUnitItem1.orgUnitVacancyRate = orgUnitVacancyRate1
        // orgUnitItem1.footer = departmentID ? [] : [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`, orgUnitQuantity: orgUnitQuantity1, orgUnitVacancyRate: orgUnitVacancyRate1 }]
        if (orgUnitVacancyRate1 > 0) {
          result.orgUnits.push(orgUnitItem1)
        }
      }
    }

    return result
  },
  onParamPanelConfig: function () {
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
            HR.controlService.getDepCombo({ displayField: 'description' }),
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 120,
                  width: 240,
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
        return {
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate())
        }
      }
    })
    return paramForm
  }
}

function getPosItems (posItems, indexNum, existNumber, posVacData, ordersInfo, posContestInfo, empInfo) {
  const result = {
    data: [],
    countVacancy: 0,
    indexNum: indexNum
  }
  if (posItems.length) {
    let empEmpty = existNumber ? existNumber.filter(el => el.dateToEmpty) : []
    empEmpty = empEmpty ? _.groupBy(empEmpty, 'positionID') : []
    for (let i = 0; i < posItems.length; i++) {
      const posItem = posItems[i]
      if (posItem.vacancyRate > 0) {
        const vacFrom = posVacData[posItem.mi_data_id] ? new Date(posVacData[posItem.mi_data_id][0].vacFrom) : null
        const item = {
          indexNum: posItem.idxNum || 99999999,
          posName: posItem['fullName'] || '',
          basepay: posItem.accrualSum || 0,
          vacancyRate: posItem.vacancyRate,
          empList: posItem.dateToEmpty && empEmpty[posItem.mi_data_id] ? empEmpty[posItem.mi_data_id].map(el => UB.i18n('т/в ') + el['employeeID.shortFIO'] + UB.i18n(' до ') + AC.dateService.formatDate(el.dateToEmpty, 'dd.mm.yyyy')).join('\n') : '',
          dateFrom: vacFrom ? AC.dateService.formatDate(vacFrom, 'dd.mm.yyyy') : '',
          orders: ordersInfo.filter(el => el.positionID === posItem.mi_data_id && ((vacFrom && el.orderDate >= vacFrom) || !vacFrom)).map(el => el.description).join('; '),
          comment: [
            posContestInfo.filter(el => el.positionID === posItem.mi_data_id && ((vacFrom && el.orderDate >= vacFrom) || !vacFrom)).map(el => el.state).join('; '),
            empInfo.filter(el => el.positionID === posItem.mi_data_id && ((vacFrom && el.orderDate >= vacFrom) || !vacFrom)).map(el => el.shortFIO).join('; ')
          ].join('<br/>')
        }
        result.data.push(item)
      }
      result.countVacancy += posItem.vacancyRate > 0 ? posItem.vacancyRate : 0
    }
    result.data = _.orderBy(result.data, ['indexNum', 'basepay'], ['asc', 'desc'])

    result.data.forEach(item => {
      item.indexNum = ++indexNum
      item.basepay = HR.reportUtils.formatAsCurrencyStr(item.basepay, 2)
    })
    result.indexNum = indexNum
  }
  return result
}
