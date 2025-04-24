/* global Ext _ $App UB AC HR appAC */
const dataPrefix = 'data'
const printDataPrefix = 'pdata'
const reportCode = 'f20s'
const paramCodePrefix = 'F20S'
let paramForm
let reportCfg
let reportCols
let onDate

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
    const posData = await UB.Repository('hr_position')
      .attrs(['mi_data_id', 'quantity', 'dictPositionID', 'mi_treePath'])
      .where('orgID', '=', orgID)
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .where('state', '=', 'ACTIVE')
      .selectAsObject()
    const empAcceptData = await UB.Repository('hr_employeePositionS')
      .attrs(['ID', 'employeeID', 'positionID', 'mtCount', 'departmentID.mi_treePath'])
      .where('isActive', '=', true)
      .where('organizationID', '=', orgID)
      .where('dateFrom', '<=', onDate)
      .where('dateTo', '>=', onDate)
      .where('workPlace', '=', '1') // основне місце роботи
      .where('employeeNumberID.dateFrom', '<=', onDate)
      .where('employeeNumberID.dateTo', '>=', onDate)
      .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('departmentID.state', '=', 'ACTIVE')
      .joinCondition('departmentID.mi_dateFrom', '<=', onDate)
      .joinCondition('departmentID.mi_dateTo', '>=', onDate)
      .joinCondition('departmentID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject({
        'departmentID.mi_treePath': 'depPath'
      })
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
      .where('repSetParamID.code', 'like', paramCodePrefix + '%')
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
    let parentID
    const level1Codes = ['1', '94', '110']
    const emptyRowCodes = ['93']
    const captionLinkCodes = []
    for (let i = 2; i <= 92; i++) {
      captionLinkCodes.push(i.toString())
    }
    for (let i = 95; i <= 100; i++) {
      captionLinkCodes.push(i.toString())
    }
    for (let i = 111; i <= 115; i++) {
      captionLinkCodes.push(i.toString())
    }
    /* Колонки */
    const colCodePrefix = paramCodePrefix + 'C'
    setParams.filter(param => param.code.startsWith(colCodePrefix)).forEach(paramCol => {
      let colCode = paramCol.code
      let paramObj = {
        ID: paramCol.ID,
        code: colCode,
        caption: paramCol.name,
        rowNum: paramCol.reportNumStr,
        isRow: false,
        dataID: dataPrefix + paramCol.reportNumStr,
        elmIds: []
      }
      addElmIds(paramObj)
      reportCfg[colCode] = paramObj
    })
    reportCols = _.filter(reportCfg, paramObj => !paramObj.isRow)
    /* Рядки */
    const rowCodePrefix = paramCodePrefix + 'R'
    setParams.filter(param => param.code.startsWith(rowCodePrefix)).forEach(paramRow => {
      let rowCode = paramRow.code
      let rowNum = paramRow.reportNumStr
      let lvl = level1Codes.includes(rowNum) ? 1 : 2
      let paramObj = {
        ID: paramRow.ID,
        code: rowCode,
        caption: paramRow.name,
        rowNum: rowNum,
        isRow: true,
        level: lvl,
        captionLink: captionLinkCodes.includes(rowNum),
        elmIds: [],
        dataIDs: getDataIDs()
      }
      if (lvl === 1) {
        parentID = paramRow.ID
      } else {
        paramObj.parentID = parentID
      }
      addElmIds(paramObj)
      reportCfg[rowCode] = paramObj
    })
    const reportRows = _.filter(reportCfg, paramObj => paramObj.isRow)
    const reportRows2 = reportRows.filter(paramObj => paramObj.level === 2)
    const result = {
      orgID: orgID,
      orgName: orgName,
      onDate: onDateStr,
      onDateTime: onDateTimeStr
    }
    result.rows1 = reportRows.filter(row => row.level === 1)
    initData(result.rows1)
    result.rows1.forEach(row1 => {
      row1.rows2 = reportRows.filter(row => row.level === 2 && row.parentID === row1.ID)
      initData(row1.rows2)
    })
    /* Заповнення даними об'єкту reportCfg */
    posData.forEach(posItem => {
      reportRows2.forEach(row => {
        if (!emptyRowCodes.includes(row.rowNum) && row.elmIds.includes(posItem.dictPositionID)) {
          let empAcceptItems = empAcceptData.filter(empAcceptItem => empAcceptItem.positionID === posItem.mi_data_id)
          setData(row, posItem, empAcceptItems)
        }
      })
    })
    /* формули по рядкам */
    const row1 = reportCfg[rowCodePrefix + '1']
    initData([row1])
    const row1Codes = ['2', '3', '6', '7', '8', '10', '11', '12', '13', '15', '16', '18', '20', '22', '24', '26', '27',
      '28', '29', '30', '32', '33', '34', '35', '37', '39', '41', '43', '44', '46', '47', '49', '51', '54', '55', '57',
      '59', '61', '63', '64', '66', '67', '68', '69', '70', '72', '74', '75', '76', '77', '79', '80', '82', '83', '84',
      '85', '86', '87', '88', '89', '90', '91'
    ]
    let row1det = reportRows.filter(row => row1Codes.includes(row.rowNum))
    row1det.forEach(row => {
      reportCols.forEach(col => {
        row1[col.dataID] += row[col.dataID]
        row.dataIDs && row1.dataIDs[col.dataID].push(...row.dataIDs[col.dataID])
      })
    })
    const row94 = reportCfg[rowCodePrefix + '94']
    initData([row94])
    let row94Codes = []
    for (let i = 95; i <= 105; i++) {
      row94Codes.push(i.toString())
    }
    let row94det = reportRows.filter(row => row94Codes.includes(row.rowNum))
    row94det.forEach(row => {
      reportCols.forEach(col => {
        row94[col.dataID] += row[col.dataID]
        row.dataIDs && row94.dataIDs[col.dataID].push(...row.dataIDs[col.dataID])
      })
    })
    const row110 = reportCfg[rowCodePrefix + '110']
    initData([row110])
    let row110Codes = ['1']
    for (let i = 92; i <= 94; i++) {
      row110Codes.push(i.toString())
    }
    for (let i = 106; i <= 109; i++) {
      row110Codes.push(i.toString())
    }
    let row110det = reportRows.filter(row => row110Codes.includes(row.rowNum))
    row110det.forEach(row => {
      reportCols.forEach(col => {
        row110[col.dataID] += row[col.dataID]
        row.dataIDs && row110.dataIDs[col.dataID].push(...row.dataIDs[col.dataID])
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
  if (colCode === 'A') {
    let row = reportCfg[rowCode]
    let dictPosIDs = row.elmIds
    if (dictPosIDs.length === 0) {
      dictPosIDs.push(0)
    }
    $App.doCommand({
      cmdType: 'showList',
      isModal: true,
      description: UB.i18n(`Налагодження рядка {0}`, row.rowNum),
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
            formCode: 'hr_dictPosition',
            entity: 'hr_dictPosition',
            instanceID: record.get('ID')
          })
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {
        params: [{
          entity: 'hr_dictPosition',
          method: 'select',
          fieldList: [
            { name: 'code' },
            { name: 'name' },
            { name: 'positionType' },
            { name: 'positionCategory' },
            { name: 'dictStaffCatID' },
            { name: 'dictStaffSubCatID' },
            { name: 'ID', visibility: false }
          ],
          whereList: {
            code: {
              expression: '[ID]',
              condition: 'in',
              value: dictPosIDs
            }
          },
          orderList: {
            posName: {
              expression: '[name]',
              order: 'asc'
            }
          }
        }]
      }
    })
  } else {
    let row = reportCfg[rowCode]
    let dataIDs = row.dataIDs[dataPrefix + colCode]
    if (dataIDs.length === 0) {
      dataIDs.push(0)
    }
    const commandObj = {
      cmdType: 'showList',
      isModal: true,
      description: UB.i18n('Форма 20. Штати закладу на кінець звітного року'),
      cmpInitConfig: {
        dfm: {
          size: {
            width: 1000,
            height: 500
          }
        }
      },
      hideActions: ['addNew', 'addNewByCurrent', 'del', 'edit', 'itemSelect'],
      cmdData: {}
    }
    if (['1', '3'].includes(colCode)) {
      commandObj.cmdData.params = [{
        entity: 'hr_position',
        method: 'select',
        fieldList: [
          { name: 'code', config: { width: 100 } },
          { name: 'name' },
          { name: 'quantity', description: UB.i18n('Кільк. посад'), config: { width: 100, align: 'center' }, format: '0.0' },
          { name: 'positionType' },
          { name: 'positionCategory' },
          { name: 'dictStaffCatID' },
          { name: 'dictStaffSubCatID' },
          { name: 'mi_data_id', visibility: false }
        ],
        whereList: {
          mi_data_id: {
            expression: '[mi_data_id]',
            condition: 'in',
            value: dataIDs
          },
          state: {
            expression: '[state]',
            condition: '=',
            value: 'ACTIVE'
          }
        },
        orderList: {
          name: {
            expression: '[name]',
            order: 'asc'
          }
        },
        __mip_ondate: onDate
      }]
    } else {
      commandObj.cmdData.params = [{
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
            value: dataIDs
          }
        },
        orderList: {
          description: {
            expression: '[description]',
            order: 'asc'
          }
        }
      }]
      commandObj.cmpInitConfig.onItemDblClick = function (grid, record) {
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
    }
    $App.doCommand(commandObj)
  }
}

