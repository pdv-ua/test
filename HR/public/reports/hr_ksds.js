/* global Ext _ UB $App AC HR appAC */
let paramRep
let paramForm
let empQntData
let uempAcceptData
let uempDismData
let timeSheetData
let perDates
let lastWorkDay
let empAppointData
const mobAndPregnantEls = [appAC.langCodei18n('В3дит'), appAC.langCodei18n('Моб'), appAC.langCodei18n('Війс')]

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    const ctrlOrgID = paramForm.down('[name=organizationID]')
    const orgReco = AC.gridUtils.getCurrentRecord(ctrlOrgID)
    const orgName = orgReco && orgReco.get('fullName')
    return me.getReportData(reportParams.orgID, orgName, reportParams.year, reportParams.quarter, reportParams.onDate).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (orgID, orgName, year, quarter, onDate) {
    /* UBHR-1932 - не враховувати дочірні організації */
    // let childOrgIDs = await HR.treeUtils.getChildOrgs(orgID, onDate)
    let childOrgIDs = [orgID]
    perDates = AC.dateService.getQuarterDates(year, quarter)
    lastWorkDay = await HR.timeService.getLastWorkDayBefore(onDate, orgID)
    let timeSheetOnDate = await HR.timeService.getNextToHolidayDate(onDate, orgID)
    const orgAddr = await UB.Repository('ac_address')
      .attrs(['address'])
      .where('ownerID', '=', orgID)
      .where('addressType', '=', '2')
      .selectScalar()
    const posDataOnDate = await UB.Repository('hr_position')
      .attrs(['mi_data_id', 'positionType', 'quantity', 'psCategory'])
      .where('orgID', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate })
      .selectAsObject()
    const posDataHistAll = await UB.Repository('hr_position')
      .attrs(['mi_data_id', 'positionType', 'quantity', 'psCategory', 'mi_dateFrom'])
      .where('orgID', '=', orgID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_recordhistory_all: true })
      .groupBy(['mi_data_id', 'positionType', 'quantity', 'psCategory', 'mi_dateFrom'])
      .selectAsObject()
    let posDataAll = []
    posDataHistAll.forEach(pos => {
      let existedPos = posDataAll.find(itm => itm.mi_data_id === pos.mi_data_id)
      if (!existedPos) {
        let upos
        let uposItems = posDataHistAll.filter(item => item.mi_data_id === pos.mi_data_id)
        if (uposItems.length === 1) {
          upos = uposItems[0]
        } else {
          let lastDateFrom = AC.dateService.getNearestDate(uposItems, 'mi_dateFrom', onDate)
          upos = posDataHistAll.find(item => item.mi_data_id === pos.mi_data_id && AC.dateService.equals(AC.dateService.unshiftDate(item.mi_dateFrom), lastDateFrom))
        }
        if (upos) {
          posDataAll.push(pos)
        }
      }
    })
    empQntData = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID', 'mtCount'])
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .selectAsObject()
    const empCntData = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID', 'employeeNumberID'])
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .notExists(UB.Repository('tim_timeSheet')
        .correlation('employeeNumberID', 'employeeNumberID')
        .where('dateWork', '=', timeSheetOnDate)
        .where('isActive', '=', true)
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('factTimeCostID.code', 'in', mobAndPregnantEls)
        .where('factTimeCostID.mi_deleteDate', '>=', '#maxdate'))
      .notExists(UB.Repository('hr_timeSheetChangeEmp')
        .correlation('employeeNumberID', 'employeeNumberID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('timeSheetChangeID.dateFrom', '<=', timeSheetOnDate)
        .where('timeSheetChangeID.dateTo', '>=', timeSheetOnDate)
        .where('timeSheetChangeID.mi_deleteDate', '>=', '#maxdate')
        .exists(UB.Repository('hr_timeSheetChangeDay')
          .correlation('timeSheetChangeID', 'timeSheetChangeID')
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('dictTimeCostID.code', 'in', mobAndPregnantEls))
        .notExists(UB.Repository('tim_timeSheet')
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('dateWork', '=', timeSheetOnDate)
          .where('isActive', '=', true)
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('factTimeCostID.mi_deleteDate', '>=', '#maxdate')))
      .selectAsObject()
    const cntAcceptData = await UB.Repository('hr_employeePositionS')
      .attrs(['positionID', 'employeeNumberID'])
      .where('dateFrom', '<=', lastWorkDay)
      .where('dateTo', '>=', lastWorkDay)
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('contractType', '!=', '2')
      .where('workPlace', '=', '1')
      .notExists(UB.Repository('tim_timeSheet')
        .correlation('employeeNumberID', 'employeeNumberID')
        .where('dateWork', '=', timeSheetOnDate)
        .where('isActive', '=', true)
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('factTimeCostID.code', 'in', mobAndPregnantEls)
        .where('factTimeCostID.mi_deleteDate', '>=', '#maxdate'))
      .notExists(UB.Repository('hr_timeSheetChangeEmp')
        .correlation('employeeNumberID', 'employeeNumberID')
        .where('mi_deleteDate', '>=', '#maxdate')
        .where('timeSheetChangeID.organizationID', '=', orgID)
        .where('timeSheetChangeID.dateFrom', '<=', timeSheetOnDate)
        .where('timeSheetChangeID.dateTo', '>=', timeSheetOnDate)
        .where('timeSheetChangeID.mi_deleteDate', '>=', '#maxdate')
        .exists(UB.Repository('hr_timeSheetChangeDay')
          .correlation('timeSheetChangeID', 'timeSheetChangeID')
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('dictTimeCostID.code', 'in', mobAndPregnantEls))
        .notExists(UB.Repository('tim_timeSheet')
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('dateWork', '=', timeSheetOnDate)
          .where('isActive', '=', true)
          .where('mi_deleteDate', '>=', '#maxdate')
          .where('factTimeCostID.mi_deleteDate', '>=', '#maxdate')))
      .selectAsObject()
    const empAcceptDataAll = await UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'positionID', 'employeeID', 'orderID', 'dateFrom'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('employeeNumberID.dateFrom', '>=', perDates.dateFrom)
      .where('employeeNumberID.dateFrom', '<=', perDates.dateTo)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    uempAcceptData = await HR.reportUtils.getEmpNumDates({
      orgID: orgID,
      onDate: onDate,
      dateFrom: perDates.dateFrom,
      dateTo: perDates.dateTo,
      maxDateFromAlias: 'dateFrom',
      dateFromInPeriod: true
    })
    uempDismData = [...uempAcceptData]

    let empAcceptData = []
    empAcceptDataAll.forEach(pos => {
      let upos = uempAcceptData.find(item => item.employeeNumberID === pos.employeeNumberID && AC.dateService.equals(item.dateFrom, pos.dateFrom))
      if (upos) {
        empAcceptData.push(pos)
      }
    })
    const empMoveDataAll = await UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'positionID', 'employeeID', 'orderID', 'dateFrom', 'positionID.positionType'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('dateFrom', '>=', perDates.dateFrom)
      .where('dateFrom', '<=', perDates.dateTo)
      .joinCondition('positionID.positionType', '=', '1')
      .joinCondition('[dateFrom] >= [positionID.mi_dateFrom]', 'custom')
      .joinCondition('[dateFrom] <= [positionID.mi_dateTo]', 'custom')
      .joinCondition('positionID.state', '=', 'ACTIVE')
      .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    const empMovePrevData = await UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'positionID', 'dateFrom', 'positionID.positionType'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', perDates.dateTo)
      .joinCondition('[dateFrom] >= [positionID.mi_dateFrom]', 'custom')
      .joinCondition('[dateFrom] <= [positionID.mi_dateTo]', 'custom')
      .joinCondition('positionID.state', '=', 'ACTIVE')
      .joinCondition('positionID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('dateFrom', 'desc')
      .selectAsObject()
    empMoveDataAll.forEach(moveItem => {
      if (moveItem['positionID.positionType'] === '1') {
        let prevMoveItems = empMovePrevData.filter(item => item.employeeNumberID === moveItem.employeeNumberID)
        if (prevMoveItems.length > 1) {
          let dateFrom = moveItem.dateFrom
          for (let i = 0; i < prevMoveItems.length; i++) {
            let prevMoveItem = prevMoveItems[i]
            let prevDateFrom = prevMoveItem.dateFrom
            if (prevDateFrom < dateFrom) {
              if (prevMoveItem['positionID.positionType'] !== '1') {
                let existAcceptItem = empAcceptData.find(item => item.employeeNumberID === moveItem.employeeNumberID)
                if (!existAcceptItem) {
                  empAcceptData.push(moveItem)
                  uempAcceptData.push({ employeeNumberID: moveItem.employeeNumberID, dateFrom: dateFrom })
                } else {
                  existAcceptItem.positionID = moveItem.positionID
                  existAcceptItem.orderID = moveItem.orderID
                  existAcceptItem.dateFrom = moveItem.dateFrom
                }
              } else {
                let existUempAcceptItem = uempAcceptData.find(item => item.employeeNumberID === moveItem.employeeNumberID)
                if (existUempAcceptItem) {
                  existUempAcceptItem.dateFrom = prevDateFrom
                }
              }
              break
            }
          }
        }
      }
    })

    const empDismDataAll = await UB.Repository('hr_employeePositionS')
      .attrs(['employeeNumberID', 'positionID', 'dateFrom'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('employeeNumberID.dateTo', '>=', perDates.dateFrom)
      .where('employeeNumberID.dateTo', '<=', perDates.dateTo)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    let empDismData = []
    empDismDataAll.forEach(pos => {
      let upos = uempDismData.find(item => item.employeeNumberID === pos.employeeNumberID && AC.dateService.equals(item.dateFrom, pos.dateFrom))
      if (upos) {
        empDismData.push(pos)
      }
    })
    empAppointData = await UB.Repository('hr_empOrderAppointDet')
      .attrs(['orderID', 'employeeID', 'employeeNumberID', 'dictAppointKindID.type'])
      .where('dateFrom', '>=', perDates.dateFrom)
      .where('dateFrom', '<=', perDates.dateTo)
      .where('organizationID', '=', orgID)
      .joinCondition('dictAppointKindID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID.orderState', '!=', 'PROJECT')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'dictAppointKindID.type': 'type'
      })
    let orderMoveData = await UB.Repository('hr_empOrderMoveDet')
      .attrs(['orderID', 'employeeID', 'employeeNumberID', 'dictReasonMovingKindID.type'])
      .where('dateFrom', '>=', perDates.dateFrom)
      .where('dateFrom', '<=', perDates.dateTo)
      .where('organizationID', '=', orgID)
      .joinCondition('dictReasonMovingKindID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID.orderState', '!=', 'PROJECT')
      .where('orderID.mi_deleteDate', '>=', '#maxdate')
      .orderBy('dateFrom')
      .selectAsObject({
        'dictReasonMovingKindID.type': 'type'
      })
    orderMoveData.forEach(item => {
      let existAppointItem = empAppointData.find(aItem => aItem.employeeNumberID === item.employeeNumberID)
      if (existAppointItem) {
        existAppointItem.orderID = item.orderID
        existAppointItem.type = item.type
      } else {
        let existAcceptItem = empAcceptData.find(aItem => aItem.employeeNumberID === item.employeeNumberID)
        if (existAcceptItem) {
          empAppointData.push(item)
        }
      }
    })
    timeSheetData = await UB.Repository('tim_timeSheet')
      .attrs(['employeeNumberID', 'factTimeCostID.code'])
      .where('dateWork', '=', timeSheetOnDate)
      .where('isActive', '=', true)
      .where('employeeNumberID.orgID', '=', orgID)
      .where('factTimeCostID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    let timeSheetChangeEmp = await UB.Repository('hr_timeSheetChangeEmp')
      .attrs(['timeSheetChangeID', 'employeeNumberID'])
      .where('timeSheetChangeID.organizationID', '=', orgID)
      .where('timeSheetChangeID.dateFrom', '<=', timeSheetOnDate)
      .where('timeSheetChangeID.dateTo', '>=', timeSheetOnDate)
      .where('timeSheetChangeID.mi_deleteDate', '>=', '#maxdate')
      .where('timeSheetChangeID.orderState', '=', 'PROJECT')
      .orderBy('timeSheetChangeID.orderDate')
      .selectAsObject()
    let timeSheetChangeDay = await UB.Repository('hr_timeSheetChangeDay')
      .attrs(['timeSheetChangeID', 'dictTimeCostID.code'])
      .where('timeSheetChangeID.organizationID', '=', orgID)
      .where('timeSheetChangeID.dateFrom', '<=', timeSheetOnDate)
      .where('timeSheetChangeID.dateTo', '>=', timeSheetOnDate)
      .where('timeSheetChangeID.mi_deleteDate', '>=', '#maxdate')
      .where('timeSheetChangeID.orderState', '=', 'PROJECT')
      .selectAsObject()
    timeSheetChangeEmp.forEach(changeEmp => {
      let changeDays = timeSheetChangeDay.filter(item => item.timeSheetChangeID === changeEmp.timeSheetChangeID)
      let changeDay = changeDays[0]
      if (changeDay) {
        let tsData = timeSheetData.find(item => item.employeeNumberID === changeEmp.employeeNumberID)
        if (!tsData) {
          timeSheetData.push({
            employeeNumberID: changeEmp.employeeNumberID,
            'factTimeCostID.code': changeDay['dictTimeCostID.code']
          })
        }
      }
    })

    paramRep = {
      sheetCount: 3,
      onDate: onDate.toString(),
      orgIDs: childOrgIDs.join(),
      year: year,
      quarter: quarter,
      page0: {
        onDateStr: AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.')),
        orgName: orgName || '________________________________________________',
        orgAddr: orgAddr || '________________________________________________'
      },
      page1: {
        pg1rw1cl3: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' ? itm['quantity'] : 0 }),
        pg1rw1cl4: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '1' ? itm['quantity'] : 0 }),
        pg1rw1cl5: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '2' ? itm['quantity'] : 0 }),
        pg1rw1cl6: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '3' ? itm['quantity'] : 0 }),
        pg1rw1cl7: countData(posDataOnDate, function (itm) { return itm['positionType'] !== '1' ? itm['quantity'] : 0 }),
        pg1rw1cl8: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' ? getVacQuantity(posDataOnDate, empQntData, itm.mi_data_id) : 0 }),
        pg1rw1cl9: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '1' ? getVacQuantity(posDataOnDate, empQntData, itm.mi_data_id) : 0 }),
        pg1rw1cl10: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '2' ? getVacQuantity(posDataOnDate, empQntData, itm.mi_data_id) : 0 }),
        pg1rw1cl11: countData(posDataOnDate, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '3' ? getVacQuantity(posDataOnDate, empQntData, itm.mi_data_id) : 0 }),
        pg1rw1cl12: countData(posDataOnDate, function (itm) { return itm['positionType'] !== '1' ? getVacQuantity(posDataOnDate, empQntData, itm.mi_data_id) : 0 }),
        pg1rw1cl13: countData(posDataAll, function (itm) { return itm['positionType'] === '1' ? getEmpPosCount(empCntData, itm.mi_data_id) : 0 }),
        pg1rw1cl14: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '1' ? getEmpPosCount(empCntData, itm.mi_data_id) : 0 }),
        pg1rw1cl15: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '2' ? getEmpPosCount(empCntData, itm.mi_data_id) : 0 }),
        pg1rw1cl16: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '3' ? getEmpPosCount(empCntData, itm.mi_data_id) : 0 }),
        pg1rw1cl17: countData(posDataAll, function (itm) { return itm['positionType'] === '1' ? getEmpPosCount(cntAcceptData, itm.mi_data_id) : 0 })
      },
      page2: {
        pg2rw1cl3: countData(posDataAll, function (itm) { return itm['positionType'] === '1' ? getEmpPosCount(empAcceptData, itm.mi_data_id) : 0 }),
        pg2rw1cl4: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '1' ? getEmpPosCount(empAcceptData, itm.mi_data_id) : 0 }),
        pg2rw1cl5: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '2' ? getEmpPosCount(empAcceptData, itm.mi_data_id) : 0 }),
        pg2rw1cl6: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '3' ? getEmpPosCount(empAcceptData, itm.mi_data_id) : 0 }),
        pg2rw1cl7: countData(posDataAll, function (itm) { return itm['positionType'] === '1' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'CONTEST') : 0 }),
        pg2rw1cl8: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '1' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'CONTEST') : 0 }),
        pg2rw1cl9: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '2' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'CONTEST') : 0 }),
        pg2rw1cl10: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '3' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'CONTEST') : 0 }),
        pg2rw1cl11: countData(posDataAll, function (itm) { return itm['positionType'] === '1' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'MOVING') : 0 }),
        pg2rw1cl12: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '1' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'MOVING') : 0 }),
        pg2rw1cl13: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '2' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'MOVING') : 0 }),
        pg2rw1cl14: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '3' ? getEmpPosAppointKindCount(empAcceptData, itm.mi_data_id, empAppointData, 'MOVING') : 0 }),
        pg2rw1cl15: countData(posDataAll, function (itm) { return itm['positionType'] === '1' ? getEmpPosCount(empDismData, itm.mi_data_id) : 0 }),
        pg2rw1cl16: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '1' ? getEmpPosCount(empDismData, itm.mi_data_id) : 0 }),
        pg2rw1cl17: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '2' ? getEmpPosCount(empDismData, itm.mi_data_id) : 0 }),
        pg2rw1cl18: countData(posDataAll, function (itm) { return itm['positionType'] === '1' && itm['psCategory'] === '3' ? getEmpPosCount(empDismData, itm.mi_data_id) : 0 })
      }
    }
    return paramRep
  },
  onReportClick: function (e) {
    drillDown(e.target.dataset['orgids'], e.target.dataset['year'], e.target.dataset['quarter'], e.target.dataset['ondate'],
      e.target.dataset['page'], e.target.dataset['row'], e.target.dataset['col'])
    e.preventDefault()
  },
  onParamPanelConfig: function () {
    paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          dockedItems: [
            {
              xtype: 'toolbar',
              dock: 'top',
              items: [
                {
                  orderId: 1,
                  actionId: 'saveAndClose',
                  tooltip: UB.i18n('saveAndClose'),
                  iconCls: 'fas fa-share-square',
                  scale: 'medium',
                  cls: 'save-and-close-action',
                  disabled: true,
                  handler: function (btn) {
                  }
                },
                {
                  orderId: 2,
                  actionId: 'save',
                  tooltip: UB.i18n('save'),
                  iconCls: 'fas fa-save',
                  scale: 'medium',
                  cls: 'save-action',
                  disabled: true,
                  handler: function (btn) {
                  }
                },
                {
                  orderId: 3,
                  actionId: 'fDelete',
                  tooltip: UB.i18n('Delete'),
                  iconCls: 'far fa-trash-alt',
                  scale: 'medium',
                  cls: 'delete-action',
                  disabled: true,
                  handler: function (btn) {
                  }
                }
              ]
            }
          ],
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getOrgCombo({
              labelWidth: 120,
              allowBlank: false,
              disableContextMenu: true,
              readOnly: true
            }),
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'numberfield',
                  name: 'year',
                  labelWidth: 120,
                  width: 240,
                  fieldLabel: UB.i18n('Рік'),
                  allowBlank: false,
                  vtype: 'numberValidator',
                  maxValue: 2099,
                  minValue: 2000,
                  listeners: {
                    afterrender: function (crtl) {
                      let year = AC.dateService.getPrevQuarterYear()
                      crtl.setValue(year)
                    },
                    change: function (ctrl) {
                      yearChange(ctrl)
                    }
                  }
                },
                {
                  xtype: 'ubcombobox',
                  name: 'quarter',
                  valueField: 'code',
                  displayField: 'name',
                  fieldLabel: UB.i18n('Квартал'),
                  allowBlank: false,
                  labelWidth: 80,
                  width: 220,
                  ubRequest: {
                    entity: 'ubm_enum',
                    fieldList: ['code', 'name', 'eGroup'],
                    whereList: {
                      eGroup: {
                        expression: '[eGroup]',
                        condition: 'equal',
                        values: { 'eGroup': 'HR_QUARTER' }
                      }
                    }
                  },
                  listeners: {
                    render: function (crtl) {
                      const store = crtl.getStore()
                      store.on('load', () => {
                        let prevQuarter = AC.dateService.getPrevQuarter()
                        crtl.setValue(prevQuarter.toString())
                        let reportViewer = this.up('form').ownerCt
                        reportViewer.exportToXLSX = exportToXLSX
                      })
                      store.load()
                    },
                    change: function (ctrl) {
                      quarterChange(ctrl)
                    }
                  }
                }
              ]
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 120,
                  width: 240,
                  fieldLabel: UB.i18n('Станом на'),
                  readOnly: true,
                  listeners: {
                    afterrender: function (crtl) {
                      let onDate = AC.dateService.firstDayAfterQuarter()
                      crtl.setValue(onDate)
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      getParameters: function (owner) {
        let frm = owner.getForm()
        return {
          orgID: frm.findField('organizationID').getValue() || 0,
          year: frm.findField('year').getValue() || 0,
          quarter: frm.findField('quarter').getValue() || 0,
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate())
        }
      }
    })
    paramRep = undefined
    return paramForm
  }
}

