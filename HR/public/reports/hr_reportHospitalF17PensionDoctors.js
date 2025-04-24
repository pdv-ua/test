/* global Ext _ $App UB AC HR appAC */
const reportCode = 'f17l'
const paramCodePrefix = 'F17D'
const dataPrefix = 'data'
const printDataPrefix = 'pdata'
let paramForm
let reportCfg
let reportCols

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
    const onDateTimeStr = AC.dateService.formatDate(Date.now(), 'dd.mm.yyyy hh:nn:ss')
    const orgName = await UB.Repository('hr_organization')
      .attrs(['fullName'])
      .where('mi_data_id', '=', orgID)
      .misc({ __mip_ondate: onDate })
      .selectScalar()
    const pensionAge = await UB.Repository('hr_dictPensionAge')
      .attrs(['years', 'months', 'sexType'])
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .selectAsObject()
    const malePensAgeRow = pensionAge.length && pensionAge.find(pensItem => pensItem.sexType === 'M')
    const malePensAgeYears = (malePensAgeRow && malePensAgeRow.years) || 60
    const malePensAgeMonths = ((malePensAgeRow && malePensAgeRow.months) || 0) + malePensAgeYears * 12
    const femalePensAgeRow = pensionAge.length && pensionAge.find(pensItem => pensItem.sexType === 'W')
    const femalePensAgeYears = (femalePensAgeRow && femalePensAgeRow.years) || 59
    const femalePensAgeMonths = ((femalePensAgeRow && femalePensAgeRow.months) || 6) + femalePensAgeYears * 12
    const anyonePensAgeMonths = Math.min(malePensAgeMonths, femalePensAgeMonths)
    let empAcceptData = await UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'positionID.dictPositionID', 'employeeID.sexType', 'employeeID.birthDate'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('workPlace', '=', '1') // основне місце роботи
      .where('employeeNumberID.dateFrom', '<=', onDate)
      .where('employeeNumberID.dateTo', '>=', onDate)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .where('positionID.mi_dateFrom', '<=', onDate)
      .where('positionID.mi_dateTo', '>=', onDate)
      .where('positionID.state', '=', 'ACTIVE')
      .where('positionID.mi_deleteDate', '>=', '#maxdate')
      .where('employeeID.birthDate', 'isNotNull')
      .selectAsObject({
        'positionID.dictPositionID': 'dictPositionID',
        'employeeID.sexType': 'sexType',
        'employeeID.birthDate': 'birthDate'
      })
    empAcceptData = empAcceptData.filter(eaItem => {
      let ageMonths = AC.dateService.monthDiff(eaItem.birthDate, onDate, true)
      return (eaItem.sexType === 'M' && ageMonths >= malePensAgeMonths) || (eaItem.sexType === 'W' && ageMonths >= femalePensAgeMonths) || (ageMonths >= anyonePensAgeMonths)
    })
    let row1Codes = ['4', '6', '8', '10', '11', '12', '13', '15', '17', '19', '21', '23', '24', '25', '26', '27', '29',
      '30', '31', '33', '35', '37', '39', '40', '41', '42', '44', '45', '46', '47', '48', '50', '51', '52', '53', '55',
      '57', '58', '59', '60', '62', '64', '66', '68', '70', '71', '72', '73', '75', '77', '78', '79', '81', '82', '84',
      '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98'
    ]
    const rowCodePrefix = paramCodePrefix + 'R'
    row1Codes = row1Codes.map(code => rowCodePrefix + code)
    const setElements = await UB.Repository('hr_repSetElement')
      .attrs(['elementID'])
      .where('repSetParamID.dictStReportID.code', '=', reportCode)
      .where('repSetParamID.code', 'in', row1Codes)
      .where('dateFromNotEmpty', '<=', onDate)
      .where('dateToNotEmpty', '>=', onDate)
      .where('repSetParamID.dateFrom', '<=', onDate)
      .where('repSetParamID.dateTo', '>=', onDate)
      .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    function addElmIds (paramObj) {
      setElements.forEach(elm => {
        paramObj.elmIds.push(elm.elementID)
      })
    }

    reportCols = [{
      code: paramCodePrefix + 'C1',
      rowNum: '1',
      isRow: false,
      dataID: dataPrefix + '1',
      elmIds: []
    }]
    reportCfg = {
      [paramCodePrefix + 'C1']: reportCols[0],
      [paramCodePrefix + 'R1']: {
        code: paramCodePrefix + 'R1',
        caption: UB.i18n('Із загальної кількості лікарів осіб пенсійного віку'),
        rowNum: '1',
        isRow: true,
        elmIds: [],
        empPosIDs: getEmpPosIDs()
      },
      [paramCodePrefix + 'R2']: {
        code: paramCodePrefix + 'R2',
        caption: UB.i18n('Із загальної кількості лікарів, що працюють у сільській місцевості'),
        rowNum: '2',
        isRow: true,
        elmIds: [],
        empPosIDs: getEmpPosIDs()
      }
    }
    const reportRows = _.filter(reportCfg, paramObj => paramObj.isRow)
    addElmIds(reportRows[0])
    const emptyRowCodes = ['2']
    const result = {
      orgID: orgID,
      orgName: orgName,
      onDate: onDateStr,
      onDateTime: onDateTimeStr,
      rows: reportRows
    }
    initData(result.rows)
    /* Заповнення даними об'єкту reportCfg */
    empAcceptData.forEach(empAcceptItem => {
      reportRows.forEach(row => {
        if (!emptyRowCodes.includes(row.rowNum) && row.elmIds.includes(empAcceptItem.dictPositionID)) {
          setData(row, empAcceptItem)
        }
      })
    })
    /* Заповнення даних для звіту */
    reportRows.forEach(row => {
      reportCols.forEach(col => {
        let dataVal = row[col.dataID]
        row[printDataPrefix + col.rowNum] = dataVal && dataVal > 0 ? dataVal : ''
      })
    })
    return result
  },
  onReportClick: function (e) {
    drillDown(e.target.dataset['row'], e.target.dataset['col'])
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
            HR.controlService.getOrgCombo(),
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
                      crtl.setValue(appAC.globalApplicationDate())
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

function drillDown (rowCode, colCode) {
  let row = reportCfg[rowCode]
  let empPosIDs = row.empPosIDs[dataPrefix + colCode]
  if (empPosIDs.length === 0) {
    empPosIDs.push(0)
  }
  $App.doCommand({
    cmdType: 'showList',
    isModal: true,
    description: UB.i18n('Форма 17. Лікарі'),
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
          { name: 'description', description: UB.i18n('ПІБ, посада, підрозділ'), config: { width: 500 } },
          { name: 'mtCount', description: UB.i18n('Кільк. ставок'), config: { width: 100, align: 'center' }, format: '0.0' },
          { name: 'employeeID.sexType', description: UB.i18n('Стать'), config: { width: 100, align: 'center' } },
          { name: 'employeeID.age', description: UB.i18n('Вік'), config: { width: 80, align: 'center' } },
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

function initData (data, defValue = 0) {
  data.forEach(dataItem => {
    reportCols.forEach(col => {
      dataItem[col.dataID] = defValue
    })
  })
}

function getEmpPosIDs () {
  const res = {}
  reportCols.forEach(col => {
    res[col.dataID] = []
  })
  return res
}

function setData (row, dataItem) {
  reportCols.forEach(col => {
    row[col.dataID]++
    row.empPosIDs[col.dataID].push(dataItem.ID)
    row.sexType = dataItem.sexType
  })
}
