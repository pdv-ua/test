/* global Ext _ UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const organizationID = appAC.globalOrganization() || 0
    const departmentID = reportParams.departmentID || 0
    const experienceID = reportParams.experienceID || 0
    const workPlaceID = reportParams.workPlaceID || ''
    const dictFundSourceID = reportParams.dictFundSourceID || 0
    const onDate = AC.dateService.unshiftDate(reportParams.onDate)
    const result = {
      orgUnits: [],
      showAccrual: reportParams.showAccrual || false,
      showTotals: true,
      organizationName: '',
      departmentName: reportParams.departmentName || '',
      fundSourceName: reportParams.dictFundSourceName || '',
      progClassName: reportParams.dictProgClass || '',
      fundName: reportParams.dictFundTypeName ? reportParams.dictFundTypeName + UB.i18n(' фонд') : '',
      experienceName: reportParams.experienceName || '',
      workPlaceName: reportParams.workPlaceName || '',
      tableWidth: reportParams.showAccrual || false ? 1880 : 1660,
      colSpan: reportParams.showAccrual || false ? 17 : 15,
      colNums: []
    }
    for (let i = 1; i <= result.colSpan; i++) {
      result.colNums.push({ name: i })
    }
    const onDate4Sql = AC.dateService.shiftDate(onDate)
    const orgName = await UB.Repository('hr_organization')
      .attrs(['nameGen', 'name'])
      .where('mi_data_id', '=', organizationID)
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: onDate4Sql })
      .selectAsObject()
    if (orgName && orgName.length) {
      result.organizationName = orgName[0].nameGen || orgName[0].name || ''
    }
    if (departmentID) {
      const depNames = await UB.Repository('hr_department')
        .attrs(['nameGen', 'name'])
        .where('mi_data_id', '=', departmentID)
        .where('state', '=', 'ACTIVE')
        .misc({ __mip_ondate: onDate4Sql })
        .selectSingle()
      result.departmentName = HR.nameCase.cap((depNames && (depNames.nameGen || depNames.name)) || '')
    }
    result.onDate = AC.dateService.getStringFormatDate(onDate, '', '', UB.i18n(' р.'))

    let orgStruct = UB.Repository('hr_staffUnit')
      .attrs(['mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity'])
      .where('liquidate', '=', 0)
      .where('state', '=', 'ACTIVE')
      /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
      .where('mi_dateFrom', '<=', onDate4Sql)
      .where('mi_dateTo', '>=', onDate4Sql)
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .whereIf(!organizationID, 'parentUnitID', 'isNotNull')
      .orderBy('idxNum')

    if (departmentID && reportParams.includeChildDepts) {
      orgStruct
        .where('mi_treePath', 'like', '/' + departmentID + '/', 'u1')
        .where('mi_data_id', '=', departmentID, 'u2')
        .logic('([u1] or [u2])')
    }
    if (departmentID && !reportParams.includeChildDepts) {
      orgStruct
        .where('parentUnitID', '=', departmentID, 'u1')
        .where('mi_data_id', '=', departmentID, 'u2')
        .where('mi_unityEntity', '=', 'hr_position', 'u3')
        .logic('(([u1] and [u3]) or [u2])')
    }
    orgStruct = await orgStruct.selectAsObject()
    if (!orgStruct) {
      return result
    }

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.showTotals = settingsOrg.showTotals
    result.roundTo = settingsOrg.roundTo
    result.roundToQuantity = settingsOrg.roundToQuantity
    result.namePosition = settingsOrg.namePosition

    let posData = UB.Repository('hr_position')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'name', 'accrualSum', 'quantity', 'dictPositionID.fullName', 'dictPositionID.name', 'dictSpecialtyID'])
      .attrsIf(dictFundSourceID, ['fundSourcePositionID.ID', 'fundSourcePositionID.quantity'])
      .misc({ __mip_ondate: onDate4Sql })
      .where('state', '=', 'ACTIVE')
      .whereIf(organizationID, 'orgID', '=', organizationID)
      .whereIf(dictFundSourceID, 'fundSourcePositionID.dictFundSourceID', '=', dictFundSourceID)
      .orderBy('name')

    if (dictFundSourceID) {
      posData.joinCondition('fundSourcePositionID.mi_deleteDate', '>=', '#maxdate')
    }
    posData = await posData.selectAsObject()

    let empData = UB.Repository('hr_employeePositionS')
      .attrs(['positionID', 'employeeID', 'employeeNumberID', 'dateFrom', 'dateTo', 'employeeID.fullFIO', 'employeeID.birthDate',
        'accrualSum', 'orderID.orderNumber', 'orderID.orderDate', 'orderID.empOrderType', 'orderID.description',
        'changeOrderID.orderNumber', 'changeOrderID.orderDate', 'changeOrderID.empOrderType', 'changeOrderID.description',
        'mtCount', 'workPlace.name', 'employeeID.age', 'positionType', 'dictStaffCatID.name', 'psCatName', 'dictTarifCoeffID.name',
        'positionID.psCategory.shortName', 'workPlace', 'orderID', 'orderID.orderState'
      ])
      .attrsIf(dictFundSourceID, ['fundSourceEmpPosID.ID', 'fundSourceEmpPosID.mtCount'])
      .where('isActive', '=', true)
      .where('employeeID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('orderID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('changeOrderID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(organizationID, 'positionID.orgID', '=', organizationID)
      .whereIf(organizationID, 'positionID.state', '=', 'ACTIVE')
      .whereIf(organizationID, 'positionID.mi_dateFrom', '<=', onDate4Sql)
      .whereIf(organizationID, 'positionID.mi_dateTo', '>=', onDate4Sql)
      .whereIf(organizationID, 'positionID.mi_deleteDate', '>=', '#maxdate')
      .whereIf(workPlaceID, 'workPlace', '=', workPlaceID)
      .whereIf(dictFundSourceID, 'fundSourceEmpPosID.dictFundSourceID', '=', dictFundSourceID)
      .orderBy('positionID')
      .orderBy('employeeID.fullFIO')
    if (dictFundSourceID) {
      empData.joinCondition('fundSourceEmpPosID.mi_deleteDate', '>=', '#maxdate')
    }

    empData = await empData.selectAsObject()

    let employeeIDs = _.compact(_.uniq(empData.map(el => el.employeeID)))
    let employeeEducation = await UB.Repository('hr_employeeEducation')
      .attrs(['ID', 'employeeID', 'dictEducationLevelID.name', 'dictEducationLevelID.educationKind.code', 'dictEducationLevelID.level'])
      .whereIf(employeeIDs && employeeIDs.length > 1024, 'employeeID.organizationID', '=', organizationID)
      .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024, 'employeeID', 'in', employeeIDs)
      .whereIf(!employeeIDs && employeeIDs.length === 0, 'employeeID', '=', 0)
      .selectAsObject({
        'dictEducationLevelID.nominalName': 'nominalName',
        'dictEducationLevelID.name': 'name',
        'dictEducationLevelID.level': 'level',
        'dictEducationLevelID.educationKind.code': 'kind'
      })
    employeeEducation = employeeEducation && employeeEducation.length ? _.groupBy(employeeEducation, 'employeeID') : {}

    const employeeExperience = await UB.Repository('hr_employeeExperience')
      .attrs(['ID', 'employeeID', 'dictExperienceID.code', 'calcDate', 'startCalcDate'])
      .whereIf(experienceID, 'dictExperienceID', '=', experienceID)
      .whereIf(!experienceID, 'dictExperienceID.code', '=', '1')
      .whereIf(employeeIDs && employeeIDs.length > 1024, 'employeeID.organizationID', '=', organizationID)
      .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024, 'employeeID', 'in', employeeIDs)
      .whereIf(!employeeIDs && employeeIDs.length === 0, 'employeeID', '=', 0)
      .selectAsObject()

    // employeeIDs = _.compact(_.uniq(empData.filter(emp => emp.positionType === '8').map(el => el.employeeID)))
    let empCertificationAcc = await UB.Repository('hr_empCertificationAcc')
      .attrs(['ID', 'employeeID', 'dictSpecialtyID', 'dictEmpCategoryID.name', 'certificationDate', 'validityDate',
        'orderAuthor', 'orderDate', 'orderNumber', 'dictSpecialtyID.name'])
      .whereIf(employeeIDs && employeeIDs.length > 1024, 'employeeID.organizationID', '=', organizationID)
      .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024, 'employeeID', 'in', employeeIDs)
      .whereIf(!employeeIDs && employeeIDs.length === 0, 'employeeID', '=', 0)
      .orderBy('certificationDate')
      .selectAsObject()
    empCertificationAcc = empCertificationAcc && empCertificationAcc.length ? _.groupBy(empCertificationAcc, 'employeeID') : {}

    employeeIDs = _.compact(_.uniq(empData.map(el => el.employeeID)))
    let employeeWorkbook = await UB.Repository('hr_employeeWorkbook')
      .attrs(['ID', 'isOrgAppoint', 'dateFrom', 'employeeID', 'appointOrder'])
      .whereIf(employeeIDs && employeeIDs.length > 1024, 'employeeID.organizationID', '=', organizationID)
      .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024, 'employeeID', 'in', employeeIDs)
      .whereIf(!employeeIDs || employeeIDs.length === 0, 'employeeID', '=', 0)
      .where('organizationID', '=', organizationID)
      .where('isOrgAppoint', '=', 1)
      .where('dateFrom', 'isNotNull')
      .orderBy('dateFrom', 'desc')
      .selectAsObject()
    employeeWorkbook = employeeWorkbook && employeeWorkbook.length ? _.groupBy(employeeWorkbook, 'employeeID') : {}

    let firstAppointMove = await UB.Repository('hr_empOrderAppointDet')
      .attrs(['orderID'])
      .whereIf(employeeIDs && employeeIDs.length > 1024, 'employeeID.organizationID', '=', organizationID)
      .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024, 'employeeID', 'in', employeeIDs)
      .whereIf(!employeeIDs || employeeIDs.length === 0, 'employeeID', '=', 0)
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('organizationID', '=', organizationID)
      .where('empOrderType', '=', 'APPOINT_MOVE')
      .where('isMove', '=', 1)
      .selectAsArray()
    firstAppointMove = (firstAppointMove && firstAppointMove.resultData && firstAppointMove.resultData.data) || []

    employeeIDs = _.compact(_.uniq(empData.map(el => el.employeeNumberID)))
    let empLongTermAbsc = await UB.Repository('hr_empLongTermAbsc')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo'])
      .whereIf(employeeIDs && employeeIDs.length > 1024, 'employeeNumberID.orgID', '=', organizationID)
      .whereIf(employeeIDs && employeeIDs.length > 0 && employeeIDs.length < 1024, 'employeeNumberID', 'in', employeeIDs)
      .whereIf(!employeeIDs || employeeIDs.length === 0, 'employeeNumberID', '=', 0)
      .where('organizationID', '=', organizationID)
      .where('employeeNumberID.employeeID.mi_deleteDate', '>=', '#maxdate')
      .where('dateFrom', '<=', onDate4Sql)
      .where('dateTo', '>=', onDate4Sql)
      .selectAsObject()
    empLongTermAbsc = empLongTermAbsc && empLongTermAbsc.length ? _.groupBy(empLongTermAbsc, 'employeeNumberID') : {}

    const tree = me.generateDataForReport(departmentID || organizationID, orgStruct, posData, empData, employeeEducation,
      employeeExperience, empCertificationAcc, employeeWorkbook, firstAppointMove, empLongTermAbsc, onDate, result.roundTo,
      result.roundToQuantity, result.showAccrual, result.showTotals ? 2 : 1, result.namePosition)
    result.data = tree && tree.data ? tree.data : []
    // result.totalBasepay = tree.basepay
    // result.totalQuantity = tree.quantity
    // result.roundToQuantityPos = result.roundToQuantity || HR.reportUtils.getQuantityFractional(result.totalQuantity)
    // result.totalMtCount = tree.mtCount
    // result.roundToQuantity = result.roundToQuantity || HR.reportUtils.getQuantityFractional(result.totalMtCount)

    return result
  },
  onParamPanelConfig: function () {
    const incomeParams = this.incomeParams || {}
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()

    const me = this
    me.paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              layout: { type: 'hbox' },
              items: [
                HR.controlService.getDepCombo({
                  labelWidth: 190,
                  width: 540,
                  filterByGlobalOrg: true,
                  flex: 1,
                  displayField: 'description',
                  listeners: {
                    change: function (ctrl, value) {
                      const form = ctrl.up('form')
                      form.down('[name=includeChildDepts]').setReadOnly(!value)
                      if (!value) {
                        form.down('[name=includeChildDepts]').setValue()
                      }
                    }
                  }
                }),
                HR.controlService.getIncludeChildDepts()
              ]
            },
            {
              xtype: 'ubcombobox',
              name: 'dictFundSourceID',
              fieldLabel: UB.i18n('Джерело фінансування'),
              labelWidth: 190,
              width: 500,
              hideEntityItemInContext: true,
              gridFieldList: ['ID', 'name', 'description'],
              valueField: 'ID',
              displayField: 'name',
              ubRequest: {
                entity: 'ac_fundSource',
                method: 'selectByOrg',
                fieldList: ['ID', 'name', 'dictFundTypeName', 'dictProgClass']
              },
              listeners: {
                afterrender: function (ctrl) {
                  ctrl.store.ubRequest.orgID = appAC.globalOrganization()
                }
              }
            },
            {
              xtype: 'ubcombobox',
              name: 'workPlaceID',
              fieldLabel: UB.i18n('Місце роботи'),
              labelWidth: 190,
              width: 540,
              valueField: 'code',
              displayField: 'name',
              allowBlank: true,
              ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['ID', 'name', 'code', 'eGroup'],
                whereList: {
                  enumGroupFilter: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: {
                      val: 'HR_WORKER_PLACE'
                    }
                  }
                }
              }
            },
            {
              layout: { type: 'hbox' },
              items: [
                {
                  xtype: 'datefield',
                  name: 'onDate',
                  labelWidth: 190,
                  width: 300,
                  fieldLabel: UB.i18n('Станом на'),
                  allowBlank: false,
                  value: appAC.globalApplicationDate()
                }
              ]
            },
            {
              xtype: 'ubcombobox',
              name: 'experienceID',
              fieldLabel: UB.i18n('Інформація про стаж'),
              labelWidth: 190,
              width: 540,
              gridFieldList: ['code', 'name'],
              displayField: 'name',
              allowBlank: true,
              ubRequest: {
                entity: 'hr_dictExperience',
                fieldList: ['ID', 'code', 'name'],
                orderList: { orderBy: { expression: 'name' } }
              }
            },
            {
              xtype: 'checkboxfield',
              name: 'showAccrual',
              fieldLabel: UB.i18n('Показати оклади'),
              labelWidth: 190,
              value: false,
              hidden: notShowSalary
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        const dictFundSourceID = frm.findField('dictFundSourceID')
        const reco = AC.gridUtils.getCurrentRecord(dictFundSourceID)
        const dictFundTypeName = reco && reco.get('dictFundTypeName')
        const dictProgClass = reco && reco.get('dictProgClass')
        const params = {
          departmentID: frm.findField('departmentID').getValue() || 0,
          includeChildDepts: frm.findField('includeChildDepts').getValue() || false,
          departmentName: frm.findField('departmentID').getRawValue() || '',
          onDate: frm.findField('onDate').getValue() || AC.dateService.todayDate(),
          experienceID: frm.findField('experienceID').getValue() || 0,
          experienceName: frm.findField('experienceID').getRawValue() || '',
          workPlaceID: frm.findField('workPlaceID').getValue() || 0,
          workPlaceName: frm.findField('workPlaceID').getRawValue() || 0,
          showAccrual: frm.findField('showAccrual').getValue() === true,
          dictFundSourceID: frm.findField('dictFundSourceID').getValue(),
          dictFundSourceName: frm.findField('dictFundSourceID').getRawValue(),
          dictFundTypeName: dictFundTypeName,
          dictProgClass: dictProgClass
        }
        // помилка в UBReport.prototype.makeReport, при експорті в Excel параметри беруться з incomeParams, а не з getParameters()
        owner.ownerCt.report.incomeParams = params
        return params
      }
    })
    me.paramForm.on('afterrender', () => {
      if (incomeParams.dictFundSourceID) {
        me.paramForm.down('[name=dictFundSourceID]').setValueById(incomeParams.dictFundSourceID)
      }
    })
    return me.paramForm
  },
  generateDataForReport: function (itemID, orgStruct, positionData, empData, employeeEducation, employeeExperience, empCertificationAcc,
    employeeWorkbook, firstAppointMove, empLongTermAbsc, onDate, roundTo, roundToQuantity, showAccrual, showLevelTotals, namePosition) {
    if (!orgStruct || !orgStruct.length) return {}
    const roundQ = roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2
    const roundS = roundTo === 'numberGroup' ? 0 : 2
    const notShowSalary = AC.entityUtils.verifyRightsMethod('hr_service', 'notShowSalary') && !AC.entityUtils.isAdmin()

    function getEmpPosData (empItem, posSpecialtyID) {
      const empName = HR.reportUtils.formatFullName(empItem['employeeID.fullFIO'], false, [' ', '<br/>'])
      const workbook = employeeWorkbook[empItem.employeeID] ? _.sortBy(employeeWorkbook[empItem.employeeID], 'dateFrom').reverse()[0] : undefined
      let acceptNumDate = ''
      let orderTitle
      let acceptItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
          ['POSTED', 'PROCESSED'].includes(emp['orderID.orderState']) &&
          emp.dateFrom <= onDate && ['APPOINT', 'MOVE', 'APPOINT_MOVE'].includes(emp['orderID.empOrderType']) && !firstAppointMove.includes(emp.orderID))
      if (!acceptItems || !acceptItems.length) {
        if (empItem.workPlace === '2') {
          acceptItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
            ['POSTED', 'PROCESSED'].includes(emp['orderID.orderState']) &&
            emp.dateFrom <= onDate && (emp['orderID.empOrderType'] === 'PLURALIST' || emp['orderID.empOrderType'] === null))
        } else {
          acceptItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
            emp.dateFrom <= onDate && emp['orderID.empOrderType'] === null)
        }
      }
      const acceptItem = acceptItems && acceptItems.length ? _.orderBy(acceptItems, ['dateFrom'], ['desc'])[0] : []
      let empOrderType
      if (acceptItem) {
        empOrderType = acceptItem['orderID.empOrderType']
        if (empOrderType) {
          orderTitle = empOrderType === 'MOVE' ? UB.i18n('Наказ на переміщення') : (empOrderType === 'APPOINT' || empOrderType === 'APPOINT_MOVE'
            ? UB.i18n('Наказ про прийом') : UB.i18n('Наказ про сумісництво'))
          const orderNumber = acceptItem['orderID.orderNumber'] ? `<br/>№ ${acceptItem['orderID.orderNumber']}` : ''
          const orderDate = acceptItem['orderID.orderDate'] ? UB.i18n(` від {0}`, AC.dateService.formatDate(acceptItem['orderID.orderDate'])) : ''
          acceptNumDate = ['APPOINT', 'MOVE', 'PLURALIST', 'APPOINT_MOVE'].includes(empOrderType) ? `${orderTitle}${orderNumber}${orderDate}` : ''
        } else {
          acceptNumDate = acceptItem['orderID.description'] || ''
        }
      }
      if (!acceptNumDate && workbook) {
        acceptNumDate = `${AC.dateService.formatDate(workbook.dateFrom)}${workbook.appointOrder ? '; ' + workbook.appointOrder : ''}`
      }

      let fireNumDate = ''
      let empChangeOrderType
      let fireItems = empData.filter(emp => emp.employeeNumberID === empItem.employeeNumberID && emp.positionID === empItem.positionID &&
          ['POSTED', 'PROCESSED'].includes(emp['orderID.orderState']) &&
          emp.dateFrom <= onDate && (['MOVE', 'DISM'].includes(emp['changeOrderID.empOrderType'])))
      if (fireItems.length > 1) {
        fireItems = _.orderBy(fireItems, ['dateFrom'], ['desc'])
      }
      const fireItem = fireItems[0]
      if (fireItem) {
        empChangeOrderType = fireItems['changeOrderID.empOrderType']
        if (empChangeOrderType) {
          orderTitle = empChangeOrderType === 'MOVE' ? UB.i18n('Наказ на переміщення') : UB.i18n('Наказ про звільнення')
          const orderNumber = fireItem['changeOrderID.orderNumber'] ? `<br/>№ ${fireItem['changeOrderID.orderNumber']}` : ''
          const orderDate = fireItem['changeOrderID.orderDate'] ? UB.i18n(` від {0}`, AC.dateService.formatDate(fireItem['changeOrderID.orderDate'])) : ''
          fireNumDate = ['MOVE', 'DISM'].includes(empChangeOrderType) ? `${orderTitle}${orderNumber}${orderDate}` : ''
        } else {
          fireNumDate = fireItem['changeOrderID.description'] || ''
        }
      }

      let education = ''
      if (employeeEducation[empItem.employeeID]) {
        let educations = employeeEducation[empItem.employeeID].filter(el => el.kind === '1')
        if (educations && educations.length) {
          educations = _.orderBy(educations, ['level'], ['desc'])
        } else {
          educations = employeeEducation[empItem.employeeID]
          educations = _.orderBy(educations, ['ID'], ['desc'])
        }
        education = educations[0].nominalName || educations[0].name
      }
      let experience = ''
      const empExperience = employeeExperience.find(o => o.employeeID === empItem.employeeID)
      if (empExperience && empExperience.calcDate) {
        const ymd = AC.dateService.getYmd(empExperience.calcDate, empExperience.startCalcDate && empExperience.startCalcDate < onDate ? empExperience.startCalcDate : onDate, true)
        experience = ymd.years + UB.i18n('р.') + (ymd.months > 0 && ymd.months < 10 ? '0' : '') + ymd.months + UB.i18n('м.') + ymd.days + UB.i18n('д.')
      }

      const mtCount = (empItem['fundSourceEmpPosID.ID'] ? empItem['fundSourceEmpPosID.mtCount'] : empItem.mtCount) || 0
      let qnt = !roundToQuantity ? mtCount : AC.currencyService.round(mtCount, roundQ)
      let notes = ''
      let isTempVac = false
      if (empLongTermAbsc && empLongTermAbsc[empItem.employeeNumberID]) {
        notes = UB.i18n('Відсутність ') + empLongTermAbsc[empItem.employeeNumberID].map(el => {
          return `${UB.i18n('з&nbsp;')}${AC.dateService.formatDate(el.dateFrom)}${el.dateTo ? (AC.dateService.formatDate(el.dateTo) === '31.12.9999' ? '' : UB.i18n(' по&nbsp;') + AC.dateService.formatDate(el.dateTo)) : ''}`
        }).join(', ')
        qnt = 0
        isTempVac = true
      }
      let category = ''
      if (empItem.positionType === '1') {
        category = empItem['positionID.psCategory.shortName'] || '' // empItem['dictStaffCatID.name']
      } else {
        if (empCertificationAcc[empItem.employeeID]) {
          let sertifications = empCertificationAcc[empItem.employeeID].filter(el => el.dictSpecialtyID === posSpecialtyID)
          if (!sertifications || !sertifications.length) {
            sertifications = empCertificationAcc[empItem.employeeID]
          }
          sertifications = _.orderBy(sertifications, ['certificationDate'], ['desc'])
          category = sertifications[0]['dictEmpCategoryID.name'] || ''
          const orderInfo = _.compact([
            sertifications[0]['orderAuthor'] || '',
            sertifications[0]['orderNumber'] || '',
            sertifications[0]['orderDate'] ? AC.dateService.formatDate(sertifications[0]['orderDate']) : '',
            sertifications[0]['dictSpecialtyID.name'] ? `(${sertifications[0]['dictSpecialtyID.name']})` : ''
          ]).join(' ')
          if (orderInfo.length) {
            category += (category.length ? ', ' : ' ') + orderInfo
          }
        }
      }
      return {
        empName: empName,
        birthDate: empItem['employeeID.birthDate'] ? AC.dateService.formatDate(empItem['employeeID.birthDate']) : '',
        age: empItem['employeeID.age'] ? empItem['employeeID.age'] : '',
        mtCount: qnt,
        roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(qnt),
        workPlace: empItem['workPlace.name'] || '',
        education: education,
        experience: experience,
        category: category,
        acceptNumDate: acceptNumDate,
        fireNumDate: fireNumDate,
        dictTarifCoeff: empItem['dictTarifCoeffID.name'] || '',
        notes: notes,
        basepay: notShowSalary ? 0 : AC.currencyService.round(empItem.accrualSum || 0, roundS),
        isTempVac: isTempVac
      }
    }

    function getData (indexNpp, parentID, level = 1) {
      const result = {
        data: [],
        roundTo: roundTo,
        basepay: 0,
        quantity: 0,
        mtCount: 0
      }
      const curStruct = orgStruct.filter(el => el.parentUnitID === parentID)
      const str = level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)
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
      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity !== 'hr_department') {
          const posItem = positionData ? _.find(positionData, { mi_data_id: orgItem.mi_data_id }) : undefined
          if (posItem) {
            let qnt = (posItem['fundSourcePositionID.ID'] ? posItem['fundSourcePositionID.quantity'] : posItem.quantity) || 0
            qnt = !roundToQuantity ? qnt : AC.currencyService.round(qnt, roundQ)
            const basepay = notShowSalary ? 0 : AC.currencyService.round(posItem.accrualSum || 0, roundS)

            result.quantity += qnt

            const empItems = empData.filter(emp => emp.positionID === posItem.mi_data_id && emp.dateFrom <= onDate && emp.dateTo >= onDate)
            if (empItems.length) {
              let empItem = empItems[0]
              const empPosData1 = getEmpPosData(empItem, posItem.dictSpecialtyID || 0)
              const resPos = Object.assign(empPosData1, {
                indexNum: indexNpp++,
                isDepartment: false,
                isTotal: false,
                name: namePosition
                  ? HR.nameCase.cap(posItem['name'] || '')
                  : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
                quantity: qnt,
                roundToQuantityPos: roundToQuantity || HR.reportUtils.getQuantityFractional(qnt),
                basepayStr: notShowSalary ? '' : HR.reportUtils.quantityToString(empPosData1.basepay, roundTo),
                accrualSum: basepay,
                accrualSumStr: HR.reportUtils.quantityToString(basepay, roundTo),
                roundTo: roundTo,
                showAccrual: showAccrual,
                colSpan: showAccrual ? 17 : 15,
                emp: []
              })
              result.basepay += resPos.isTempVac ? 0 : resPos.basepay

              result.mtCount += empPosData1.mtCount
              let posEmpCount = empPosData1.mtCount
              for (let j = 1; j < empItems.length; j++) {
                empItem = empItems[j]
                let empPosData2 = getEmpPosData(empItem, posItem.dictSpecialtyID || 0)
                empPosData2 = Object.assign(empPosData2, {
                  basepayStr: notShowSalary ? '' : HR.reportUtils.quantityToString(empPosData2.basepay, roundTo),
                  accrualSum: basepay,
                  accrualSumStr: HR.reportUtils.quantityToString(basepay, roundTo),
                  showAccrual: showAccrual,
                  colSpan: showAccrual ? 17 : 15
                })
                resPos.emp.push(empPosData2)
                result.mtCount += empPosData2.mtCount
                result.basepay += empPosData2.isTempVac ? 0 : empPosData2.basepay
                posEmpCount += empPosData2.mtCount
              }
              const vacCount = qnt - posEmpCount
              if (vacCount > 0) {
                /* Залишок кількості посад - це вакансії */
                const empVacData = {
                  showAccrual: showAccrual,
                  colSpan: showAccrual ? 17 : 15,
                  empName: `(${UB.i18n('вакансія')})`,
                  birthDate: '',
                  age: '',
                  mtCount: vacCount,
                  roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(vacCount),
                  workPlace: '',
                  education: '',
                  experience: '',
                  category: '',
                  acceptNumDate: '',
                  fireNumDate: '',
                  dictTarifCoeff: '',
                  notes: '',
                  basepayStr: '',
                  accrualSumStr: '',
                  isTempVac: false
                }
                resPos.emp.push(empVacData)
              }
              result.data.push(resPos)
            } else {
              result.data.push({
                indexNum: indexNpp++,
                isDepartment: false,
                isTotal: false,
                name: namePosition
                  ? HR.nameCase.cap(posItem['name'] || '')
                  : HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
                quantity: qnt,
                roundToQuantityPos: roundToQuantity || HR.reportUtils.getQuantityFractional(qnt),
                basepay: 0,
                accrualSum: basepay,
                roundTo: roundTo,
                showAccrual: showAccrual,
                colSpan: showAccrual ? 17 : 15,
                empName: `(${UB.i18n('вакансія')})`,
                birthDate: '',
                age: '',
                mtCount: null,
                roundToQuantity: null,
                workPlace: '',
                education: '',
                experience: '',
                category: '',
                acceptNumDate: '',
                fireNumDate: '',
                dictTarifCoeff: '',
                notes: '',
                basepayStr: '',
                accrualSumStr: '',
                emp: []
              })
            }
          }
        } else {
          const obj = {
            name: `${str}${styleBegin}${orgItem.code ? orgItem.code + ' ' : ''}${level === 1 ? (orgItem.name || '').toUpperCase() : HR.nameCase.cap(orgItem.name || '')}${styleEnd}`,
            unitName: `${orgItem.code ? orgItem.code + ' ' : ''}${HR.nameCase.cap(orgItem.name || '')}`,
            isDepartment: true,
            isTotal: false,
            showAccrual: showAccrual,
            colSpan: showAccrual ? 17 : 15
          }
          result.data.push(obj)

          const subTree = getData(indexNpp, orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            indexNpp = subTree.indexNpp || 1
            result.data.push(...subTree.data)

            if (showLevelTotals > 0 && (level === showLevelTotals || showLevelTotals === 2)) {
              const totalObj = {
                mi_data_id: orgItem.mi_data_id,
                name: UB.i18n(`{0}Всього по "{1}"`, str, obj.unitName),
                isDepartment: false,
                isTotal: true,
                mtCount: subTree.mtCount || 0,
                roundToQuantity: subTree.roundToQuantity,
                quantity: subTree.quantity || 0,
                roundToQuantityPos: subTree.roundToQuantityPos,
                roundTo: roundTo,
                basepay: subTree.basepay,
                basepayStr: HR.reportUtils.quantityToString(subTree.basepay, roundTo),
                showAccrual: showAccrual,
                colSpan: showAccrual ? 17 : 15
              }
              result.data.push(totalObj)
            }
            result.mtCount += subTree.mtCount
            result.quantity += subTree.quantity
            result.basepay += subTree.basepay
          }
        }
      })

      result.roundToQuantity = roundToQuantity || HR.reportUtils.getQuantityFractional(result.mtCount)
      result.roundToQuantityPos = roundToQuantity || HR.reportUtils.getQuantityFractional(result.quantity)
      result.indexNpp = indexNpp
      return result
    }

    const orgTree = getData(1, itemID)
    orgTree.data.push({
      name: UB.i18n('ВСЬОГО'),
      empName: '',
      isDepartment: false,
      isTotal: true,
      mtCount: orgTree.mtCount || 0,
      roundToQuantity: orgTree.roundToQuantity,
      quantity: orgTree.quantity || 0,
      roundToQuantityPos: orgTree.roundToQuantityPos,
      basepay: orgTree.basepay,
      basepayStr: HR.reportUtils.quantityToString(orgTree.basepay, roundTo),
      roundTo: roundTo,
      showAccrual: showAccrual,
      colSpan: showAccrual ? 17 : 15
    })

    return orgTree || []
  }
}