let addConditions = {
  pages: {
    1: {
      rows: {
        1: {
          cols: {
            3: [],
            4: [
              {
                expression: '[psCategory]',
                condition: '=',
                values: { value: '1' }
              }
            ],
            5: [
              {
                expression: '[psCategory]',
                condition: '=',
                values: { value: '2' }
              }
            ],
            6: [
              {
                expression: '[psCategory]',
                condition: '=',
                values: { value: '3' }
              }
            ],
            7: [
              {
                expression: '[positionTypeNotNull]',
                condition: '!=',
                values: { value: '1' }
              }
            ],
            8: [],
            9: [
              {
                expression: '[psCategory]',
                condition: '=',
                values: { value: '1' }
              }
            ],
            10: [
              {
                expression: '[psCategory]',
                condition: '=',
                values: { value: '2' }
              }
            ],
            11: [
              {
                expression: '[psCategory]',
                condition: '=',
                values: { value: '3' }
              }
            ],
            12: [
              {
                expression: '[positionTypeNotNull]',
                condition: '!=',
                values: { value: '1' }
              }
            ],
            13: [],
            14: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '1' }
              }
            ],
            15: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '2' }
              }
            ],
            16: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '3' }
              }
            ],
            17: [
              {
                expression: '[contractType]',
                condition: '!=',
                values: { value: '2' }
              },
              {
                expression: '[workPlace]',
                condition: '=',
                values: { value: '1' }
              }
            ]
          }
        }
      }
    },
    2: {
      rows: {
        1: {
          cols: {
            3: [],
            4: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '1' }
              }
            ],
            5: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '2' }
              }
            ],
            6: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '3' }
              }
            ],
            7: [],
            8: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '1' }
              }
            ],
            9: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '2' }
              }
            ],
            10: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '3' }
              }
            ],
            11: [],
            12: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '1' }
              }
            ],
            13: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '2' }
              }
            ],
            14: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '3' }
              }
            ],
            15: [],
            16: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '1' }
              }
            ],
            17: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '2' }
              }
            ],
            18: [
              {
                expression: '[positionID.psCategory]',
                condition: '=',
                values: { value: '3' }
              }
            ]
          }
        }
      }
    }
  }
}

