/* global Ext _ UB AC appAC HR $App */
let reportObj

exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    if (reportParams.reportKind === 'tariffing') {
      const orgUnit = await UB.Repository('hr_organization')
        .attrs('name', 'nameGen', 'nameDat')
        .where('mi_data_id', '=', reportParams.orgID)
        .where('state', '=', 'ACTIVE')
        .limit(1)
        .selectSingle()
      if (orgUnit) {
        reportParams.orgName = (orgUnit['nameGen'] || '').trim() || orgUnit['name']
      }
      if (!reportParams.monthsFop) {
        reportParams.monthsFop = 6
      }
    }
    const orgID = reportParams.orgID
    const orgName = reportParams.orgName
    const structDepID = reportParams.structDepID
    const childDepID = reportParams.childDepID
    const onDate = reportParams.onDate
    const onDate4Sql = AC.dateService.shiftDate(onDate)
    const monthsFop = reportParams.monthsFop
    const dictProgClassName = reportParams.dictProgClassName
    const respPositionID = reportParams.respPositionID || 0
    const respPositionNameGen = reportParams.respPositionNameGen
    const respEmpName = reportParams.respEmpName
    const respEmpPositionID = reportParams.respEmpPositionID
    const groupBy = reportParams.groupBy
    const dictFundSourceID = reportParams.dictFundSourceID

    const onYear = onDate.getFullYear()
    const toDate = monthsFop ? AC.dateService.addDays(AC.dateService.addMonths(onDate, monthsFop), -1) : onDate
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(orgID)
    //    const isMed = await HR.reportUtils.isOrgOfBusinessType(orgID, 'med')
    const isMed = !AC.settings.get('hrTariffReportGroupByCategory', orgID)

    const result = {
      data: [],
      signerInfo: [],
      accNames: [],
      accWidths: [],
      yearFundSumHeader1: UB.i18n(`Фонд заробітної плати<br/>на {0} рік`, onYear),
      yearFundSumHeader2: UB.i18n(`з {0} до {1} (грн.)**`, AC.dateService.formatDate(onDate), AC.dateService.formatDate(toDate)),
      chiefPosName: reportParams.respPositionName || '',
      chiefPib: respEmpName,
      orgName: orgName || '',
      structDepName: reportParams.structDepName || '',
      childDepName: reportParams.childDepName || '',
      progClassName: dictProgClassName,
      fundSourceName: reportParams.dictFundSourceName || '',
      year: onYear,
      onDate: onDate,
      onDateStr: AC.dateService.formatDate(onDate),
      toDate: toDate,
      monthsFop: monthsFop,
      roundTo: settingsOrg.roundTo || 'decimal2',
      roundToQuantity: settingsOrg.roundToQuantity || 'decimal2',
      groupBy: groupBy,
      dictFundTypeName: reportParams.dictFundTypeName || '',
      useHourlyPay: AC.settings.get('hrStaffTableUseHourlyPay', orgID)
    }

    const orgIDs = [orgID]
    const depFilter = childDepID || structDepID
    const depIDs = []
    structDepID && depIDs.push(structDepID)
    childDepID && depIDs.push(childDepID)
    let orgStruct
    let catData
    if (!groupBy) {
      orgStruct = UB.Repository('hr_staffUnit')
        .attrs(['ID', 'mi_data_id', 'code', 'parentUnitID', 'idxNum', 'name', 'mi_unityEntity', 'mi_treePath'])
        .where('orgID', '=', orgID)
        .where('liquidate', '=', 0)
        .where('state', '=', 'ACTIVE')
        .where('mi_dateFrom', '<=', onDate4Sql)
        .where('mi_dateTo', '>=', onDate4Sql)
      if (structDepID) {
        orgStruct = orgStruct
          .where('mi_treePath', 'like', `%/${depFilter}/%`, 'treePath')
          .where('mi_data_id', 'in', depIDs, 'IDs')
          .logic('([treePath] OR [IDs])')
      }
      orgStruct = await orgStruct.orderBy('idxNum')
        .selectAsObject()
      if (!orgStruct.length) {
        return result
      }
      const deptData = await HR.reportUtils.getDepartmentTypeNames(orgIDs, onDate4Sql, undefined, ['nameDat', 'positionChiefID'])
      orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
        const deptItem = deptData.find(dItem => dItem.ID === item.ID)
        item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
        item.positionChiefID = deptItem ? deptItem.positionChiefID : undefined
      })
    } else {
      let catIDAlias
      if (groupBy === 1) {
        catIDAlias = 'dictStaffCatID'
      } else {
        catIDAlias = 'dictStaffSubCatID'
      }
      let catNameAlias = `${catIDAlias}.name`
      catData = await UB.Repository('hr_position')
        .attrs([catIDAlias, catNameAlias])
        .where('orgID', '=', orgID)
        .where('liquidate', '=', 0)
        .misc({ __mip_ondate: onDate4Sql })
        .where('state', '=', 'ACTIVE')
        .where(catIDAlias, 'isNotNull')
        .groupBy([catIDAlias, catNameAlias])
        .orderBy(catNameAlias)
        .selectAsObject({ [catIDAlias]: 'ID', [catNameAlias]: 'name' })
    }

    const onlyByTarif = reportParams.reportKind !== 'tariffing'
    const tariffingData = reportParams.reportKind === 'tariffing'
      ? await $App.connection.run({
        entity: 'hr_staffTariffing',
        method: 'getReportData',
        isOrgPlan: true,
        execParams: {
          instanceID: reportParams.instanceID,
          departmentID: childDepID || structDepID,
          dictFundSourceID
        }
      }).then(mParams => {
        return JSON.parse(mParams.resultData)
      })
      : await $App.connection.run({
        entity: 'hr_tariffing',
        method: 'getReportDataFact',
        execParams: {
          orgID,
          structDepID,
          childDepID,
          onDate,
          dictFundSourceID,
          onlyByTarif,
          useHourlyPay: result.useHourlyPay,
          normHour: reportParams.normHour
        }
      }).then(mParams => {
        return JSON.parse(mParams.resultData)
      })
    const posData = tariffingData.posData
    const empPosData = tariffingData.empPosData

    result.minSalarySum = await UB.Repository('hr_dictSalaryMinSize')
      .attrs(['monthValue'])
      .where('[dateFrom]', '<=', onDate4Sql)
      .orderBy('dateFrom', 'desc')
      .limit(1)
      .selectScalar() || 0

    const repParamPref = 'tOrgPayPlanGrp'
    const repCode = '08'
    const payelData = await HR.accrualService.accrualSumGetPayElData(onDate4Sql, repCode)

    /* Надбавки для окладу беруться з налагоджень для звіту "Тарифікація" */
    const basepayData = HR.accrualService.accrualSumInit('tariffing')
    const payelData4Basepay = await HR.accrualService.accrualSumGetPayElData(onDate4Sql, '07')
    await HR.accrualService.accrualSumFill(basepayData, orgID, onDate4Sql, { repCode: '07' })

    const setParamsData = await HR.reportUtils.getSetParams(repCode)
    const accrualData = {}

    for (let i = 0; i < setParamsData.length; i++) {
      let setParamRec = setParamsData[i]
      const codeParam = (setParamRec.code).replace(repParamPref, '').replace(/[0-9]/g, '') || ''
      accrualData['addpayN' + (i + 1)] = {
        useCoef: true, // codeParam === 'M', // только для минимальной суммы
        minPay: codeParam === 'M',
        dezPay: codeParam === 'D',
        code: setParamRec.code,
        baseSumFrom: ['basepay'],
        elms: [],
        payPerm: [],
        posData: [],
        hasData: true,
        getPercentByElmExp: setParamRec.reportNumStr === '6' ? HR.accrualService.getPercentByElmExp : undefined
      }
      result['col' + (i + 1)] = true
      result.accNames.push({ name: setParamRec.name })
      result.accWidths.push({ name: '' })
    }

    result.addpayCount = setParamsData.length
    result.colCount = result.addpayCount + 8 + (result.useHourlyPay ? 1 : 0)
    result.widthTable = 1010 + (result.useHourlyPay ? 100 : 0) + result.colCount * 80

    result.add2ColCount = 5
    result.add1ColCount = result.colCount - result.add2ColCount
    result.add3ColCount = result.colCount - 3
    result.add4ColCount = result.colCount - 2

    result.addSColCount = result.colCount - 7

    await HR.accrualService.accrualSumFill(accrualData, orgID, onDate4Sql, { repCode })

    function getNullName (size) {
      const objArray = []
      for (let i = 0; i < size; i++) {
        objArray.push({ name: '' })
      }
      return objArray
    }
    const signerChief = await HR.reportUtils.getRefSignerInfo(orgID, onDate4Sql)
    let respPosPrefix = (respEmpPositionID !== respPositionID) ? UB.i18n('В.о. ') : ''
    let respPosName = (respPosPrefix.length > 0) ? respPositionNameGen || result.chiefPosName : result.chiefPosName

    result.signerInfo.push({
      pos: (respPositionID ? respPosPrefix + respPosName : (signerChief && signerChief['positionID.name'])) || '',
      name: respEmpName || '',
      signerEmpty: getNullName(result.addSColCount),
      fullEmpty: getNullName(result.colCount)
    })

    const roles = ['accChief', 'signerFinManager', 'signer4EmpOrder']
    for (let i = 0; i < roles.length; i++) {
      const signerWithRole = await HR.reportUtils.getRefSignerInfo(orgID, onDate4Sql, undefined, undefined, roles[i])
      result.signerInfo.push({
        pos: signerWithRole ? signerWithRole['positionID.name'] || '' : '',
        name: signerWithRole ? signerWithRole['employeeID.shortFIO'] || '' : '',
        signerEmpty: getNullName(result.addSColCount),
        fullEmpty: getNullName(result.colCount)
      })
    }

    let tree
    if (!groupBy) {
      tree = me.generateDataForReport({
        rootID: orgID,
        orgStruct,
        posData,
        empPosData,
        accrualData,
        basepayData,
        payelData,
        payelData4Basepay,
        monthsFop,
        onDate,
        depFilter,
        addpayCount: result.addpayCount,
        isMed,
        useHourlyPay: result.useHourlyPay,
        minSalarySum: result.minSalarySum,
        onlyByTarif,
        byStaff: reportParams.byStaff,
        roundTo: result.roundTo,
        roundToQuantity: result.roundToQuantity,
        colCount: result.colCount
      })
    } else {
      tree = [] /* me.generateGrpDataForReport({
        catData,
        groupBy,
        posData,
        empPosData,
        accrualData,
        basepayData,
        payelData,
        payelData4Basepay,
        monthsFop,
        onDate,
        addpayCount: result.addpayCount,
        useHourlyPay: result.useHourlyPay,
        normHour: reportParams.normHour,
        onlyByTarif
      })
      */
    }
    result.data = tree.data || []
    result.quantity = tree.quantity
    result.fundSum1 = AC.currencyService.formatAsCurrencyEx(tree.fundSum1, 2, '.')
    result.fundSum1InWords = AC.currencyService.currencyToWordsUkr(tree.fundSum1)

    let numFields = ['quantity', 'basepay', 'fundSum1', 'fundSum2', 'basepayHour']
    HR.reportUtils.clearZeroes(result, numFields)
    reportObj = result
    return result
  },
  onParamPanelConfig: function () {
    const me = this
    const useHourlyPay = AC.settings.get('hrStaffTableUseHourlyPay', (me.incomeParams && me.incomeParams.orgID) || appAC.globalOrganization())
    const initialDate = (me.incomeParams && me.incomeParams.onDate) || appAC.globalApplicationDate()
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        render: function (form) {
          const reportViewer = form.ownerCt
          reportViewer.exportToXLSX = exportToXLSX
        }
      },
      items: [
        HR.controlService.getCollapseInfoPanel('Звіт формується по даним по окладу та нарахуванням, які взяті з призначень працівників на посади станом на вказану дату. Якщо посада вакантна, то дані беруться з відповідного запису довідника посад.'),
        {
          xtype: 'panel',
          layout: { type: 'hbox' },
          flex: 1,
          items: [
            HR.controlService.getOrgCombo({
              labelWidth: 150,
              width: 650,
              allowBlank: false,
              disableContextMenu: true,
              addFields: ['nameGen', 'nameDat', 'name'],
              orgFilter: 'CURRENT',
              globalOrg: me.incomeParams && me.incomeParams.orgID,
              readOnly: true,
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const respPositionID = form.down('[name=respPositionID]')
                  const respEmpID = form.down('[name=respEmpID]')
                  const orgID = ctrl.getValue() || 0
                  AC.viewUtils.setWhereListProperty(respPositionID, [['orgID', '=', orgID]], null, ['clearStore', 'clearValue'])
                  AC.viewUtils.setWhereListProperty(respEmpID, [['organizationID', '=', orgID]], null, ['clearStore', 'clearValue'])
                  respPositionID.setDisabled(!orgID)
                  respEmpID.setDisabled(!orgID)
                }
              }
            }),
            {
              xtype: 'datefield',
              name: 'onDate',
              fieldLabel: UB.i18n('Станом на'),
              labelWidth: 150,
              value: initialDate,
              disabled: me.incomeParams && me.incomeParams.onDate,
              allowBlank: false,
              width: 270,
              listeners: {
                change: function (ctrl) {
                  const form = ctrl.up('form')
                  const respPositionID = form.down('[name=respPositionID]')
                  const respEmpID = form.down('[name=respEmpID]')
                  const onDate = ctrl.getValue()
                  const onDateIsValid = AC.dateService.isValid(onDate)
                  if (onDateIsValid) {
                    AC.viewUtils.setWhereListProperty(respPositionID, [['mi_dateFrom', '<=', onDate], ['mi_dateTo', '>=', onDate]],
                      null, ['clearStore', 'clearValue'])
                    AC.viewUtils.setWhereListProperty(respEmpID, [['dateFrom', '<=', onDate], ['dateTo', '>=', onDate]],
                      null, ['clearStore', 'clearValue'])
                  }
                  respPositionID.setDisabled(!onDateIsValid)
                  respEmpID.setDisabled(!onDateIsValid)
                }
              }
            },
            {
              xtype: 'numberfield',
              name: 'monthsFop',
              fieldLabel: UB.i18n('Кількість місяців для розрахунку ФОП'),
              vtype: 'numberValidator',
              allowBlank: false,
              labelWidth: 180,
              margin: '0 0 0 95',
              width: 270,
              minValue: 1,
              maxValue: 1200,
              value: 6
            }
          ]
        },
        {
          layout: { type: 'hbox' },
          flex: 1,
          items: [
            HR.controlService.getOneDepCombo({
              displayField: 'description',
              childDepName: 'departmentID',
              labelWidth: 150,
              width: 650,
              layout: { type: 'hbox' },
              depFilter: me.incomeParams && me.incomeParams.childDepID
            }),
            HR.controlService.getFundSourceCombo({
              labelWidth: 150,
              width: 650
            })
          ]
        },
        {
          xtype: 'panel',
          layout: { type: 'hbox' },
          defaults: { labelWidth: 150 },
          flex: 1,
          items: [
            HR.controlService.getDepCombo({
              displayField: 'description',
              labelWidth: 150,
              width: 650,
              layout: { type: 'hbox' },
              filterByGlobalOrg: true,
              depFilter: me.incomeParams && me.incomeParams.childDepID
            }),
            HR.controlService.getProgClassCombo({
              labelWidth: 150,
              width: 650
            })
          ]
        },
        {
          layout: { type: 'hbox' },
          items: [
            {
              layout: { type: 'vbox' },
              items: [
                {
                  xtype: 'combobox',
                  hidden: true,
                  name: 'groupBy',
                  fieldLabel: UB.i18n('Групувати за'),
                  labelWidth: 150,
                  width: 650,
                  store: Ext.create('Ext.data.Store', {
                    fields: ['id', 'value'],
                    data: [
                      {
                        id: 1,
                        value: UB.i18n('За категоріями персоналу')
                      },
                      {
                        id: 2,
                        value: UB.i18n('За підкатегоріями персоналу')
                      }
                    ]
                  }),
                  displayField: 'value',
                  valueField: 'id'
                },
                {
                  xtype: 'numberfield',
                  name: 'normHour',
                  labelWidth: 150,
                  width: 270,
                  fieldLabel: UB.i18n('Норма годин'),
                  allowBlank: !useHourlyPay,
                  hidden: !useHourlyPay,
                  vtype: 'numberValidator',
                  maxValue: 999999,
                  minValue: useHourlyPay ? 1 : 0
                }
              ]
            },
            HR.controlService.getRespPosEmpCombos({
              labelWidth: 150,
              width: 650
            })
          ]
        },
        {
          xtype: 'checkboxfield',
          labelWidth: 170,
          name: 'byStaff',
          value: 1,
          hidden: true,
          fieldLabel: UB.i18n('За штатним розписом')
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const orgIDCtrl = frm.findField('organizationID')
        const structDepCtrl = frm.findField('structDepID')
        const childDepCtrl = frm.findField('departmentID')
        const dictProgClassCtrl = frm.findField('dictProgClass')
        const respPositionIDCtrl = frm.findField('respPositionID')
        const respEmpIDCtrl = frm.findField('respEmpID')
        const groupByCtrl = frm.findField('groupBy')
        const dictFundSourceCtrl = frm.findField('dictFundSourceID')
        let structDepID = structDepCtrl.getValue()
        let childDepID = childDepCtrl.getValue()
        let structDepName
        let childDepName = (childDepID && childDepCtrl.getFieldValue('nameGen') && childDepCtrl.getFieldValue('nameGen').trim()) || childDepCtrl.getFieldValue('name')
        if (childDepID && !structDepID) {
          structDepID = childDepCtrl.getFieldValue('parentUnitID')
          let structDepReco = structDepCtrl.getStore().data.items.find(rec => rec.get('mi_data_id') === structDepID)
          structDepName = structDepReco && structDepReco.get('name')
        } else {
          structDepName = (structDepID && structDepCtrl.getFieldValue('nameGen') && structDepCtrl.getFieldValue('nameGen').trim()) || structDepCtrl.getFieldValue('name')
        }
        return {
          orgID: orgIDCtrl.getValue() || 0,
          orgName: (orgIDCtrl.getFieldValue('nameGen') && orgIDCtrl.getFieldValue('nameGen').trim()) || orgIDCtrl.getFieldValue('name'),
          structDepID: structDepID || 0,
          structDepName: structDepName,
          childDepID: childDepID || 0,
          childDepName: childDepName,
          onDate: frm.findField('onDate').getValue(),
          monthsFop: frm.findField('monthsFop').getValue() || 0,
          dictProgClassName: dictProgClassCtrl.getValue(),
          respPositionID: respPositionIDCtrl.getValue() || 0,
          respPositionName: respPositionIDCtrl.getRawValue(),
          respPositionNameGen: respPositionIDCtrl.getFieldValue('nameGen'),
          respEmpID: respEmpIDCtrl.getValue() || 0,
          respEmpName: respEmpIDCtrl.getFieldValue('employeeID.shortFIO'),
          respEmpPositionID: respEmpIDCtrl.getFieldValue('positionID'),
          groupBy: groupByCtrl.getValue(),
          dictFundSourceID: dictFundSourceCtrl.getValue(),
          dictFundSourceName: frm.findField('dictFundSourceID').getRawValue(),
          dictFundTypeName: dictFundSourceCtrl.getFieldValue('dictFundTypeName'),
          normHour: frm.findField('normHour').getValue(),
          byStaff: frm.findField('byStaff').getValue()
        }
      }
    })
    const incomeParams = me.incomeParams || {}
    paramForm.on('afterrender', function () {
      const me = this
      if (incomeParams.childDepID) {
        const structDepCtrl = me.down('[name=structDepID]')
        structDepCtrl && structDepCtrl.setDisabled(true)
        const childDepCtrl = me.down('[name=departmentID]')
        const onDateCtrl = me.down('[name=onDate]')
        const filterDate = incomeParams.onDate || (onDateCtrl && AC.dateService.shiftDate(onDateCtrl.getValue()))
        const orgCtrl = me.down('[name=organizationID]')
        const filterOrgID = incomeParams.orgID || (orgCtrl && orgCtrl.getValue())
        const filter = [
          ['state', '=', 'ACTIVE'],
          ['orgID', '=', filterOrgID],
          ['mi_treePath', 'like', `%/${incomeParams.childDepID}/%`]
        ]
        childDepCtrl.__mip_ondate = filterDate
        AC.viewUtils.setWhereListProperty(childDepCtrl, filter, null, ['clearWhereList', 'clearStore', 'clearValue'])
        Ext.defer(() => {
          childDepCtrl.setValueById(incomeParams.childDepID)
        }, 300)
      }
    })
    reportObj = undefined
    return paramForm
  },
  generateDataForReport: function ({ rootID, orgStruct, posData, empPosData, accrualData, basepayData,
    payelData, payelData4Basepay, monthsFop, onDate, depFilter, addpayCount, isMed, minSalarySum, useHourlyPay,
    onlyByTarif, byStaff, roundTo, roundToQuantity, colCount }) {
    const medStaffCats = ['1', '2', '3']
    const mainDeptRowStyle = 'font-weight: bold; height: 36px;'
    const boldRowStyle = 'font-weight: bold;'
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
    let catData = HR.reportUtils.getPosCategories({ isMed, initObj: { basepay: 0, basepayHour: 0, fundSum1: 0, fundSum2: 0, ids: [] }, posData })

    function getData (parentID, level = 1, positionChiefID = null) {
      const result = {
        level: level,
        data: [],
        quantity: 0,
        basepay: 0,
        basepayHour: 0,
        fundSum1: 0,
        fundSum2: 0,
        catData: _.cloneDeep(catData)
      }
      initAccValues(accrualData, result, roundTo)
      result.catData.forEach(elem => {
        initAccValues(accrualData, elem, roundTo)
      })

      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
      const identStr = HR.reportUtils.getSpaceIdent(false, level)
      const identHtml = HR.reportUtils.getSpaceIdent(true, level)
      let styleBegin = ''
      let styleEnd = ''
      if (level === 1) {
        styleBegin = '<font color="blue">'
        styleEnd = '</font>'
      }
      if (level === 2) {
        styleBegin = '<u>'
        styleEnd = '</u>'
      }
      let indexNum = 1
      curStruct.forEach(orgItem => {
        let isDept = orgItem.mi_unityEntity === 'hr_department'
        let obj1 = {
          isPositionChief: !isDept && positionChiefID ? positionChiefID === orgItem.mi_data_id : false,
          roundTo,
          roundToQuantity,
          useHourlyPay,
          colCount,
          mi_data_id: orgItem.mi_data_id,
          name: isDept ? `${identStr}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase()
            : HR.nameCase.cap(orgItem.name || '')}` : '',
          html: isDept ? `${identHtml}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase()
            : HR.nameCase.cap(orgItem.name || '')}${styleEnd}` : '',
          isDepartment: isDept,
          isTotal: false,
          level: level,
          depType: orgItem.depType || '',
          rowStyle: (isDept && level <= 2) ? mainDeptRowStyle : '',
          catCode2: false,
          borderStyle: 'border: 1px solid;'
        }
        const objs = [obj1]

        if (!obj1.isDepartment) {
          const posItem = posData.find(itm => itm.ID === orgItem.ID)
          if (posItem) {
            obj1.isPosition = true
            obj1.name = HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || '')
            obj1.dictPositionID = posItem.dictPositionID
            obj1.parentUnitID = posItem.parentUnitID
            obj1.text = obj1.name
            obj1.html = obj1.name
            obj1.profCode = posItem.profCode
            initAccValues(accrualData, obj1, roundTo)

            let staffCatCode = posItem['dictStaffCatID.code'] || '99999999999'
            obj1.catCode2 = staffCatCode === '2'

            const empPos = empPosData.filter(item => item.positionID === posItem.mi_data_id)
            let posBasepay = posItem.basepay || 0
            let posQnt = (posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.quantity'] : posItem.quantity) || 0
            if (empPos.length === 0) {
              obj1.basepay = posBasepay
              obj1.basepayHour = posItem.basepayHour || 0
              obj1.quantity = posQnt
              obj1.isEmpVac = true
            } else {
              let empQntSum = 0
              for (let i = 0; i < empPos.length; i++) {
                let empPosItem = empPos[i]
                let empQnt = (empPosItem['fundSourceEmpPosID.ID'] ? empPosItem['fundSourceEmpPosID.mtCount'] : empPosItem.mtCount) || 0
                let empBasepay = notShowSalary ? 0 : (empPosItem.basepay || (onlyByTarif ? 0 : posBasepay) || 0)
                empQntSum += empQnt
                if (i === 0) {
                  obj1.empPosID = empPosItem.ID
                  obj1.quantity = empQnt
                  obj1.basepay = empBasepay
                  obj1.basepayHour = notShowSalary ? 0 : (empPosItem.basepayHour || (onlyByTarif ? 0 : posItem.basepayHour) || 0)
                  obj1.empCategoryName = [empPosItem.categoryInfo, empPosItem.scienceName].filter(Boolean).join(' ')
                } else {
                  let newObj
                  newObj = Object.assign({}, obj1)
                  newObj.empPosID = empPosItem.ID
                  newObj.quantity = empQnt
                  newObj.basepay = empBasepay
                  newObj.basepayHour = notShowSalary ? 0 : (empPosItem.basepayHour || 0)
                  newObj.empCategoryName = [empPosItem.categoryInfo, empPosItem.scienceName].filter(Boolean).join(' ')
                  initAccValues(accrualData, newObj, roundTo)
                  objs.push(newObj)
                }
              }
              if (posQnt > empQntSum) {
                // вакансія
                let newObj
                newObj = Object.assign({}, obj1)
                newObj.catCode2 = false
                newObj.isEmpVac = true
                newObj.empPosID = undefined
                newObj.quantity = posQnt - empQntSum
                newObj.basepay = posBasepay
                newObj.basepayHour = posItem.basepayHour || 0
                newObj.empCategoryName = ''
                initAccValues(accrualData, newObj, roundTo)
                Object.keys(basepayData).forEach(key => {
                  let accrualItem = basepayData[key]
                  if (accrualItem.hasData) {
                    newObj[key] = notShowSalary ? 0 : HR.staffTariffing.accrualSumGetPosSum({
                      accrualItem,
                      posItem
                    })
                  }
                })
                objs.push(newObj)
              } else if (posQnt < empQntSum) {
                // Призначень більше ніж штатних посад
                obj1.html = `<font color="red">${obj1.name}</font>`
                obj1.nameIsRed = true
              }
            }

            /* Заповнення окладу з надбавками */
            Object.keys(basepayData).forEach(key => {
              let accrualItem = basepayData[key]
              if (empPos.length > 0) {
                // Існують призначення
                for (let i = 0; i < empPos.length; i++) {
                  let empPosItem = empPos[i]
                  if (accrualItem.hasData) {
                    let obj = objs[i]
                    obj[key] = notShowSalary ? 0 : HR.staffTariffing.accrualSumGetEmpSum({
                      accrualItem,
                      accumObj: obj,
                      empPosItem,
                      payelData: payelData4Basepay
                    })
                  }
                }
              } else {
                // Посада вакантна
                if (accrualItem.hasData) {
                  obj1[key] = notShowSalary ? 0 : HR.staffTariffing.accrualSumGetPosSum({
                    accrualItem,
                    posItem
                  })
                }
              }
            })
            if (!useHourlyPay) { // для почасовой оплаты надбавки по тарифу не учитываем
              objs.forEach(obj => {
                obj.basepay = notShowSalary ? 0 : HR.accrualService.accrualSumGetBasepayByObj(obj)
              })
            }

            /* Заповнення колонок addpay1 - addpayN */
            Object.keys(accrualData).forEach(key => {
              let accrualItem = accrualData[key]
              if (empPos.length > 0) {
                // Існують призначення
                for (let i = 0; i < empPos.length; i++) {
                  let empPosItem = empPos[i]
                  if (accrualItem.hasData) {
                    let obj = objs[i]
                    obj.quantityBase = obj.quantity
                    const empSum = notShowSalary ? 0 : HR.staffTariffing.accrualSumGetEmpSum({
                      accrualItem,
                      accumObj: obj,
                      empPosItem,
                      payelData
                    })
                    setAccValue(obj, accrualItem.code, empSum)
                  }
                }
                // якщо на посаді є вакансія
                if (objs.length > empPos.length) {
                  if (objs[empPos.length] && accrualItem.hasData) {
                    let obj = objs[empPos.length]
                    const empSum = notShowSalary ? 0 : HR.staffTariffing.accrualSumGetPosSum({
                      accrualItem,
                      posItem,
                      quantity: obj.quantity
                    })
                    setAccValue(obj, accrualItem.code, empSum)
                  }
                }
              } else {
                // Посада вакантна
                if (accrualItem.hasData) {
                  const empSum = notShowSalary ? 0 : HR.staffTariffing.accrualSumGetPosSum({
                    accrualItem,
                    posItem,
                    quantity: obj1.quantity
                  })
                  setAccValue(obj1, accrualItem.code, empSum)
                }
              }
            })

            // Групування та формування ітогів
            objs.forEach(obj => {
              // Визначення назви посади, якщо попередня вже така була, то не виводимо назву
              let prevItem = result.data.length && result.data[result.data.length - 1]
              const isExistedNameObj = prevItem && prevItem.isPosition && prevItem.dictPositionID === obj.dictPositionID &&
                prevItem.name === obj.name && prevItem.parentUnitID === obj.parentUnitID
              if (isExistedNameObj) {
                obj.text += obj.isEmpVac ? UB.i18n(' (вакансія)') : ''
                obj.html += obj.isEmpVac ? UB.i18n(' (вакансія)') : ''
                obj.profCode = ''
              }
              obj.empCategoryName = obj.empCategoryName ? obj.empCategoryName : obj.isEmpVac ? UB.i18n('вак') : UB.i18n('бк')

              result.quantity += obj.quantity
              const basepayWithQuantity = obj.basepay ? AC.currencyService.round(obj.basepay * obj.quantity, 2) : 0
              result.basepay += basepayWithQuantity
              const basepayHourWithQuantity = obj.basepayHour ? AC.currencyService.round(obj.basepayHour * obj.quantity, 2) : 0
              result.basepayHour += basepayHourWithQuantity

              let fundSum1 = calcFundSum(obj, useHourlyPay, minSalarySum)
              let fundSum2 = AC.currencyService.round(fundSum1 * monthsFop, 2)

              // Групування по посаді, окладу та надбавкам
              const existedRowObj = result.data.find(fItem => {
                let res = fItem.isPosition && fItem.dictPositionID === obj.dictPositionID && fItem.name === obj.name &&
                  fItem.parentUnitID === obj.parentUnitID && fItem.basepay === obj.basepay && fItem.basepayHour === obj.basepayHour && fItem.empCategoryName === obj.empCategoryName
                if (res) {
                  for (let i = 0; i < addpayCount; i++) {
                    if (!fItem.accValues[i].minPay) {
                      res = res && (fItem.accValues[i].valueOrig || 0) === (obj.accValues[i].value || 0)
                    }
                    if (!res) {
                      break
                    }
                  }
                }
                return res
              })

              sumAccValues(obj, result)
              if (!existedRowObj) {
                obj.fundSum1_delta = 0
                obj.fundSum1_union = fundSum1
                obj.fundSum1 = fundSum1
                obj.fundSum2 = fundSum2
                obj.indexNum = indexNum++
                result.data.push(obj)

                result.fundSum1 += fundSum1
                result.fundSum2 = AC.currencyService.round(result.fundSum1 * monthsFop, 2)
              } else {
                existedRowObj.quantity += obj.quantity

                for (let i = 0; i < addpayCount; i++) {
                  if (/*existedRowObj.accValues[i].minPay && */ obj.accValues[i].value) {
                    existedRowObj.accValues[i].value = AC.currencyService.round((existedRowObj.accValues[i].value || 0) + obj.accValues[i].value, 2)
                  }
                }

                existedRowObj.fundSum1_union = AC.currencyService.round(existedRowObj.fundSum1_union + fundSum1, 2)

                // из-за возможных округлений при умножении на количесвто ставок
                result.fundSum1 = AC.currencyService.round(result.fundSum1 - existedRowObj.fundSum1, 2)

                existedRowObj.fundSum1 = calcFundSum(existedRowObj, useHourlyPay, minSalarySum)
                existedRowObj.fundSum1_delta = AC.currencyService.round((existedRowObj.fundSum1_union - existedRowObj.fundSum1), 2)
                existedRowObj.fundSum1 = AC.currencyService.round(existedRowObj.fundSum1 + existedRowObj.fundSum1_delta, 2)
                existedRowObj.fundSum2 = AC.currencyService.round(existedRowObj.fundSum1 * monthsFop, 2)

                result.fundSum1 = AC.currencyService.round(result.fundSum1 + existedRowObj.fundSum1, 2)
                result.fundSum2 = AC.currencyService.round(result.fundSum1 * monthsFop, 2)
              }

              if (isMed) {
                if (staffCatCode && medStaffCats.includes(staffCatCode)) {
                  // Категорії: 1 - Лікарі, 2 - Середній медперсонал, 3 - Молодший медперсонал
                  let catItem = result.catData.find(itm => itm.code === staffCatCode)
                  if (catItem) {
                    catItem.quantity += obj.quantity
                    catItem.basepay += basepayWithQuantity //obj.basepay
                    catItem.basepayHour += basepayHourWithQuantity // obj.basepayHour
                    catItem.fundSum1 += fundSum1
                    catItem.fundSum2 += fundSum2
                    catItem.ids.push(posItem.ID)
                    sumAccValues(obj, catItem)
                  }
                } else {
                  let highEduCount = 0
                  const objEmpPos = (empPos.length > 0) && obj.empPosID && empPos.find(itm => itm.ID === obj.empPosID)
                  if (objEmpPos) {
                    let hasHighEdu = objEmpPos.hasHighEdu
                    if (hasHighEdu) {
                      highEduCount += objEmpPos.mtCount || 0
                    }
                  }
                  let otherCount = obj.quantity - highEduCount
                  // Інші спеціалісти з в/о
                  let cat4Item = result.catData.find(itm => itm.code === undefined && itm.hasHighEdu === true)
                  let other4Coef = highEduCount / obj.quantity
                  const cat4Basepay = AC.currencyService.round(basepayWithQuantity * other4Coef, 2)
                  const cat4BasepayH = AC.currencyService.round(basepayHourWithQuantity * other4Coef, 2)
                  const cat4FundSum1 = AC.currencyService.round(fundSum1 * other4Coef, 2)
                  const cat4FundSum2 = AC.currencyService.round(fundSum2 * other4Coef, 2)
                  if (cat4Item) {
                    cat4Item.quantity += highEduCount
                    cat4Item.basepay = AC.currencyService.round(cat4Item.basepay + cat4Basepay, 2)
                    cat4Item.basepayHour = AC.currencyService.round(cat4Item.basepayHour + cat4BasepayH, 2)
                    cat4Item.fundSum1 = AC.currencyService.round(cat4Item.fundSum1 + cat4FundSum1, 2)
                    cat4Item.fundSum2 = AC.currencyService.round(cat4Item.fundSum2 + cat4FundSum2, 2)
                  }

                  // Інші
                  let cat5Item = result.catData.find(itm => itm.code === undefined && !itm.hasHighEdu)
                  if (cat5Item) {
                    cat5Item.quantity += otherCount
                    cat5Item.basepay = AC.currencyService.round(basepayWithQuantity - cat4Basepay, 2)
                    cat5Item.basepayHour = AC.currencyService.round(basepayHourWithQuantity - cat4BasepayH, 2)
                    cat5Item.fundSum1 += AC.currencyService.round(fundSum1 - cat4FundSum1, 2)
                    cat5Item.fundSum2 += AC.currencyService.round(fundSum2 - cat4FundSum2, 2)
                  }

                  if (cat4Item || cat5Item) {
                    for (let i = 0; i < obj.accValues.length; i++) {
                      if (obj.accValues[i].value && (!existedRowObj || obj.accValues[i].minPay)) {
                        const cat4value = AC.currencyService.round(obj.accValues[i].value * other4Coef, 2)
                        if (cat4Item) {
                          cat4Item.accValues[i].value = AC.currencyService.round((cat4Item.accValues[i].value || 0) + cat4value, 2)
                        }
                        if (cat5Item) {
                          cat5Item.accValues[i].value = AC.currencyService.round((cat5Item.accValues[i].value || 0) + obj.accValues[i].value - cat4value, 2)
                        }
                      }
                    }
                  }
                }
              } else {
                let catItem = result.catData.find(itm => itm.code === staffCatCode)
                if (catItem) {
                  catItem.quantity += obj.quantity
                  catItem.basepay += basepayWithQuantity //obj.basepay
                  catItem.basepayHour += basepayHourWithQuantity //obj.basepayHour
                  catItem.fundSum1 += fundSum1
                  catItem.fundSum2 += fundSum2
                  catItem.ids.push(posItem.ID)
                  sumAccValues(obj, catItem)
                }
              }
            })
          }
        } else {
          const subTree = getData(orgItem.mi_data_id, level + 1, byStaff ? orgItem.positionChiefID : undefined)
          let hasPos = !!subTree.data.find(itm => itm.isPosition === true)
          if (hasPos) {
            result.data.push(obj1)
            result.data.push(...subTree.data)

            let depTypeStr = obj1.depType
            let totalName = UB.i18n(`Всього{0}`, depTypeStr ? ' по ' + depTypeStr : '')
            const totalObj = {
              mi_data_id: obj1.mi_data_id,
              name: totalName,
              text: totalName,
              html: totalName,
              isDepartment: false,
              isTotal: true,
              borderStyle: 'border: 1px solid;',
              level: level,
              quantity: subTree.quantity,
              basepay: subTree.basepay,
              basepayHour: subTree.basepayHour,
              fundSum1: subTree.fundSum1,
              fundSum2: subTree.fundSum2,
              rowStyle: (level <= 2) ? mainDeptRowStyle : boldRowStyle,
              accValues: copyAccValues(accrualData, subTree)
            }
            result.data.push(totalObj)
            sumAccValues(subTree, result)

            if (!isMed || level <= 2) {
              subTree.catData.forEach(catItem => {
                if (catItem.quantity) {
                  result.data.push({
                    rowStyle: '', // boldRowStyle,
                    mi_data_id: obj1.mi_data_id,
                    name: identStr + catItem.name,
                    text: identStr + catItem.name,
                    html: identHtml + catItem.name,
                    isDepartment: false,
                    isTotal: true,
                    borderStyle: 'border: 1px solid;',
                    isCatTotal: true,
                    level: level,
                    quantity: catItem.quantity,
                    basepay: catItem.basepay,
                    basepayHour: catItem.basepayHour,
                    fundSum1: catItem.fundSum1,
                    fundSum2: catItem.fundSum2,
                    accValues: copyAccValues(accrualData, catItem)
                  })
                }
              })
            }
            /* Ітоги підпорядкованих підрозділів */
            result.quantity += subTree.quantity
            result.basepay += subTree.basepay
            result.basepayHour += subTree.basepayHour
            result.fundSum1 += subTree.fundSum1
            result.fundSum2 += subTree.fundSum2
            result.catData.forEach(catItem => {
              let subTreeCatItem = subTree.catData.find(itm => itm.id === catItem.id)
              sumAccValues(subTreeCatItem, catItem)
              catItem.quantity += subTreeCatItem.quantity
              catItem.basepay += subTreeCatItem.basepay
              catItem.basepayHour += subTreeCatItem.basepayHour
              catItem.fundSum1 += subTreeCatItem.fundSum1
              catItem.fundSum2 += subTreeCatItem.fundSum2
              if (subTreeCatItem.ids.length > 0) {
                catItem.ids.push(...subTreeCatItem.ids)
              }
            })
          }
        }
      })
      return result
    }

    const orgTree = getData(rootID)

    if (!depFilter) {
      let orgTotalName = UB.i18n('РАЗОМ ПО ОРГАНІЗАЦІЇ')
      const orgTotalObj = {
        isTotalOrg: true,
        mi_data_id: rootID,
        name: orgTotalName,
        text: orgTotalName,
        html: orgTotalName,
        isDepartment: false,
        isTotal: true,
        borderStyle: 'border: 1px solid;',
        level: 0,
        quantity: orgTree.quantity,
        basepay: orgTree.basepay,
        basepayHour: orgTree.basepayHour,
        fundSum1: orgTree.fundSum1,
        fundSum2: orgTree.fundSum2,
        rowStyle: mainDeptRowStyle,
        accValues: copyAccValues(accrualData, orgTree)
      }
      orgTree.data.push(orgTotalObj)
      orgTree.catData.forEach(catItem => {
        if (catItem.quantity) {
          orgTree.data.push({
            level: 0,
            rowStyle: '',
            mi_data_id: rootID,
            name: catItem.name,
            text: catItem.name,
            html: catItem.name,
            isDepartment: false,
            isTotal: true,
            borderStyle: 'border-right: 1px solid;',
            isCatTotal: true,
            quantity: catItem.quantity,
            basepay: catItem.basepay,
            basepayHour: catItem.basepayHour,
            fundSum1: catItem.fundSum1,
            fundSum2: catItem.fundSum2,
            accValues: copyAccValues(accrualData, catItem)
          })
        }
      })

      /* В тому числі по самостійнм підрозділам */
      const ident1Str = HR.reportUtils.getSpaceIdent(false, 2)
      const ident1Html = HR.reportUtils.getSpaceIdent(true, 2)
      const ident2Str = HR.reportUtils.getSpaceIdent(false, 4)
      const ident2Html = HR.reportUtils.getSpaceIdent(true, 4)
      const depts1 = orgTree.data.filter(orgItem => orgItem.isTotal && orgItem.level === 1)
      depts1.forEach(dept => {
        let deptTotalName = dept.isCatTotal ? dept.name : `${dept.name} ${UB.i18n('в т.ч.')}:`
        let orgTotalObj = {
          isCatTotal: dept.isCatTotal,
          mi_data_id: dept.mi_data_id,
          name: (dept.isCatTotal ? ident2Str : ident1Str) + deptTotalName,
          text: (dept.isCatTotal ? ident2Html : ident1Html) + deptTotalName,
          html: (dept.isCatTotal ? ident2Html : ident1Html) + deptTotalName,
          isDepartment: false,
          isTotal: true,
          borderStyle: 'border-right: 1px solid;',
          level: 0,
          rowStyle: dept.isCatTotal ? '' : mainDeptRowStyle,
          quantity: dept.quantity,
          basepay: dept.basepay,
          basepayHour: dept.basepayHour,
          fundSum1: dept.fundSum1,
          fundSum2: dept.fundSum2,
          accValues: copyAccValues(accrualData, dept)
        }

        orgTree.data.push(orgTotalObj)
      })
    }

    return orgTree || {}
  }
}