function initData (data, defValue = 0) {
  data.forEach(dataItem => {
    reportCols.forEach(col => {
      dataItem[col.dataID] = defValue
    })
  })
}

function getDataIDs () {
  const res = {}
  reportCols.forEach(col => {
    res[col.dataID] = []
  })
  return res
}

function setData (row, posItem, empAcceptItems) {
  const col1 = reportCols.find(col => col.rowNum === '1')
  const col2 = reportCols.find(col => col.rowNum === '2')
  const col3 = reportCols.find(col => col.rowNum === '3')
  const col4 = reportCols.find(col => col.rowNum === '4')
  const col5 = reportCols.find(col => col.rowNum === '5')
  let posCount1 = posItem.quantity || 0
  let empPosCount2 = 0
  let posCount3 = (col3 && posItem.mi_treePath && !!col3.elmIds.find(id => posItem.mi_treePath.includes(id))) ? posCount1 : 0
  let empPosCount4 = 0
  let empCount5 = 0
  if (posCount1 > 0) {
    row.dataIDs[col1.dataID].push(posItem.mi_data_id)
  }
  if (posCount3 > 0) {
    row.dataIDs[col3.dataID].push(posItem.mi_data_id)
  }
  empAcceptItems.forEach(empAcceptItem => {
    let mtCount2 = empAcceptItem.mtCount || 0
    if (mtCount2 > 0) {
      empPosCount2 += mtCount2
      row.dataIDs[col2.dataID].push(empAcceptItem.ID)
    }
    let mtCount4 = (col4 && empAcceptItem.depPath && !!col4.elmIds.find(id => empAcceptItem.depPath.includes(id))) ? mtCount2 : 0
    if (mtCount4 > 0) {
      empPosCount4 += mtCount4
      row.dataIDs[col4.dataID].push(empAcceptItem.ID)
    }
    empCount5++
    row.dataIDs[col5.dataID].push(empAcceptItem.ID)
  })
  reportCols.forEach(col => {
    let cnt = 0
    switch (col.rowNum) {
      case '1':
        cnt = posCount1
        break
      case '2':
        cnt = empPosCount2
        break
      case '3':
        cnt = posCount3
        break
      case '4':
        cnt = empPosCount4
        break
      default:
        cnt = empCount5
        break
    }
    if (cnt > 0) {
      row[col.dataID] += cnt
    }
  })
}