function drillDown (orgIDs, year, quarter, onDate, pg, rw, cl) {
  onDate = AC.dateService.shiftDate(onDate)
  let orgIDList = AC.dataService.getNumberArray(orgIDs)
  const windowTitle = `${UB.i18n('Форма КСДС')}, ${UB.i18n('розділ')} ${pg}, ${UB.i18n('рядок')} ${rw}, ${UB.i18n('колонка')} ${cl}`
  if (pg === '1' && ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].includes(cl)) {
    let fieldList = [
      { name: 'ID', visibility: false },
      { name: 'name', description: UB.i18n('Посада'), config: { width: 250 } },
      { name: 'parentUnitID.name', description: UB.i18n('Підпордкування'), config: { width: 250 } },
      { name: 'quantity', config: { align: 'center', width: 130 }, format: '0.0' },
      { name: 'mtCount', description: UB.i18n('Зайнятих ставок'), config: { align: 'center', width: 130 }, format: '0.0', visibility: false },
      { name: 'vacCount', description: UB.i18n('Вакантних ставок'), config: { align: 'center', width: 140 }, format: '0.0', visibility: false },
      { name: 'mi_data_id', visibility: false }
    ]
    if (pg === '1' && ['8', '9', '10', '11', '12'].includes(cl)) {
      fieldList.forEach(fieldDesc => {
        if (['mtCount', 'vacCount'].includes(fieldDesc.name)) {
          fieldDesc.visibility = true
        }
      })
    }
    /* В hr_reportKsds.selectWithVacCount буде додано 2 поля mtCount та vacCount */
    fieldList.push()
    fieldList.push()
    let whereList = {
      orgID: {
        expression: '[orgID]',
        condition: 'in',
        values: { value: orgIDList }
      },
      state: {
        expression: '[state]',
        condition: '=',
        values: { value: 'ACTIVE' }
      },
      parentDateTo: {
        expression: '[parentUnitID.mi_dateTo] = [parentUnitID.mi_maxDateTo]',
        condition: 'custom'
      },
      parentState: {
        expression: '[parentUnitID.state]',
        condition: '=',
        values: { value: 'ACTIVE' }
      },
      parentDeleteDate: {
        expression: '[parentUnitID.mi_deleteDate]',
        condition: '=',
        values: { value: '#maxdate' }
      },
      // monkey request prevention
      monkeyClause: {
        expression: '[ID]',
        condition: '!=',
        values: { value: AC.dataService.getUniqueInt() }
      }
    }
    let joinAs = ['parentDateTo', 'parentState', 'parentDeleteDate']
    if (!['7', '12'].includes(cl)) {
      whereList.positionType = {
        expression: '[positionType]',
        condition: '=',
        values: { value: '1' }
      }
    }
    let addCond = addConditions.pages[pg].rows[rw].cols[cl]
    if (addCond && addCond.length) {
      for (let i = 0; i < addCond.length; i++) {
        let condName = 'colCond' + i
        whereList[condName] = addCond[i]
      }
    }
    _.forEach(whereList, item => {
      item.isInitial = true
    })
    let options = {}
    if ((pg === '1') && ['8', '9', '10', '11', '12'].includes(cl)) {
      options.noLimit = true
    }
    $App.doCommand({
      cmdType: 'showList',
      entity: 'hr_reportKsds',
      isModal: true,
      description: windowTitle,
      cmpInitConfig: {
        dfm: {
          size: {
            width: 1000,
            height: 500
          }
        },
        afterInit: function () {
          const grid = this
          if ((pg === '1') && ['8', '9', '10', '11', '12'].includes(cl)) {
            AC.viewUtils.setFilterValue(grid, {
              vacCount: function (item) {
                let posID = item.get('mi_data_id')
                let posQuantity = item.get('quantity')
                let mtCount = 0.0
                let empPosItems = empQntData.filter(itm => itm.positionID === posID)
                if (empPosItems.length > 0) {
                  empPosItems.forEach(itm => {
                    mtCount += (itm.mtCount || 0)
                  })
                }
                let result = posQuantity && posQuantity > mtCount
                if (result) {
                  item.notWriteChanges = true
                  item.set('mtCount', mtCount)
                  item.set('vacCount', posQuantity - mtCount)
                  item.commit()
                }
                return result
              }
            }, [], 0)
          }
        },
        onItemDblClick: function (grid, record) {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_position',
            entity: 'hr_position',
            instanceID: record.get('ID')
          })
        },
        optimizeColumnWidth: function () {
          // eslint-disable-next-line no-unused-expressions
          /!* do nothing for manual column width tunning *!/
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {
        params: [{
          entity: 'hr_reportKsds',
          method: 'selectWithVacCount',
          fieldList: fieldList,
          __mip_ondate: onDate,
          whereList: whereList,
          joinAs: joinAs,
          orderList: {
            name: {
              expression: '[name]',
              order: 'asc'
            }
          },
          options: options
        }]
      }
    })
  } else if (['1', '2'].includes(pg)) {
    let whereList = {
      organizationID: {
        expression: '[organizationID]',
        condition: 'in',
        values: { value: orgIDList }
      },
      posOrgID: {
        expression: '[positionID.orgID]',
        condition: 'in',
        values: { value: orgIDList }
      },
      posState: {
        expression: '[positionID.state]',
        condition: '=',
        values: { value: 'ACTIVE' }
      },
      posDateTo: {
        expression: '[positionID.mi_dateTo] = [positionID.mi_maxDateTo]',
        condition: 'custom'
      },
      posDeleteDate: {
        expression: '[positionID.mi_deleteDate]',
        condition: '=',
        values: { value: '#maxdate' }
      },
      posPositionType: {
        expression: '[positionID.positionType]',
        condition: '=',
        values: { value: '1' }
      },
      parentDateTo: {
        expression: '[positionID.parentUnitID.mi_dateTo] = [positionID.parentUnitID.mi_maxDateTo]',
        condition: 'custom'
      },
      parentState: {
        expression: '[positionID.parentUnitID.state]',
        condition: '=',
        values: { value: 'ACTIVE' }
      },
      parentDeleteDate: {
        expression: '[positionID.parentUnitID.mi_deleteDate]',
        condition: '=',
        values: { value: '#maxdate' }
      },
      empDeleteDate: {
        expression: '[employeeID.mi_deleteDate]',
        condition: '=',
        values: { value: '#maxdate' }
      },
      // monkey request prevention
      monkeyClause: {
        expression: '[ID]',
        condition: '!=',
        values: { value: AC.dataService.getUniqueInt() }
      }
    }
    let joinAs = ['parentDateTo', 'parentState', 'parentDeleteDate']
    if (pg === '1') {
      whereList.dateFrom = {
        expression: '[dateFrom]',
        condition: '<=',
        values: { value: cl === '17' ? lastWorkDay : onDate }
      }
      whereList.dateTo = {
        expression: '[dateTo]',
        condition: '>=',
        values: { value: cl === '17' ? lastWorkDay : onDate }
      }
    } else if (pg === '2') {
      /* фільтрація по макс. даті dateTo перенесена в фільтр на afterInit */
      if (['15', '16', '17', '18'].includes(cl)) {
        whereList.empDateFrom = {
          expression: '[employeeNumberID.dateTo]',
          condition: '>=',
          values: { value: perDates.dateFrom }
        }
        whereList.empDateTo = {
          expression: '[employeeNumberID.dateTo]',
          condition: '<=',
          values: { value: perDates.dateTo }
        }
      } else {
        /* UBHR-8456, враховуються переміщення, унікальність забезпечується потім фільтром filter.maxDateTo = ... */
        /* whereList.empDateFrom = {
          expression: '[employeeNumberID.dateFrom]',
          condition: '>=',
          values: { value: perDates.dateFrom }
        } */
        whereList.empDateTo = {
          expression: '[employeeNumberID.dateFrom]',
          condition: '<=',
          values: { value: perDates.dateTo }
        }
      }
    }
    let addCond = addConditions.pages[pg].rows[rw].cols[cl]
    if (addCond && addCond.length) {
      for (let i = 0; i < addCond.length; i++) {
        let condName = 'colCond' + i
        whereList[condName] = addCond[i]
      }
    }
    let fieldList = [
      { name: 'positionID.name', description: UB.i18n('Посада'), config: { width: 250 } },
      { name: 'positionID.parentUnitID.name', description: UB.i18n('Підпордкування'), config: { width: 250 } },
      { name: 'employeeID.fullFIO', description: UB.i18n('Працівник'), config: { width: 250 } },
      { name: 'employeeNumberID.dateFrom', description: UB.i18n('З'), config: { align: 'center' } },
      { name: 'employeeNumberID.dateToEmpty', description: UB.i18n('По'), config: { align: 'center' } },
      { name: 'dateFrom', visibility: false },
      { name: 'dateTo', visibility: false },
      /* employeeNumberID.ID замість employeeNumberID, щоб фільтр гріда фільтрував 'employeeNumberID.dateFrom, dateTo', як дату, а не як сутність */
      { name: 'employeeNumberID.ID', visibility: false },
      /* employeeID.ID замість employeeID, щоб фільтр гріда фільтрував 'employeeID.fullFIO', як строку, а не сутність (де не буде фільтрації по організації) */
      { name: 'employeeID.ID', visibility: false }
    ]
    if (pg === '2' && ['7', '8', '9', '10', '11', '12', '13', '14'].includes(cl)) {
      fieldList.push({ name: 'orderID', visibility: false, filterable: false })
    }
    let serverFilters = []
    if (pg === '1' && ['13', '14', '15', '16', '17'].includes(cl)) {
      serverFilters.push({
        data: timeSheetData,
        value: {
          employeeNumberID: {
            dataFields: ['employeeNumberID.ID'],
            filterFields: ['employeeNumberID'],
            condition: {
              'factTimeCostID.code': {
                value: mobAndPregnantEls,
                isOposite: true
              }
            },
            addIfNotFound: true
          }
        }
      })
    } else if (pg === '2') {
      if (['15', '16', '17', '18'].includes(cl)) {
        serverFilters.push({
          data: uempDismData,
          value: {
            employeeNumberID: {
              dataFields: ['employeeNumberID.ID'],
              filterFields: ['employeeNumberID'],
              condition: {
                dateFrom: {
                  value: 'self.dateFrom'
                }
              },
              addIfNotFound: false
            }
          }
        })
      } else {
        serverFilters.push({
          data: uempAcceptData,
          value: {
            employeeNumberID: {
              dataFields: ['employeeNumberID.ID'],
              filterFields: ['employeeNumberID'],
              condition: {
                dateFrom: {
                  value: 'self.dateFrom'
                }
              },
              addIfNotFound: false
            }
          }
        })
      }
      if (['7', '8', '9', '10', '11', '12', '13', '14'].includes(cl)) {
        serverFilters.push({
          data: empAppointData,
          value: {
            employeeID: {
              dataFields: ['employeeID.ID', 'orderID'],
              filterFields: ['employeeID', 'orderID'],
              condition: {
                type: {
                  value: ['7', '8', '9', '10'].includes(cl) ? 'CONTEST' : 'MOVING'
                }
              },
              addIfNotFound: false
            }
          }
        })
      }
    }
    $App.doCommand({
      cmdType: 'showList',
      isModal: true,
      description: windowTitle,
      cmpInitConfig: {
        dfm: {
          size: {
            width: 1000,
            height: 500
          }
        },
        onItemDblClick: function (grid, record) {
          $App.doCommand({
            cmdType: 'showForm',
            formCode: 'hr_employee',
            entity: 'hr_employee',
            instanceID: record.get('employeeID.ID'),
            cmpInitConfig: {
              employeeNumberID: record.get('employeeNumberID.ID')
            }
          })
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {
        params: [{
          entity: 'hr_employeePositionS',
          method: 'selectPosGroups',
          fieldList: fieldList,
          __mip_ondate: onDate,
          whereList: whereList,
          joinAs: joinAs,
          orderList: {
            posName: {
              expression: '[positionID.name]',
              order: 'asc'
            }
          },
          orgIDs: orgIDList,
          filters: JSON.stringify(serverFilters)
        }]
      }
    })
  }
}

function getOnDate (ctrl) {
  const form = ctrl.up('form')
  const year = form.down('[name=year]')
  const quarter = form.down('[name=quarter]')
  return AC.dateService.firstDayAfterQuarter(year.getValue(), quarter.getValue())
}

function yearChange (ctrl) {
  const form = ctrl.up('form')
  if (form.isInternalChange) {
    return
  }
  form.isInternalChange = true
  try {
    const onDate = form.down('[name=onDate]')
    onDate.setValue(getOnDate(ctrl))
  } finally {
    form.isInternalChange = false
  }
}

function quarterChange (ctrl) {
  const form = ctrl.up('form')
  if (form.isInternalChange) {
    return
  }
  form.isInternalChange = true
  try {
    const onDate = form.down('[name=onDate]')
    onDate.setValue(getOnDate(ctrl))
  } finally {
    form.isInternalChange = false
  }
}

function countData (itmData, func) {
  let cnt = 0
  itmData.forEach(itm => {
    cnt += func(itm)
  })
  return cnt
}

function getVacQuantity (posData, empPosData, posID) {
  let res = 0
  const posItem = _.find(posData, { mi_data_id: posID })
  if (posItem) {
    let posQuantity = posItem.quantity
    let empPosQuantity = 0
    const empPosItems = empPosData.filter(itm => itm.positionID === posID)
    empPosItems.forEach(itm => {
      empPosQuantity += itm.mtCount
    })
    if (posQuantity && posQuantity > empPosQuantity) {
      res = posQuantity - empPosQuantity
    }
  }
  return res
}

function getEmpPosCount (empCntData, posID) {
  let res = 0
  const empCntItems = empCntData.filter(itm => itm.positionID === posID)
  res += empCntItems.length
  return res
}

function getEmpPosAppointKindCount (empCntData, posID, empAppointData, appointKind) {
  let res = 0
  const empCntItems = empCntData.filter(itm => itm.positionID === posID)
  empCntItems.forEach(itm => {
    let appointData = _.find(empAppointData, { orderID: itm.orderID, employeeID: itm.employeeID, type: appointKind })
    if (appointData) {
      res++
    }
  })
  return res
}

function exportToXLSX () {
  if (!paramRep) {
    AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Не сформовано звіт'))
    return
  }
  HR.reportUtils.runExcelReport('ksds.xlsx', paramRep)
}
