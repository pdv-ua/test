/* global Ext _ $App UB AC HR appAC */
const reportCode = 'f20nm'
const paramCodePrefix = 'F20NM'
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
    const empAcceptData = await UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'positionID.dictPositionID'])
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
      .selectAsObject({
        'positionID.dictPositionID': 'dictPositionID'
      })
    const colNums = ['1', '2', '3']
    const colCodePrefix = paramCodePrefix + 'C'
    const colCodes = colNums.map(code => colCodePrefix + code)
    const setParams = await UB.Repository('hr_repSetParam')
      .attrs(['ID', 'code', 'name', 'reportNumStr'])
      .where('dictStReportID.code', '=', reportCode)
      .where('code', 'like', paramCodePrefix + '%')
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .orderBy('codePadded')
      .selectAsObject()
    const setElements = await UB.Repository('hr_repSetElement')
      .attrs(['repSetParamID', 'elementID'])
      .where('repSetParamID.dictStReportID.code', '=', reportCode)
      .where('repSetParamID.code', 'in', colCodes)
      .where('dateFromNotEmpty', '<=', onDate)
      .where('dateToNotEmpty', '>=', onDate)
      .where('repSetParamID.dateFrom', '<=', onDate)
      .where('repSetParamID.dateTo', '>=', onDate)
      .where('repSetParamID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    function addElmIds (paramObj) {
      let elements = setElements.filter(elm => elm.repSetParamID === paramObj.ID)
      elements.forEach(elm => {
        paramObj.elmIds.push(elm.elementID)
      })
    }

    reportCfg = {}
    setParams.forEach(elm => {
      let colCode = elm.code
      let paramObj = {
        ID: elm.ID,
        code: colCode,
        caption: elm.name,
        rowNum: elm.reportNumStr,
        isRow: false,
        dataID: dataPrefix + elm.reportNumStr,
        elmIds: []
      }
      addElmIds(paramObj)
      reportCfg[colCode] = paramObj
    })
    reportCols = _.filter(reportCfg, paramObj => !paramObj.isRow)
    reportCfg[colCodePrefix + 'R1'] = {
      code: colCodePrefix + 'R1',
      caption: UB.i18n('Кількість фізичних осіб'),
      rowNum: '1',
      isRow: true,
      elmIds: [],
      empPosIDs: getEmpPosIDs()
    }
    const reportRows = _.filter(reportCfg, paramObj => paramObj.isRow)
    addElmIds(reportRows[0])
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
        setData(row, empAcceptItem)
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
    description: UB.i18n('Форма 20. Кількість фізичних осіб спеціалістів з вищою немедичною освітою - основних працівників'),
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
    if (col.elmIds.includes(dataItem.dictPositionID)) {
      row[col.dataID]++
      row.empPosIDs[col.dataID].push(dataItem.ID)
    }
  })
}