function calcFundSum (obj, useHourlyPay, minSalarySum) {
  const summaTypeO = AC.currencyService.round(obj.catCode2
    ? obj.accValues.reduce((s, o) => s + (o.minPay ? 0 : o.value || 0), 0)
    : obj.accValues.reduce((s, o) => s + (o.minPay || o.dezPay ? 0 : o.value || 0), 0)
  , 2)
  let summaTypeM = AC.currencyService.round(obj.accValues.reduce((s, o) => s + (o.minPay ? o.value || 0 : 0), 0), 2)
  const summaTypeD = obj.catCode2 ? 0 : AC.currencyService.round(obj.accValues.reduce((s, o) => s + (o.dezPay ? o.value || 0 : 0), 0), 2)

  if (summaTypeM <= 0) {
    // если не рассчитана мин. сумма надбавки, то высчитываем ее по общей минимальной сумме
    const payM = obj.accValues.find(o => o.minPay)
    if (payM) {
      const calcSummaM = (minSalarySum * obj.quantity > ((useHourlyPay ? obj.basepayHour || 0 : obj.basepay || 0) * obj.quantity + summaTypeO))
        ? AC.currencyService.round(
          AC.currencyService.round(minSalarySum * obj.quantity, 2) -
          (AC.currencyService.round((useHourlyPay ? obj.basepayHour || 0 : obj.basepay || 0) * obj.quantity , 2) + summaTypeO)
          , 2)
        : 0
      if (calcSummaM) {
        summaTypeM = AC.currencyService.round(summaTypeM + calcSummaM, 2)
        payM.value = summaTypeM
        payM.valueOrig = summaTypeM
      }
    }
  }
  // const fundSum = AC.currencyService.round(AC.currencyService.round(((useHourlyPay ? obj.basepayHour || 0 : obj.basepay || 0) + summaTypeO) * obj.quantity, 2) +
  //  (summaTypeD ? AC.currencyService.round(summaTypeD * obj.quantity, 2) : 0) + summaTypeM, 2)
  const fundSum = AC.currencyService.round(AC.currencyService.round((useHourlyPay ? obj.basepayHour || 0 : obj.basepay || 0)  * obj.quantity, 2) + summaTypeO +
    (summaTypeD ? summaTypeD : 0) + summaTypeM, 2)

  return fundSum
}

