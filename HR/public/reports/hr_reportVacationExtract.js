/* global UB AC HR appAC Ext _ $App */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    // hr_reportVacationExtract
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const organizationID = reportParams.organizationID || 0
    const departmentID = reportParams.departmentID || 0
    const subDepartment = reportParams.subDepartment || false
    const vacKindID = reportParams.vacKindID ? reportParams.vacKindID.split(',').map(o => Number(o)) : null
    const onDate = appAC.globalApplicationDate()
    const dateFrom = AC.dateService.shiftDate(reportParams.dateFrom)
    const dateTo = AC.dateService.shiftDate(reportParams.dateTo)
    const result = {
      orgUnits: [],
      previousText: reportParams.previousText || '',
      preamble: (reportParams.preamble ? HR.nameCase.uncap(reportParams.preamble) : '').replace(/&/g, '&nbsp;')
    }

    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name', 'fullName'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    result.organizationName = orgData.nameGen || orgData.fullName || orgData.name || ''

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

    let storeData = await UB.Repository('hr_vacationSchedule')
      .attrs(['ID', 'employeePositionID.positionID.mi_treePath', 'employeePositionID.positionID.name',
        'employeePositionID.depMiTreePath', 'employeePositionID.positionID.nameDat', 'employeePositionID.positionID.nameGen',
        'employeePositionID.posParentUnitID', 'employeePositionID.positionID.idxNum', 'employeeNumberID',
        'employeeNumberID.employeeID.fullFIO', 'employeeNumberID.employeeID.datName', 'dateFrom', 'dateTo', 'employeePositionID.posCatCode',
        'dictVacationKindID.name', 'dictVacationKindID.nameAcc', 'dictVacationKindID.nameGen', 'dictVacationKindID.byArticle', 'dayCount',
        'dictVacationKindID', 'isBountyHelp'])
      .where('employeePositionID.positionID.state', '=', 'ACTIVE')
      .where('employeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
      .where('[employeePositionID.positionID.mi_dateFrom] <= [employeePositionID.dateFrom]', 'custom')
      .where('[employeePositionID.positionID.mi_dateTo] >= [employeePositionID.dateFrom]', 'custom')
      .where('organizationID', '=', organizationID)
      .where('dateFrom', '>=', dateFrom)
      .where('dateTo', '<=', dateTo)
      .whereIf(vacKindID, 'dictVacationKindID', 'in', vacKindID)
      .whereIf(deptIDs && deptIDs.length, 'employeePositionID.departmentID', 'in', deptIDs)
      .selectAsObject({
        'employeePositionID.posCatCode': 'posCatCode'
      })

    const actingData = await UB.Repository('hr_vacationScheduleActing')
      .attrs(['ID', 'vacationScheduleID', 'dateFrom', 'dateTo', 'description', 'condition',
        'employeePositionID.positionID.nameGen', 'employeePositionID.positionID.name', 'employeePositionID.employeeID.genName', 'employeePositionID.employeeID.accusativeName',
        'employeePositionID.employeeID.fullFIO'])
      .where('employeePositionID.positionID.state', '=', 'ACTIVE')
      .where('vacationScheduleID.organizationID', '=', organizationID)
      .where('employeePositionID.positionID.mi_deleteDate', '>=', '#maxdate')
      .where('[employeePositionID.positionID.mi_dateFrom] <= [employeePositionID.dateFrom]', 'custom')
      .where('[employeePositionID.positionID.mi_dateTo] >= [employeePositionID.dateFrom]', 'custom')
      .whereIf(deptIDs && deptIDs.length, 'vacationScheduleID.employeePositionID.departmentID', 'in', deptIDs)
      .whereIf(vacKindID, 'vacationScheduleID.dictVacationKindID', 'in', vacKindID)
      .where('vacationScheduleID.dateFrom', '>=', dateFrom)
      .where('vacationScheduleID.dateTo', '<=', dateTo)
      .selectAsObject()

    const empVacationPlan = await UB.Repository('hr_empVacationPlan')
      .attrs(['employeeNumberID', 'dayCount', 'dictVacationKindID'])
      .whereIf(vacKindID, 'dictVacationKindID', 'in', vacKindID)
      .where('employeeNumberID', 'in', storeData.map(o => o.employeeNumberID))
      .selectAsObject({
        'dayCount': 'dayCountPlan'
      })

    empVacationPlan.forEach(row => {
      const dayPlan = storeData.find(o => o.employeeNumberID === row.employeeNumberID && o.dictVacationKindID === row.dictVacationKindID)
      if (dayPlan) {
        dayPlan.dayCountPlan = row.dayCountPlan
      }
    })

    if (reportParams.category) {
      storeData = storeData.filter(item => (reportParams.category === '1' ? (item.posCatCode || '0') === '1' : (item.posCatCode || '0') !== '1'))
    }

    const orgIds = []
    storeData.forEach(item => {
      const miTreePath = item['employeePositionID.positionID.mi_treePath'] || item['employeePositionID.depMiTreePath']
      if (miTreePath) {
        const itemIds = miTreePath.split('/')
        for (let i = 1; i < itemIds.length - 2; i++) {
          orgIds.push(itemIds[i])
        }
      }
    })

    let rootstoreData
    let orgStruct1
    if (departmentID) {
      orgStruct1 = orgStruct.filter(orgItem => orgItem.mi_data_id === departmentID)
    } else if (organizationID) {
      rootstoreData = storeData.filter(item => item['employeePositionID.posParentUnitID'] === organizationID)
      orgStruct1 = orgStruct.filter(orgItem => orgItem.parentUnitID === organizationID)
    }
    if (rootstoreData && rootstoreData.length) {
      const rootstoreDataObjs = getItems(rootstoreData, actingData)
      result.pos = rootstoreDataObjs.data
    }

    for (let i = 0; i < orgStruct1.length; i++) {
      const orgUnit1 = orgStruct1[i]
      const orgUnits1 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit1.mi_data_id)
      const posItems1 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit1.mi_data_id)
      if ((orgUnits1.length && orgIds.includes(orgUnit1.mi_data_id.toString())) || posItems1.length) {
        const orgUnitHeader = [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}` }]
        // let orgUnitHeader = [{ orgUnitName: `${orgUnit1.code} ${orgUnit1.fullName}`.toUpperCase() }]
        const orgUnitItem1 = { header: orgUnitHeader, units: [], pos: undefined, page: result.orgUnits.length > 0 || result.pos ? '<!-- pagebreak -->' : '' }

        const posItemObjs1 = getItems(posItems1, actingData)
        orgUnitItem1.pos = posItemObjs1.data

        for (let j = 0; j < orgUnits1.length; j++) {
          const orgUnit2 = orgUnits1[j]
          const orgUnits2 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit2.mi_data_id)
          const posItems2 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit2.mi_data_id)
          if ((orgUnits2.length && orgIds.includes(orgUnit2.mi_data_id.toString())) || posItems2.length) {
            const orgUnitItem2 = { orgUnitName: `${orgUnit2.code} ${orgUnit2.fullName}`, units: [], pos: undefined }

            const posItemObjs2 = getItems(posItems2, actingData)
            orgUnitItem2.pos = posItemObjs2.data

            for (let j2 = 0; j2 < orgUnits2.length; j2++) {
              const orgUnit3 = orgUnits2[j2]
              const orgUnits3 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit3.mi_data_id)
              const posItems3 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit3.mi_data_id)
              if ((orgUnits3.length && orgIds.includes(orgUnit3.mi_data_id.toString())) || posItems3.length) {
                const orgUnitItem3 = { orgUnitName: `${orgUnit3.code} ${orgUnit3.fullName}`, units: [], pos: undefined }

                const posItemObjs3 = getItems(posItems3, actingData)
                orgUnitItem3.pos = posItemObjs3.data

                for (let j3 = 0; j3 < orgUnits3.length; j3++) {
                  const orgUnit4 = orgUnits3[j3]
                  const orgUnits4 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit4.mi_data_id)
                  const posItems4 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit4.mi_data_id)
                  if ((orgUnits4.length && orgIds.includes(orgUnit4.mi_data_id.toString())) || posItems4.length) {
                    const orgUnitItem4 = { orgUnitName: `${orgUnit4.code} ${orgUnit4.fullName}`, units: [], pos: undefined }

                    const posItemObjs4 = getItems(posItems4, actingData)
                    orgUnitItem4.pos = posItemObjs4.data

                    for (let j4 = 0; j4 < orgUnits4.length; j4++) {
                      const orgUnit5 = orgUnits4[j4]
                      const orgUnits5 = orgStruct.filter(orgItem => orgItem.parentUnitID === orgUnit5.mi_data_id)
                      const posItems5 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit5.mi_data_id)
                      if ((orgUnits5.length && orgIds.includes(orgUnit5.mi_data_id.toString())) || posItems5.length) {
                        const orgUnitItem5 = { orgUnitName: `${orgUnit5.code} ${orgUnit5.fullName}`, units: [], pos: undefined }

                        const posItemObjs5 = getItems(posItems5, actingData)
                        orgUnitItem5.pos = posItemObjs5.data

                        for (let j5 = 0; j5 < orgUnits5.length; j5++) {
                          const orgUnit6 = orgUnits5[j5]
                          const posItems6 = storeData.filter(pos => pos['employeePositionID.posParentUnitID'] === orgUnit6.mi_data_id)
                          if (posItems6.length) {
                            const orgUnitItem6 = { orgUnitName: `${orgUnit6.code} ${orgUnit6.fullName}`, units: [], pos: undefined }

                            const posItemObjs6 = getItems(posItems6, actingData)
                            orgUnitItem6.pos = posItemObjs6.data
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
    if ((!result.pos || result.pos.length === 0) && (!result.orgUnits || result.orgUnits.length === 0)) {
      result.nodata = true
    }
    return result
  },
  onParamPanelConfig: function () {
    const previousTextStore = Ext.create('Ext.data.Store', {
      fields: ['id', 'caption']
    })
    const id = $App.connection.userData().employeeNumberID || 0
    let depName = ''
    UB.Repository('hr_employeePositionS')
      .attrs('ID', 'departmentID.name')
      .where('employeeNumberID', '=', id)
      .where('dateFrom', '<=', appAC.globalApplicationDate())
      .where('dateTo', '>=', appAC.globalApplicationDate())
      .selectAsObject()
      .then(posInfo => {
        if (posInfo && posInfo.length > 0) {
          depName = posInfo[0]['departmentID.name'] || ''
        }
        previousTextStore.add({ id: 'type1', caption: UB.i18n('ОЗНАЙОМИТИ ПРАЦІВНИКІВ ДЕПАРТАМЕНТУ (УПРАВЛІННЯ, ВІДДІЛУ)') })
        previousTextStore.add({ id: 'type2', caption: UB.i18n('ВКАЗАТИ УСІ ЗАУВАЖЕННЯ ДО ПЕРІОДУ НАДАННЯ ВІДПУСТОК') })
        previousTextStore.add({ id: 'type3', caption: UB.i18n('У РАЗІ НЕОБХІДНОСТІ ПЕРЕНЕСЕННЯ ВІДПУСТКИ У ЗВ\'ЯЗКУ ІЗ СЛУЖБОВОЮ НЕОБХІДНІСТЮ ДОЛУЧИТИ ДО ВИТЯГУ СЛУЖБОВУ ЗАПИСКУ З ОБГРУНТУВАННЯМ') })
        previousTextStore.add({ id: 'type4', caption: UB.i18n('ПОГОДЖЕНИЙ ВИТЯГ ПОВЕРНУТИ ДО ') + depName + UB.i18n(' ДО ____.____._______ року') })
      })

    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'left' },
          items: [
            HR.controlService.getOrgCombo({
              labelWidth: 145,
              width: 750,
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
                {
                  xtype: 'datefield',
                  name: 'dateFrom',
                  labelWidth: 145,
                  width: 255,
                  fieldLabel: UB.i18n('Період з'),
                  allowBlank: false,
                  value: AC.dateService.addMonths(new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1, 0, 0, 0, 0), 1),
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t)
                      ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                      : true
                  }
                },
                {
                  xtype: 'datefield',
                  name: 'dateTo',
                  labelWidth: 40,
                  width: 150,
                  fieldLabel: UB.i18n('по'),
                  allowBlank: false,
                  value: AC.dateService.lastDayOfMonth(AC.dateService.addMonths(new Date((new Date()).getFullYear(), (new Date()).getMonth(), 1, 0, 0, 0, 0), 1)),
                  validator: function () {
                    const me = paramForm.getForm()
                    const f = me.findField('dateFrom').getValue()
                    const t = me.findField('dateTo').getValue()
                    return (f > t)
                      ? UB.i18n('Дата кінця періоду повинна перевищувати дату початку')
                      : true
                  }
                }
              ]
            },
            {
              xtype: 'ubboxselect',
              name: 'vacKindID',
              fieldLabel: UB.i18n('Вид відпустки'),
              labelWidth: 145,
              width: 750,
              gridFieldList: ['code', 'name'],
              displayField: 'name',
              valueField: 'ID',
              allowBlank: false,
              ubRequest: {
                entity: 'hr_dictVacationKind',
                fieldList: ['ID', 'code', 'name'],
                orderList: { orderBy: { expression: 'code' } }
              },
              listeners: {
                render: function (ctrl) {
                  ctrl.store.on('load', () => {
                    if (!ctrl.store.isLoaded) {
                      const storeItems = ctrl.store.data.items
                      const selItem = _.find(storeItems, { data: { code: 'dYear' } })
                      if (selItem) {
                        ctrl.setValue(selItem.data.ID)
                      }
                      ctrl.store.isLoaded = true
                    }
                  })
                  ctrl.store.load()
                }
              }
            },
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 145,
                  displayField: 'description',
                  width: 750,
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=subDepartment]').setReadOnly(!value)
                      if (!value) {
                        form.down('[name=subDepartment]').setValue()
                      }
                    }
                  }
                }),
                {
                  xtype: 'checkboxfield',
                  labelWidth: 200,
                  name: 'subDepartment',
                  fieldLabel: UB.i18n('з підлеглими підрозділами'),
                  readOnly: true
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
            },
            {
              xtype: 'ubboxselect',
              name: 'previousText',
              ubID: 'previousTextSelector',
              labelWidth: 145,
              width: 750,
              fieldLabel: UB.i18n('Попередній текст'),
              store: previousTextStore,
              queryMode: 'local',
              displayField: 'caption',
              valueField: 'id',
              listeners: {
                render: function (ctrl) {
                  ctrl.store.on('load', () => {
                    if (!ctrl.store.isLoaded) {
                      const storeItems = ctrl.store.data.items
                      const selItem = _.find(storeItems, { data: { id: 'type3' } })
                      if (selItem) {
                        ctrl.setValue(selItem.data.ID)
                      }
                      ctrl.store.isLoaded = true
                    }
                  })
                  ctrl.store.load()
                }
              }
            }, {
              xtype: 'ubcombobox',
              name: 'preambleID',
              fieldLabel: UB.i18n('Преамбула'),
              labelWidth: 145,
              width: 750,
              gridFieldList: ['ID', 'code', 'preamble'],
              displayField: 'preamble',
              valueField: 'ID',
              ubRequest: {
                entity: 'hr_dictEmpOrderText',
                fieldList: ['ID', 'preamble'],
                whereList: {
                  eGroup: {
                    expression: '[empOrderType]',
                    condition: 'equal',
                    value: 'VACATION'
                  }
                }
              }
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const catChiefs = frm.findField('catChiefs').getValue()
        const catOthers = frm.findField('catOthers').getValue()
        const previousTextValue = frm.findField('previousText').lastSelection
        let previous = []
        previousTextValue.forEach((row, index) => {
          index = index + 1
          const text = index + '. ' + row.data.caption
          previous.push(text)
        })
        return {
          organizationID: frm.findField('organizationID').getValue() || 0,
          departmentID: frm.findField('departmentID').getValue() || 0,
          subDepartment: frm.findField('subDepartment').getValue() || false,
          vacKindID: frm.findField('vacKindID').getValue() || 0,
          dateFrom: frm.findField('dateFrom').getValue(),
          dateTo: frm.findField('dateTo').getValue(),
          category: catChiefs && !catOthers ? '1' : (!catChiefs && catOthers ? '2' : undefined),
          previousText: previous.join('<br/>'),
          preamble: (frm.findField('preambleID').getRawValue() || '').replace(/&/g, '&nbsp;')
        }
      }
    })
    return paramForm
  }
}

function getItems (dataItems, act) {
  const result = {
    data: []
  }
  if (dataItems.length) {
    for (let i = 0; i < dataItems.length; i++) {
      const posName = dataItems[i]['employeePositionID.positionID.nameDat'] || dataItems[i]['employeePositionID.positionID.name'] || ''
      const empName = dataItems[i]['employeeNumberID.employeeID.datName'] || dataItems[i]['employeeNumberID.employeeID.fullFIO'] || ''
      let txt = empName + (posName ? ', ' + posName + ', ' : ' ') + UB.i18n('надати ') + (dataItems[i].dayCountPlan && dataItems[i].dayCount ? (dataItems[i].dayCount < dataItems[i].dayCountPlan
        ? `частину ${dataItems[i]['dictVacationKindID.nameGen']}` : dataItems[i]['dictVacationKindID.nameAcc']) : dataItems[i]['dictVacationKindID.nameAcc'])
      txt += dataItems[i]['dictVacationKindID.byArticle'] ? UB.i18n(' відповідно до ') + dataItems[i]['dictVacationKindID.byArticle'] : ''
      txt += UB.i18n(' з ') + AC.dateService.getStringFormatDate(dataItems[i].dateFrom, '', '', UB.i18n(' року'))
      txt += UB.i18n(' до ') + AC.dateService.getStringFormatDate(dataItems[i].dateTo, '', '', UB.i18n(' року'))
      txt += UB.i18n(' включно (') + dataItems[i].dayCount + ' ' + AC.dateService.plural(UB.i18n('день_дні_днів'), dataItems[i].dayCount) + ')'
      txt += dataItems[i]['isBountyHelp'] ? UB.i18n(' з виплатою грошової допомоги.') : UB.i18n('.')
      const dataItem = {
        indexNum: dataItems[i]['employeePositionID.positionID.idxNum'] || 99999999,
        text: txt,
        actingInfo: act ? makeActing(act.filter(el => el.vacationScheduleID === dataItems[i].ID), dataItems[i]['employeePositionID.positionID.nameGen'] || dataItems[i]['employeePositionID.positionID.name']) : null
      }

      if (dataItem.actingInfo === '.') {
        dataItem.actingInfo = null
      }
      result.data.push(dataItem)
    }
  }
  return result
}

function makeActing (act, positionName) {
  let result = []
  act.forEach(el => {
    let str = ''
    if (!result.length) {
      str = UB.i18n(`На період відпустки виконання обов'язків {0} покласти`, HR.nameCase.uncap(positionName || '____________________'))
    }
    str += UB.i18n(` з {0} по {1} `, AC.dateService.getStringFormatDate(el.dateFrom, '', '', ' року'), AC.dateService.getStringFormatDate(el.dateTo, '', '', ' року'))
    str += UB.i18n('на ') + (el['employeePositionID.employeeID.accusativeName'] || el['employeePositionID.employeeID.fullFIO']) +
        ', ' + (el['employeePositionID.positionID.accusativeName'] || el['employeePositionID.positionID.name'])
    result.push(str)
  })
  return result.join('; ') + '.'
}
