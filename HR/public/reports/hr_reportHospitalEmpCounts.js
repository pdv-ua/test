/* global Ext $App UB AC HR appAC */
let paramForm
let reportCfg
const рregnantEls = [appAC.langCodei18n('Вваг'), appAC.langCodei18n('В3дит'), appAC.langCodei18n('Вдит')]
const firstDataCol = 1
const lastDataCol = 12
const highEduLevel = '1'
const middleEduLevel = '2'

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const orgID = reportParams.orgID
    const onDate = reportParams.onDate
    const onDateStr = AC.dateService.formatDate(onDate)
    const orgData = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_ondate: onDate })
      .selectSingle()
    const orgNameGen = (orgData && (orgData.nameGen || orgData.name)) || UB.i18n('ЛІКАРНІ')
    const empAcceptDataPromise = UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'employeeNumberID', 'positionID', 'dictStaffCatID', 'positionID.dictStaffCatID', 'positionID.dictStaffSubCatID',
        'workPlace', 'departmentID.mi_treePath'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('employeeNumberID.dateFrom', '<=', onDate)
      .where('employeeNumberID.dateTo', '>=', onDate)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('workPlace', 'in', ['1', '3']) // Основне місце роботи або зовнішній сумісник
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('departmentID.mi_dateFrom', '<=', onDate)
      .where('departmentID.mi_dateTo', '>=', onDate)
      .where('departmentID.state', '=', 'ACTIVE')
      .where('departmentID.mi_deleteDate', '>=', '#maxdate')
    const empAcceptData = await empAcceptDataPromise.selectAsObject({
      'positionID.dictStaffCatID': 'posStaffCatID',
      'positionID.dictStaffSubCatID': 'dictStaffSubCatID',
      'departmentID.mi_treePath': 'depPath'
    })
    const pregData = await UB.Repository('tim_timeSheet')
      .attrs(['employeeNumberID'])
      .where('dateWork', '=', onDate)
      .where('isActive', '=', true)
      .where('mi_deleteDate', '>=', '#maxdate')
      .where('factTimeCostID.code', 'in', рregnantEls)
      .where('factTimeCostID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()
    const sickData = await UB.Repository('hr_empOrderSickness')
      .attrs(['employeeNumberID'])
      .where('organizationID', '=', orgID)
      .where('illnessReasonID.payElFSSUID.methodID.code', '=', '20') // Лікарняний по вагітності за рахунок СС
      .where('orderState', '!=', 'PROJECT')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()
    const setupData = await UB.Repository('hr_repSetElement')
      .attrs(['repSetParamID.code', 'elementID'])
      .where('repSetParamID.code', 'like', 'KS%')
      .where('dateFromNotEmpty', '<=', onDate)
      .where('dateToNotEmpty', '>=', onDate)
      .where('repSetParamID.dateFrom', '<=', onDate)
      .where('repSetParamID.dateTo', '>=', onDate)
      .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'repSetParamID.code': 'code'
      })
    const eduData = await UB.Repository('hr_employeeEducation')
      .attrs(['employeeID', 'dictEducationLevelID.educationType'])
      .where('dictEducationLevelID.educationType', 'in', [highEduLevel, middleEduLevel])
      .exists(empAcceptDataPromise.correlation('employeeID', 'employeeID'))
      .selectAsObject({
        'dictEducationLevelID.educationType': 'educationType'
      })
    reportCfg = {
      KSR1: { code: 'KSR1', caption: UB.i18n('Лікарі'), level: 1, elmIds: [], empPosIDs: getEmpPosIDs() },
      KSR2: { code: 'KSR2', caption: UB.i18n('Середній медичний персонал'), level: 1, elmIds: [], empPosIDs: getEmpPosIDs() },
      KSR3: { code: 'KSR3', caption: UB.i18n('Молодший медичний персонал'), level: 1, elmIds: [], empPosIDs: getEmpPosIDs() },
      KSR4: { code: 'KSR4', caption: UB.i18n('Інші, в тому числі'), level: 1, elmIds: [], rows2: [], empPosIDs: getEmpPosIDs() },
      KSR41: { code: 'KSR41', caption: UB.i18n('сестри-господині'), level: 2, elmIds: [], empPosIDs: getEmpPosIDs() },
      KSR42: { code: 'KSR42', caption: UB.i18n('АГЧ'), level: 2, elmIds: [], empPosIDs: getEmpPosIDs() },
      KSR43: { code: 'KSR43', caption: UB.i18n('спеціалісти з вищою немедичною освітою в т.ч.'), level: 2, elmIds: [], rows3: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR431: { code: 'KSR431', caption: UB.i18n('психолог'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR432: { code: 'KSR432', caption: UB.i18n('біолог'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR433: { code: 'KSR433', caption: UB.i18n('логопед'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR434: { code: 'KSR434', caption: UB.i18n('вихователь'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR435: { code: 'KSR435', caption: UB.i18n('вчитель'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR436: { code: 'KSR436', caption: UB.i18n('провізор'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR439: { code: 'KSR439', caption: UB.i18n('соц. працівник'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR437: { code: 'KSR437', caption: UB.i18n('фахівець з фіз. реабілітації'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR438: { code: 'KSR438', caption: UB.i18n('інструктор-методист'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: highEduLevel },
      KSR44: { code: 'KSR44', caption: UB.i18n('спеціалісти з середньою немедичною освітою в т.ч.'), level: 2, elmIds: [], rows3: [], empPosIDs: getEmpPosIDs(), eduLevel: middleEduLevel },
      KSR441: { code: 'KSR441', caption: UB.i18n('вихователь'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: middleEduLevel },
      KSR442: { code: 'KSR442', caption: UB.i18n('соц. працівник'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: middleEduLevel },
      KSR443: { code: 'KSR443', caption: UB.i18n('фахівець з фіз. реабілітації'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: middleEduLevel },
      KSR444: { code: 'KSR444', caption: UB.i18n('фармацевт'), level: 3, elmIds: [], empPosIDs: getEmpPosIDs(), eduLevel: middleEduLevel },
      KSR45: { code: 'KSR45', caption: UB.i18n('медреєстратори'), level: 2, elmIds: [], empPosIDs: getEmpPosIDs() },
      KSR46: { code: 'KSR46', caption: UB.i18n('дезінфектори'), level: 2, elmIds: [], empPosIDs: getEmpPosIDs() },
      KSC1: { elmIds: [] },
      KSC2: { elmIds: [] },
      totals: { code: 'totals', caption: UB.i18n('ВСЬОГО'), empPosIDs: getEmpPosIDs() },
      onDateStr: onDateStr,
      orgNameGen: orgNameGen
    }
    setupData.forEach(setupRow => {
      if (reportCfg[setupRow.code]) {
        reportCfg[setupRow.code].elmIds.push(setupRow.elementID)
      }
    })
    const result = {
      orgID: orgID,
      onDate: onDate.toString(),
      onDateStr: onDateStr,
      orgNameGen: orgNameGen,
      rows1: [],
      totals: undefined
    }
    result.rows1.push(reportCfg.KSR1)
    result.rows1.push(reportCfg.KSR2)
    result.rows1.push(reportCfg.KSR3)
    result.rows1.push(reportCfg.KSR4)
    reportCfg.KSR4.rows2.push(reportCfg.KSR41)
    reportCfg.KSR4.rows2.push(reportCfg.KSR42)
    reportCfg.KSR4.rows2.push(reportCfg.KSR43)
    reportCfg.KSR43.rows3.push(reportCfg.KSR431)
    reportCfg.KSR43.rows3.push(reportCfg.KSR432)
    reportCfg.KSR43.rows3.push(reportCfg.KSR433)
    reportCfg.KSR43.rows3.push(reportCfg.KSR434)
    reportCfg.KSR43.rows3.push(reportCfg.KSR435)
    reportCfg.KSR43.rows3.push(reportCfg.KSR436)
    reportCfg.KSR43.rows3.push(reportCfg.KSR439)
    reportCfg.KSR43.rows3.push(reportCfg.KSR437)
    reportCfg.KSR43.rows3.push(reportCfg.KSR438)
    reportCfg.KSR4.rows2.push(reportCfg.KSR44)
    reportCfg.KSR44.rows3.push(reportCfg.KSR441)
    reportCfg.KSR44.rows3.push(reportCfg.KSR442)
    reportCfg.KSR44.rows3.push(reportCfg.KSR443)
    reportCfg.KSR44.rows3.push(reportCfg.KSR444)
    reportCfg.KSR4.rows2.push(reportCfg.KSR45)
    reportCfg.KSR4.rows2.push(reportCfg.KSR46)
    /* Ініціалізація всіх даних нулями */
    initData(result.rows1)
    initData(reportCfg.KSR4.rows2)
    initData(reportCfg.KSR43.rows3)
    initData(reportCfg.KSR44.rows3)
    /* Заповнення даними об'єкту reportCfg */
    empAcceptData.forEach(empAcceptItem => {
      let isBaseJob = empAcceptItem.workPlace === '1'
      let isCombineJob = empAcceptItem.workPlace === '3'
      let dictStaffCatID = empAcceptItem.dictStaffCatID || empAcceptItem.posStaffCatID
      let isPreg = !!pregData.find(pregItem => pregItem.employeeNumberID === empAcceptItem.employeeNumberID)
      if (!isPreg) {
        isPreg = !!sickData.find(sickItem => sickItem.employeeNumberID === empAcceptItem.employeeNumberID)
      }
      let isCol1 = !!reportCfg.KSC1.elmIds.find(id => empAcceptItem.depPath && empAcceptItem.depPath.includes(id))
      let isCol2 = !!reportCfg.KSC2.elmIds.find(id => empAcceptItem.depPath && empAcceptItem.depPath.includes(id))
      Object.keys(reportCfg).forEach(rowCode => {
        let rowObj = reportCfg[rowCode]
        if (rowObj.level === 1) {
          if (rowObj.elmIds.includes(dictStaffCatID)) {
            setData(rowObj, isBaseJob, isCombineJob, isPreg, isCol1, isCol2, empAcceptItem.ID, empAcceptItem.employeeID, eduData)
          }
        } else if ([2, 3].includes(rowObj.level)) {
          if (dictStaffCatID && empAcceptItem.dictStaffSubCatID && !reportCfg.KSR1.elmIds.includes(dictStaffCatID) &&
            !reportCfg.KSR2.elmIds.includes(dictStaffCatID) && !reportCfg.KSR3.elmIds.includes(dictStaffCatID)) {
            if (rowObj.elmIds.includes(empAcceptItem.dictStaffSubCatID)) {
              setData(rowObj, isBaseJob, isCombineJob, isPreg, isCol1, isCol2, empAcceptItem.ID, empAcceptItem.employeeID, eduData)
            } else {
              if (rowObj.level === 2) {
                let existedRow = Object.keys(reportCfg).find(repKey => ['KSR41', 'KSR43', 'KSR44', 'KSR45', 'KSR46'].includes(repKey.substring(0, 5)) &&
                  reportCfg[repKey].elmIds.includes(empAcceptItem.dictStaffSubCatID))
                !existedRow && setData(reportCfg.KSR42, isBaseJob, isCombineJob, isPreg, isCol1, isCol2, empAcceptItem.ID, empAcceptItem.employeeID, eduData)
              }
            }
          }
        }
      })
    })
    /* формули по колонкам */
    for (let i = firstDataCol; i <= lastDataCol; i++) {
      let dataKey = 'data' + i
      reportCfg.KSR43[dataKey] = AC.currencyService.round(reportCfg.KSR431[dataKey] + reportCfg.KSR432[dataKey] + reportCfg.KSR433[dataKey] +
        reportCfg.KSR434[dataKey] + reportCfg.KSR435[dataKey] + reportCfg.KSR436[dataKey] +
        reportCfg.KSR437[dataKey] + reportCfg.KSR438[dataKey] + reportCfg.KSR439[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR431.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR432.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR433.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR434.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR435.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR436.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR437.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR438.empPosIDs[dataKey])
      reportCfg.KSR43.empPosIDs[dataKey].push(...reportCfg.KSR439.empPosIDs[dataKey])
      reportCfg.KSR44[dataKey] = AC.currencyService.round(reportCfg.KSR441[dataKey] + reportCfg.KSR442[dataKey] + reportCfg.KSR443[dataKey] +
        reportCfg.KSR444[dataKey])
      reportCfg.KSR44.empPosIDs[dataKey].push(...reportCfg.KSR441.empPosIDs[dataKey])
      reportCfg.KSR44.empPosIDs[dataKey].push(...reportCfg.KSR442.empPosIDs[dataKey])
      reportCfg.KSR44.empPosIDs[dataKey].push(...reportCfg.KSR443.empPosIDs[dataKey])
      reportCfg.KSR44.empPosIDs[dataKey].push(...reportCfg.KSR444.empPosIDs[dataKey])
      reportCfg.KSR4[dataKey] = AC.currencyService.round(reportCfg.KSR41[dataKey] + reportCfg.KSR42[dataKey] + reportCfg.KSR43[dataKey] +
        reportCfg.KSR44[dataKey] + reportCfg.KSR45[dataKey] + reportCfg.KSR46[dataKey])
      reportCfg.KSR4.empPosIDs[dataKey].push(...reportCfg.KSR41.empPosIDs[dataKey])
      reportCfg.KSR4.empPosIDs[dataKey].push(...reportCfg.KSR42.empPosIDs[dataKey])
      reportCfg.KSR4.empPosIDs[dataKey].push(...reportCfg.KSR43.empPosIDs[dataKey])
      reportCfg.KSR4.empPosIDs[dataKey].push(...reportCfg.KSR44.empPosIDs[dataKey])
      reportCfg.KSR4.empPosIDs[dataKey].push(...reportCfg.KSR45.empPosIDs[dataKey])
      reportCfg.KSR4.empPosIDs[dataKey].push(...reportCfg.KSR46.empPosIDs[dataKey])
    }
    /* формули по рядкам */
    Object.keys(reportCfg).forEach(rowCode => {
      let rowObj = reportCfg[rowCode]
      if ([1, 2, 3].includes(rowObj.level)) {
        rowObj.data3 = AC.currencyService.round(rowObj.data1 + rowObj.data2)
        rowObj.empPosIDs.data3.push(...rowObj.empPosIDs.data1)
        rowObj.empPosIDs.data3.push(...rowObj.empPosIDs.data2)
        rowObj.data6 = AC.currencyService.round(rowObj.data4 + rowObj.data5)
        rowObj.empPosIDs.data6.push(...rowObj.empPosIDs.data4)
        rowObj.empPosIDs.data6.push(...rowObj.empPosIDs.data5)
        rowObj.data7 = AC.currencyService.round(rowObj.data1 + rowObj.data4)
        rowObj.empPosIDs.data7.push(...rowObj.empPosIDs.data1)
        rowObj.empPosIDs.data7.push(...rowObj.empPosIDs.data4)
        rowObj.data8 = AC.currencyService.round(rowObj.data2 + rowObj.data5)
        rowObj.empPosIDs.data8.push(...rowObj.empPosIDs.data2)
        rowObj.empPosIDs.data8.push(...rowObj.empPosIDs.data5)
        rowObj.data9 = AC.currencyService.round(rowObj.data7 + rowObj.data8)
        rowObj.empPosIDs.data9.push(...rowObj.empPosIDs.data7)
        rowObj.empPosIDs.data9.push(...rowObj.empPosIDs.data8)
        rowObj.data12 = AC.currencyService.round(rowObj.data10 + rowObj.data11)
        rowObj.empPosIDs.data12.push(...rowObj.empPosIDs.data10)
        rowObj.empPosIDs.data12.push(...rowObj.empPosIDs.data11)
      }
    })
    /* Підсумки */
    for (let i = firstDataCol; i <= lastDataCol; i++) {
      let dataKey = 'data' + i
      reportCfg.totals[dataKey] = AC.currencyService.round(reportCfg.KSR1[dataKey] + reportCfg.KSR2[dataKey] + reportCfg.KSR3[dataKey] +
        reportCfg.KSR4[dataKey])
      reportCfg.totals.empPosIDs[dataKey].push(...reportCfg.KSR1.empPosIDs[dataKey])
      reportCfg.totals.empPosIDs[dataKey].push(...reportCfg.KSR2.empPosIDs[dataKey])
      reportCfg.totals.empPosIDs[dataKey].push(...reportCfg.KSR3.empPosIDs[dataKey])
      reportCfg.totals.empPosIDs[dataKey].push(...reportCfg.KSR4.empPosIDs[dataKey])
    }
    result.totals = reportCfg.totals
    return result
  },
  onReportClick: function (e) {
    drillDown(e.target.dataset['orgid'], e.target.dataset['ondate'], e.target.dataset['row'], e.target.dataset['col'])
    e.preventDefault()
  },
  onParamPanelConfig: function () {
    paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            HR.controlService.getOrgCombo({
              labelWidth: 120,
              disableContextMenu: true,
              readOnly: true
            }),
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  fieldLabel: UB.i18n('Станом на'),
                  allowBlank: false,
                  labelWidth: 120,
                  width: 240,
                  listeners: {
                    afterrender: function (crtl) {
                      let onDate = AC.dateService.firstDayOfMonth(appAC.globalApplicationDate())
                      crtl.setValue(onDate)
                      let reportViewer = crtl.up('form').ownerCt
                      reportViewer.exportToXLSX = exportToXLSX
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
          onDate: AC.dateService.shiftDate(frm.findField('onDate').getValue() || AC.dateService.todayDate())
        }
      }
    })
    return paramForm
  }
}

function drillDown (orgID, onDate, rowCode, colCode) {
  onDate = AC.dateService.shiftDate(onDate)
  let empPosIDs = reportCfg[rowCode].empPosIDs['data' + colCode]
  if (empPosIDs.length === 0) {
    empPosIDs.push(0)
  }
  $App.doCommand({
    cmdType: 'showList',
    isModal: true,
    description: UB.i18n('Кількісний склад організації'),
    cmpInitConfig: {
      dfm: {
        size: {
          width: 900,
          height: 500
        }
      },
      onItemDblClick: function (grid, record) {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_employee',
          entity: 'hr_employee',
          instanceID: record.get('employeeID'),
          cmpInitConfig: {
            employeeNumberID: record.get('employeeNumberID')
          }
        })
      }
    },
    hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
    cmdData: {
      params: [{
        entity: 'hr_employeePositionS',
        method: 'select',
        fieldList: [
          { name: 'employeeNumberID.tabNum', description: UB.i18n('Таб. №'), config: { width: 100 } },
          { name: 'description', description: UB.i18n('ПІБ, посада, підрозділ') },
          // { name: 'mtCount', config: { width: 100, align: 'center' }, format: '0.0' },
          { name: 'employeeNumberID', visibility: false },
          { name: 'employeeID', visibility: false }
        ],
        whereList: {
          ID: {
            expression: '[ID]',
            condition: 'in',
            value: empPosIDs
          }
        },
        orderList: {
          description: {
            expression: '[description]',
            order: 'asc'
          }
        }
      }]
    }
  })
}

function initData (data) {
  data.forEach(dataItem => {
    for (let i = firstDataCol; i <= lastDataCol; i++) {
      dataItem['data' + i] = 0
    }
  })
}

function getEmpPosIDs () {
  const res = {}
  for (let i = firstDataCol; i <= lastDataCol; i++) {
    res['data' + i] = []
  }
  return res
}

function setData (dataObj, isBaseJob, isCombineJob, isPreg, isCol1, isCol2, empPosID, employeeID, eduData) {
  function setDataKey (dataKey) {
    if (!dataObj.empPosIDs[dataKey].includes(empPosID)) {
      let toAdd = true
      if (dataObj.eduLevel) {
        let eduItem = eduData.find(itm => itm.employeeID === employeeID && itm.educationType === dataObj.eduLevel)
        toAdd = !!eduItem
      }
      if (toAdd) {
        dataObj[dataKey]++
        dataObj.empPosIDs[dataKey].push(empPosID)
      }
    }
  }

  if (isBaseJob) {
    isCol1 && setDataKey('data1')
    isCol2 && setDataKey('data2')
  }
  if (isCombineJob) {
    isCol1 && setDataKey('data4')
    isCol2 && setDataKey('data5')
  }
  if (isPreg) {
    isCol1 && setDataKey('data10')
    isCol2 && setDataKey('data11')
  }
}

function exportToXLSX () {
  if (!reportCfg) {
    AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Не сформовано звіт'))
    return
  }
  HR.reportUtils.runExcelReport('hospitalEmpCounts.xlsx', { page0: reportCfg })
}