function initAccValues (accrualData, obj, roundTo) {
  obj.accValues = []
  _.forEach(accrualData, accrualItem => {
    obj.accValues.push({
      valueOrig: undefined, //  для поиска для группировки
      value: undefined,
      code: accrualItem.code,
      useCoef: accrualItem.useCoef,
      minPay: accrualItem.minPay,
      dezPay: accrualItem.dezPay,
      roundTo
    })
  })
}

function copyAccValues (accrualData, obj) {
  const accValues = []
  Object.keys(accrualData).forEach(key => {
    accValues.push({
      value: undefined,
      roundTo: 'decimal2'
    })
  })

  for (let i = 0; i < obj.accValues.length; i++) {
    accValues[i].value = obj.accValues[i].value
    accValues[i].roundTo = obj.accValues[i].roundTo
  }
  return accValues
}

function sumAccValues (objFrom, objTo) {
  if (objFrom && objTo && objFrom.accValues && objTo.accValues) {
    for (let i = 0; i < objFrom.accValues.length; i++) {
      if (objFrom.accValues[i].value) {
        objTo.accValues[i].value = AC.currencyService.round((objTo.accValues[i].value || 0) + objFrom.accValues[i].value, 2)
      }
    }
  }
}

function setAccValue (obj, key, value) {
  if (value) {
    obj.accValues.forEach(elem => {
      if (elem.code === key) {
        elem.valueOrig = AC.currencyService.round(value, 2)
        elem.value = AC.currencyService.round(value, 2)
      }
    })
  }
}

function exportToXLSX () {
  if (!reportObj) {
    AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Не сформовано звіт'))
    return
  }
  HR.reportUtils.generateExcelReport('hr_report', 'runTypicalOrgPlanByPayTariffing', 'OrgPlan.xlsx', reportObj)
}
