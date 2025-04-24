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
    const orgID = reportParams.orgID || 0
    const orgName = reportParams.orgName || ''
    const structDepID = reportParams.structDepID || 0
    const structDepName = reportParams.structDepName || ''
    const childDepID = reportParams.childDepID || 0
    const childDepName = reportParams.childDepName || ''
    const onDate = reportParams.onDate
    const onDate4Sql = AC.dateService.shiftDate(onDate)
    const monthsFop = reportParams.monthsFop
    const dictProgClassName = reportParams.dictProgClassName || ''
    const respPositionID = reportParams.respPositionID || 0
    const respPositionName = reportParams.respPositionName || ''
    const respPositionNameGen = reportParams.respPositionNameGen || ''
    const respEmpName = reportParams.respEmpName || ''
    const respEmpPositionID = reportParams.respEmpPositionID || 0
    const dictFundSourceID = reportParams.dictFundSourceID || 0

    const onYear = onDate.getFullYear()
    const toDate = monthsFop ? AC.dateService.addDays(AC.dateService.addMonths(onDate, monthsFop), -1) : onDate
    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(orgID)
    const isMed = await HR.reportUtils.isOrgOfBusinessType(orgID, 'med')

    const result = {
      data: [],
      yearFundSumHeader1: UB.i18n(`Фонд заробітної плати<br/>на {0} рік`, onYear),
      yearFundSumHeader2: UB.i18n(`з {0} до {1} (грн.)**`, AC.dateService.formatDate(onDate), AC.dateService.formatDate(toDate)),
      chiefPosName: respPositionName,
      chiefPib: respEmpName,
      orgName: orgName || '',
      structDepName: HR.nameCase.cap(structDepName || ''),
      childDepName: HR.nameCase.cap(childDepName || ''),
      progClassName: dictProgClassName,
      year: onYear,
      onDate: onDate,
      onDateStr: AC.dateService.formatDate(onDate),
      toDate: toDate,
      monthsFop: monthsFop,
      roundTo: settingsOrg.roundTo || 'decimal2',
      roundToQuantity: settingsOrg.roundToQuantity || 'numberGroup',
      fundName: ''
    }

    const orgIDs = [orgID]
    const depFilter = childDepID || structDepID
    const depIDs = []
    structDepID && depIDs.push(structDepID)
    childDepID && depIDs.push(childDepID)
    let orgStruct = UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'mi_unityEntity', 'mi_treePath'])
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
    const deptData = await HR.reportUtils.getDepartmentTypeNames(orgIDs, onDate4Sql, undefined, ['nameDat'])
    orgStruct.filter(item => item.mi_unityEntity === 'hr_department').forEach(item => {
      const deptItem = deptData.find(dItem => dItem.ID === item.ID)
      item.depType = deptItem ? HR.nameCase.uncap(deptItem['dictDepTypeID.nameGen'] || deptItem['dictDepTypeID.name'] || deptItem.nameDat || item.name || '') : item.name
    })
    const posData = await UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID.fullName', 'dictPositionID.name', 'accrualSum',
        'quantity', 'dictStaffCatID', 'dictStaffCatID.code', 'dictStaffCatID.name', 'dictPositionID.dictProfessionID.code'])
      .where('orgID', '=', orgID)
      .where('liquidate', '=', 0)
      .misc({ __mip_ondate: onDate4Sql })
      .where('state', '=', 'ACTIVE')
      .whereIf(dictFundSourceID, 'dictFundSourceID', '=', dictFundSourceID)
      .orderBy('mi_data_id')
      .selectAsObject({
        'dictPositionID.dictProfessionID.code': 'profCode'
      })
    /* Sort by category */
    orgStruct.forEach(orgItem => {
      let posItem = posData.find(itm => itm.ID === orgItem.ID)
      orgItem.catIdx = ''
      if (posItem) {
        if (isMed) {
          if (['1', '2', '3'].includes(posItem['dictStaffCatID.code'])) {
            orgItem.catIdx = posItem['dictStaffCatID.code']
          } else {
            orgItem.catIdx = '4'
          }
        } else {
          orgItem.catIdx = posItem['dictStaffCatID.name']
        }
        // sort test
        // posItem['dictPositionID.fullName'] = `${posItem['dictPositionID.fullName']} (${posItem['dictStaffCatID.code']} - ${posItem['dictStaffCatID.name']})`
      }
    })
    const orgStructSorted = _.sortBy(orgStruct, ['catIdx', 'idxNum'])

    if (dictFundSourceID) {
      const fundSource = await UB.Repository('ac_dictFundSource')
        .attrs(['dictFundTypeID.name'].concat($App.domainInfo.entities.ac_dictFundSource.dictProgClassID ? ['dictProgClassID.description'] : []))
        .where('organizationID', '=', orgID)
        .where('fundSourceID', '=', dictFundSourceID)
        .selectSingle()
      result.fundName = HR.nameCase.cap(fundSource && fundSource['dictFundTypeID.name'] ? fundSource['dictFundTypeID.name'] + UB.i18n(' фонд') : '')
      if (!result.progClassName) {
        result.progClassName = (fundSource && fundSource['dictProgClassID.description']) || ''
      }
    }
    result.progClassName = HR.nameCase.cap(result.progClassName)

    function getEmpPosPromise () {
      return UB.Repository('hr_employeePositionS')
        .attrs(['ID', 'employeeNumberID', 'employeeID', 'positionID', 'mtCount', 'accrualSum'])
        .where('isActive', '=', true)
        .where('organizationID', '=', orgID)
        .where('dateFrom', '<=', onDate4Sql)
        .where('dateTo', '>=', onDate4Sql)
        .where('employeeNumberID.dateFrom', '<=', onDate4Sql)
        .where('employeeNumberID.dateTo', '>=', onDate4Sql)
        .where('employeeNumberID.mi_deleteDate', '>=', '#maxdate')
        .where('positionID.mi_dateFrom', '<=', onDate4Sql)
        .where('positionID.mi_dateTo', '>=', onDate4Sql)
        .where('positionID.state', '=', 'ACTIVE')
        .where('positionID.mi_deleteDate', '>=', '#maxdate')
        .notExists(UB.Repository('hr_empLongTermAbsc')
          .correlation('employeeNumberID', 'employeeNumberID')
          .where('organizationID', '=', orgID)
          .where('dateFrom', '<=', onDate4Sql)
          .where('dateTo', '>=', onDate4Sql)
          .where('mi_deleteDate', '>=', '#maxdate'))
    }
    const empPosData = await getEmpPosPromise()
      .orderBy('positionID')
      .orderBy('accrualSum', 'desc')
      .selectAsObject()

    const repParamPref = 'tOrgPayPlan'
    result.minSalarySum = await UB.Repository('hr_dictSalaryMinSize')
      .attrs(['monthValue'])
      .where('[dateFrom]', '<=', onDate4Sql)
      .orderBy('dateFrom', 'desc')
      .limit(1)
      .selectScalar() || 0
    const eduData = await UB.Repository('hr_employeeEducation')
      .attrs(['employeeID', 'dictEducationLevelID.educationType'])
      .where('dictEducationLevelID.educationType', '=', '1')
      .exists(getEmpPosPromise().correlation('employeeID', 'employeeID'))
      .selectAsObject({
        'dictEducationLevelID.educationType': 'educationType'
      })
    const empExpData = await UB.Repository('hr_employeeExperience')
      .attrs(['employeeID', 'dictExperienceID', 'calcDate'])
      .exists(getEmpPosPromise().correlation('employeeID', 'employeeID'))
      .selectAsObject()

    const repCode = '06'
    const payelData = await HR.accrualService.accrualSumGetPayElData(onDate4Sql, repCode)
    const payelExpData = await HR.accrualService.getPayelExpData(onDate4Sql, repCode)

    /* Надбавки для окладу беруться з налагоджень для звіту "05 Тарифікація" */
    const basepayData = HR.accrualService.accrualSumInit('tariffing')
    const payelData4Basepay = await HR.accrualService.accrualSumGetPayElData(onDate4Sql, '07')
    await HR.accrualService.accrualSumFill(basepayData, orgID, onDate4Sql, { repCode: '07' })

    const accrualData = {
      addpay6: {
        code: repParamPref + '6',
        baseSumFrom: ['basepay'],
        elms: [],
        payPerm: [],
        posData: [],
        hasData: true
      },
      addpay7: {
        code: repParamPref + '7',
        baseSumFrom: ['basepay'],
        elms: [],
        payPerm: [],
        posData: [],
        hasData: true,
        getPercentByElmExp: HR.accrualService.getPercentByElmExp
      },
      addpay8: {
        code: repParamPref + '8',
        baseSumFrom: ['basepay'],
        elms: [],
        payPerm: [],
        posData: [],
        hasData: true
      },
      addpay9: {
        hasData: false,
        minSalarySum: result.minSalarySum
      }
    }
    await HR.accrualService.accrualSumFill(accrualData, orgID, onDate4Sql, { repCode })

    const empRanks = await HR.accrualService.accrualSumGetEmpRanks({ onDate: onDate4Sql, empPosPromise: getEmpPosPromise() })
    const dictSalaryRanks = await HR.accrualService.accrualSumGetDictSalaryRanks(onDate4Sql)
    const specPayMethods = HR.accrualService.accrualSumGetSpecPayMethods({ empRanks, dictSalaryRanks })

    const signerChief = await HR.reportUtils.getRefSignerInfo(orgID, onDate4Sql)
    let respPosPrefix = (respEmpPositionID !== respPositionID) ? UB.i18n('В.о. ') : ''
    let respPosName = (respPosPrefix.length > 0) ? respPositionNameGen || respPositionName : respPositionName
    result.signerChiefPos = (respPositionID ? respPosPrefix + respPosName : (signerChief && signerChief['positionID.name'])) || ''
    result.signerChiefEmp = respEmpName || ''
    const signerAccChief = await HR.reportUtils.getRefSignerInfo(orgID, onDate4Sql, undefined, undefined, 'accChief')
    if (signerAccChief) {
      result.signerAccChiefPos = signerAccChief['positionID.name']
      result.signerAccChiefEmp = signerAccChief['employeeID.shortFIO']
    }
    const signer4EmpOrder = await HR.reportUtils.getRefSignerInfo(orgID, onDate4Sql, undefined, undefined, 'signer4EmpOrder')
    if (signer4EmpOrder) {
      result.signer4EmpOrderPos = signer4EmpOrder['positionID.name']
      result.signer4EmpOrderEmp = signer4EmpOrder['employeeID.shortFIO']
    }

    const tree = me.generateDataForReport({
      rootID: orgID,
      orgStruct: orgStructSorted,
      posData,
      empPosData,
      accrualData,
      basepayData,
      specPayMethods,
      eduData,
      payelData,
      payelData4Basepay,
      empExpData,
      payelExpData,
      monthsFop,
      onDate,
      depFilter,
      isMed
    })
    result.data = tree.data || []
    result.quantity = tree.quantity
    result.fundSum1 = AC.currencyService.formatAsCurrencyEx(tree.fundSum1, 2, '.')
    result.fundSum1InWords = AC.currencyService.currencyToWordsUkr(tree.fundSum1)

    HR.reportUtils.clearZeroes(result, ['quantity', 'basepay', 'addpay6', 'addpay7', 'addpay8', 'addpay9', 'fundSum1', 'fundSum2'])
    reportObj = result
    return result
  },
  onParamPanelConfig: function () {
    const initialDate = appAC.globalApplicationDate()
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      listeners: {
        render: function (form) {
          const reportViewer = form.ownerCt
          reportViewer.exportToXLSX = exportToXLSX
        }
      },
      items: [
        HR.controlService.getCollapseInfoPanel('Звіт формується по даним по окладу та нарахуванням, які взяті з призначень працівників на посади станом на вказану дату. Якщо посада вакантна, то дані беруться з картки вакантної посади станом на вказану дату.'),
        {
          xtype: 'panel',
          layout: { type: 'vbox' },
          defaults: { labelWidth: 150 },
          items: [
            HR.controlService.getOrgCombo({
              labelWidth: 150,
              width: 650,
              allowBlank: false,
              disableContextMenu: true,
              readOnly: true,
              addFields: ['nameGen', 'nameDat', 'name'],
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
            HR.controlService.get2DepCombo({
              labelWidth: 150,
              width: 650
            }),
            HR.controlService.getFundSourceCombo({
              labelWidth: 150,
              width: 650
            }),
            HR.controlService.getProgClassCombo({
              labelWidth: 150,
              width: 650
            }),
            {
              xtype: 'datefield',
              name: 'onDate',
              fieldLabel: UB.i18n('Станом на'),
              value: initialDate,
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
              width: 270,
              minValue: 1,
              maxValue: 1200,
              value: 6
            },
            HR.controlService.getRespPosEmpCombos({
              labelWidth: 150,
              width: 650
            })
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const orgIDCtrl = frm.findField('organizationID')
        const structDepCtrl = frm.findField('structDepID')
        const childDepCtrl = frm.findField('childDepID')
        const dictProgClassCtrl = owner.down('[name=dictProgClass]')
        const respPositionIDCtrl = frm.findField('respPositionID')
        const respEmpIDCtrl = frm.findField('respEmpID')
        let structDepID = structDepCtrl.getValue()
        const childDepID = childDepCtrl.getValue()
        let structDepName
        const childDepName = (childDepID && childDepCtrl.getFieldValue('nameGen') && childDepCtrl.getFieldValue('nameGen').trim()) || childDepCtrl.getFieldValue('name')
        if (childDepID && !structDepID) {
          structDepID = childDepCtrl.getFieldValue('parentUnitID')
          const structDepReco = structDepCtrl.getStore().data.items.find(rec => rec.get('mi_data_id') === structDepID)
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
          dictFundSourceID: frm.findField('dictFundSourceID').getValue()
        }
      }
    })
    reportObj = undefined
    return paramForm
  },
  generateDataForReport: function ({ rootID, orgStruct, posData, empPosData, accrualData, basepayData, specPayMethods,
    eduData, payelData, payelData4Basepay, empExpData, payelExpData, monthsFop, onDate, depFilter, isMed }) {
    const medStaffCats = ['1', '2', '3']
    const maxDepTypeLen = 37
    const mainDeptRowStyle = 'height: 36px;'
    const catData = HR.reportUtils.getPosCategories({ isMed, initObj: { fundSum1: 0, fundSum2: 0, ids: [] }, posData })
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()
    function initSum (obj) {
      Object.keys(accrualData).forEach(key => {
        let accrualItem = accrualData[key]
        if (accrualItem.hasData) {
          obj[key] = 0
        }
      })
    }

    function getData (parentID, level = 1) {
      const result = {
        level: level,
        data: [],
        quantity: 0,
        fundSum1: 0,
        fundSum2: 0,
        catData: _.cloneDeep(catData)
      }

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
          mi_data_id: orgItem.mi_data_id,
          name: orgItem.name,
          html: isDept ? `${identHtml}${styleBegin}${level === 1 ? (orgItem.name || '').toUpperCase()
            : HR.nameCase.cap(orgItem.name || '')}${styleEnd}` : '',
          isDepartment: isDept,
          isTotal: false,
          level: level,
          depType: orgItem.depType || '',
          rowStyle: (level <= 2) ? mainDeptRowStyle : ''
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
            let staffCatCode = posItem['dictStaffCatID.code']

            const empPos = empPosData.filter(item => item.positionID === posItem.mi_data_id)
            let posBasepay = notShowSalary ? 0 : (posItem.accrualSum || 0)
            let posQnt = posItem.quantity || 0
            if (empPos.length === 0) {
              obj1.basepay = posBasepay
              obj1.quantity = posQnt
            } else {
              let empQntSum = 0
              for (let i = 0; i < empPos.length; i++) {
                let empPosItem = empPos[i]
                let empQnt = empPosItem.mtCount || 0
                let empBasepay = notShowSalary ? 0 : (empPosItem.accrualSum || 0)
                empQntSum += empQnt
                if (i === 0) {
                  obj1.empPosID = empPosItem.ID
                  obj1.quantity = empQnt
                  obj1.basepay = empBasepay
                  initSum(obj1)
                } else {
                  let newObj
                  newObj = Object.assign({}, obj1)
                  newObj.empPosID = empPosItem.ID
                  newObj.quantity = empQnt
                  newObj.basepay = empBasepay
                  initSum(newObj)
                  objs.push(newObj)
                }
              }
              if (posQnt > empQntSum) {
                // вакансія
                let newObj
                newObj = Object.assign({}, obj1)
                newObj.isEmpVac = true
                newObj.empPosID = undefined
                newObj.quantity = posQnt - empQntSum
                newObj.basepay = posBasepay
                initSum(newObj)
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
                    let empSum = notShowSalary ? 0 : HR.accrualService.accrualSumGetEmpSum({
                      accrualItem,
                      accumObj: obj,
                      employeeID: empPosItem.employeeID,
                      employeeNumberID: empPosItem.employeeNumberID,
                      empPosAccrualSum: notShowSalary ? 0 : empPosItem.accrualSum,
                      payelData: payelData4Basepay,
                      specPayMethods,
                      empExpData,
                      payelExpData,
                      onDate
                    })
                    obj[key] = empSum
                  }
                }
              } else {
                // Посада вакантна
                if (accrualItem.hasData) {
                  let posSum = notShowSalary ? 0 : HR.accrualService.accrualSumGetPosSum({
                    accrualItem,
                    accumObj: obj1,
                    positionID: posItem.ID,
                    posAccrualSum: notShowSalary ? 0 : posBasepay
                  })
                  obj1[key] = posSum
                }
              }
            })
            objs.forEach(obj => {
              obj.basepay = notShowSalary ? 0 : HR.accrualService.accrualSumGetBasepayByObj(obj)
            })
            /* Заповнення колонок addpay6 - addpay8 */
            Object.keys(accrualData).forEach(key => {
              let accrualItem = accrualData[key]
              if (empPos.length > 0) {
                // Існують призначення
                for (let i = 0; i < empPos.length; i++) {
                  let empPosItem = empPos[i]
                  if (accrualItem.hasData) {
                    let obj = objs[i]
                    let empSum = notShowSalary ? 0 : HR.accrualService.accrualSumGetEmpSum({
                      accrualItem,
                      accumObj: obj,
                      employeeID: empPosItem.employeeID,
                      employeeNumberID: empPosItem.employeeNumberID,
                      empPosAccrualSum: notShowSalary ? 0 : empPosItem.accrualSum,
                      payelData,
                      specPayMethods,
                      empExpData,
                      payelExpData,
                      onDate
                    })
                    obj[key] = empSum || 0
                  }
                }
              } else {
                // Посада вакантна
                if (accrualItem.hasData) {
                  let posAddPay = 0
                  let accrualPosData = accrualItem.posData.filter(item => item.positionID === posItem.ID && accrualItem.elms.includes(item.payElID))
                  accrualPosData.forEach(accrItem => {
                    if (accrItem.accrualRate) {
                      posAddPay += accrItem.accrualRate * (notShowSalary ? 0 : (posItem.accrualSum || 0)) / 100
                    } else {
                      posAddPay += notShowSalary ? 0 : (accrItem.accrualSum || 0)
                    }
                  })
                  obj1[key] = posAddPay || 0
                }
              }
            })

            // Групування та формування ітогів
            objs.forEach(obj => {
              // Визначення назви посади, якщо попередня вже така була, то не виводимо назву
              let prevItem = result.data.length && result.data[result.data.length - 1]
              const isExistedNameObj = prevItem && prevItem.isPosition && prevItem.dictPositionID === obj.dictPositionID &&
                prevItem.name === obj.name /* if dictPositionID === undefined check name */ && prevItem.parentUnitID === obj.parentUnitID
              if (!isExistedNameObj) {
                obj.indexNum = indexNum++
              } else {
                obj.text = obj.isEmpVac ? UB.i18n(' (вакансія)') : ''
                obj.html = obj.isEmpVac ? UB.i18n('&nbsp;(вакансія)') : ''
                obj.profCode = ''
              }
              let minSalPayObj = (accrualData.addpay9.minSalarySum || 0) * obj.quantity
              let fundSum1 = ((obj.basepay || 0) + (obj.addpay6 || 0) + (obj.addpay7 || 0) + (obj.addpay8 || 0)) * obj.quantity
              let addPay9 = notShowSalary ? 0 : (minSalPayObj > fundSum1 ? minSalPayObj - fundSum1 : 0)
              fundSum1 += addPay9
              let fundSum2 = fundSum1 * monthsFop

              const existedRowObj = result.data.find(fItem => fItem.isPosition && fItem.dictPositionID === obj.dictPositionID &&
                fItem.name === obj.name && fItem.parentUnitID === obj.parentUnitID && fItem.basepay === obj.basepay &&
                fItem.addpay6 === obj.addpay6 && fItem.addpay7 === obj.addpay7 && fItem.addpay8 === obj.addpay8)
              if (!existedRowObj) {
                obj.addpay9 = addPay9 || undefined
                obj.fundSum1 = fundSum1
                obj.fundSum2 = fundSum2
                result.data.push(obj)
              } else {
                existedRowObj.quantity += obj.quantity
                let minSalPayGrp = (accrualData.addpay9.minSalarySum || 0) * existedRowObj.quantity
                let fundSum = ((existedRowObj.basepay || 0) + (existedRowObj.addpay6 || 0) + (existedRowObj.addpay7 || 0) + (existedRowObj.addpay8 || 0)) * existedRowObj.quantity
                addPay9 = notShowSalary ? 0 : (minSalPayGrp > fundSum ? minSalPayGrp - fundSum : 0)
                existedRowObj.addpay9 = addPay9 || undefined
                fundSum += addPay9
                existedRowObj.fundSum1 = fundSum
                existedRowObj.fundSum2 = existedRowObj.fundSum1 * monthsFop
              }

              /* Ітоги безпосереднього підрозділу */
              result.quantity += obj.quantity
              result.fundSum1 += fundSum1
              result.fundSum2 += fundSum2
              if (isMed) {
                if (staffCatCode && medStaffCats.includes(staffCatCode)) {
                  // Категорії: 1 - Лікарі, 2 - Середній медперсонал, 3 - Молодший медперсонал
                  let catItem = result.catData.find(itm => itm.code === staffCatCode)
                  if (catItem) {
                    catItem.quantity += obj.quantity
                    catItem.fundSum1 += fundSum1
                    catItem.fundSum2 += fundSum2
                    catItem.ids.push(posItem.ID)
                  }
                } else {
                  let highEduCount = 0
                  const objEmpPos = (empPos.length > 0) && obj.empPosID && empPos.find(itm => itm.ID === obj.empPosID)
                  if (objEmpPos) {
                    let hasHighEdu = eduData.find(eduItem => eduItem.employeeID === objEmpPos.employeeID)
                    if (hasHighEdu) {
                      highEduCount += objEmpPos.mtCount || 0
                    }
                  }
                  let otherCount = obj.quantity - highEduCount
                  // Інші спеціалісти з в/о
                  let cat4Item = result.catData.find(itm => itm.code === undefined && itm.hasHighEdu === true)
                  let other4Coef = (1.0 * highEduCount) / obj.quantity
                  cat4Item.quantity += highEduCount
                  cat4Item.fundSum1 += AC.currencyService.round(fundSum1 * other4Coef, 2)
                  cat4Item.fundSum2 += AC.currencyService.round(fundSum2 * other4Coef, 2)
                  // Інші
                  let cat5Item = result.catData.find(itm => itm.code === undefined && !itm.hasHighEdu)
                  let other5Coef = (1.0 * otherCount) / obj.quantity
                  cat5Item.quantity += otherCount
                  cat5Item.fundSum1 += AC.currencyService.round(fundSum1 * other5Coef, 2)
                  cat5Item.fundSum2 += AC.currencyService.round(fundSum2 * other5Coef, 2)
                }
              } else {
                let catItem = result.catData.find(itm => itm.code === staffCatCode)
                if (catItem) {
                  catItem.quantity += obj.quantity
                  catItem.fundSum1 += fundSum1
                  catItem.fundSum2 += fundSum2
                  catItem.ids.push(posItem.ID)
                }
              }
            })
          }
        } else {
          const subTree = getData(orgItem.mi_data_id, level + 1)
          let hasPos = !!subTree.data.find(itm => itm.isPosition === true)
          if (hasPos) {
            result.data.push(obj1)
            result.data.push(...subTree.data)

            let depTypeStr = obj1.depType
            if (depTypeStr && depTypeStr.length > maxDepTypeLen) {
              depTypeStr = depTypeStr.substring(0, maxDepTypeLen) + '...'
            }
            let totalName = UB.i18n(`Всього{0}`, depTypeStr ? ' по ' + depTypeStr : '')
            const totalObj = {
              mi_data_id: obj1.mi_data_id,
              name: identStr + totalName,
              text: identStr + totalName,
              html: identHtml + totalName,
              isDepartment: false,
              isTotal: true,
              level: level,
              quantity: subTree.quantity,
              fundSum1: subTree.fundSum1,
              fundSum2: subTree.fundSum2,
              rowStyle: (level <= 2) ? mainDeptRowStyle : ''
            }
            result.data.push(totalObj)
            if (level <= 2) {
              subTree.catData.forEach(catItem => {
                result.data.push({
                  mi_data_id: obj1.mi_data_id,
                  name: identStr + catItem.name,
                  text: identStr + catItem.name,
                  html: identHtml + catItem.name,
                  isDepartment: false,
                  isTotal: true,
                  isCatTotal: true,
                  level: level,
                  quantity: catItem.quantity,
                  fundSum1: catItem.fundSum1,
                  fundSum2: catItem.fundSum2
                })
              })
            }
            /* Ітоги підпорядкованих підрозділів */
            result.quantity += subTree.quantity
            result.fundSum1 += subTree.fundSum1
            result.fundSum2 += subTree.fundSum2
            result.catData.forEach(catItem => {
              let subTreeCatItem = subTree.catData.find(itm => itm.id === catItem.id)
              catItem.quantity += subTreeCatItem.quantity
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
        mi_data_id: rootID,
        name: orgTotalName,
        text: orgTotalName,
        html: orgTotalName,
        isDepartment: false,
        isTotal: true,
        isTotalAll: true,
        level: 0,
        quantity: orgTree.quantity,
        fundSum1: orgTree.fundSum1,
        fundSum2: orgTree.fundSum2
      }
      orgTree.data.push(orgTotalObj)
      orgTree.catData.forEach(catItem => {
        orgTree.data.push({
          mi_data_id: rootID,
          name: catItem.name,
          text: catItem.name,
          html: catItem.name,
          isDepartment: false,
          isTotal: true,
          isTotalAll: true,
          isCatTotal: true,
          quantity: catItem.quantity,
          fundSum1: catItem.fundSum1,
          fundSum2: catItem.fundSum2
        })
      })
    }

    return orgTree || {}
  }
}

function exportToXLSX () {
  if (!reportObj) {
    AC.viewUtils.showToast(UB.i18n('Увага'), UB.i18n('Не сформовано звіт'))
    return
  }
  HR.reportUtils.generateExcelReport('hr_report', 'runTypicalOrgPlanByPay', 'TypicalOrgPlan.xlsx', reportObj)
}
