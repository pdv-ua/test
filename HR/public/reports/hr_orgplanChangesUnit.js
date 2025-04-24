/* global _ UB AC HR appAC Ext */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this
    if (me.incomeParams && reportParams) {
      // для коррекстной выгрузки в Excel
      me.incomeParams = reportParams
    }
    return me.getReportData(reportParams).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (reportParams) {
    const me = this
    const unitID = reportParams.unitID || 0
    const staffTableID = reportParams.staffTableID || 0
    const showCases = reportParams.notShowCases === undefined ? false : !reportParams.notShowCases
    const onDate = AC.dateService.shiftDate(reportParams.onDate) || appAC.globalApplicationDate()
    const positionAttributes = ['ID', 'mi_data_id', 'parentUnitID', 'idxNum', 'dictPositionID', 'dictPositionID.name', 'dictStatePayID',
      'positionType', 'quantity', 'code', 'positionType.name', 'fullName', 'isOrgBoss', 'positionCategory.name',
      'dictStaffCatID.name', 'dictSpecialtyID.name', 'dictEmpCategoryID.name', 'dictTarifCoeffID.name', 'dictFundSourceID.name',
      'accrualSum', 'payElID.name', 'dictWagePayID.name', 'psCategory.name', 'dictStatePayID.name', 'reformer'
    ]
    if (showCases) {
      positionAttributes.push(...['nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc',
        'fullNameNom', 'fullNameGen', 'fullNameDat', 'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc'])
    }
    const result = {
      units: [],
      unitName: '',
      name: ''
    }
    if (!staffTableID || !unitID) {
      return result
    }

    const staffTableData = await UB.Repository('hr_staffTable')
      .attrs(['orgID', 'orderDate', 'orderState', 'orgID.name', 'orgID.nameGen', 'entryOrderID.entryDate',
        'name', 'entryOrderID.orderDate'])
      .joinCondition('orgID.mi_dateFrom', '<=', onDate)
      .joinCondition('orgID.mi_dateTo', '>=', onDate)
      .joinCondition('orgID.mi_deleteDate', '>=', '#maxdate')
      .selectById(staffTableID)

    if (!staffTableData) {
      return result
    }

    const organizationID = staffTableData.orgID || 0
    result.organizationName = staffTableData['orgID.name']
    result.organizationNameGen = staffTableData['orgID.nameGen'] || result.organizationName
    result.orderDate = AC.dateService.getStringFormatDate(staffTableData.orderDate || staffTableData['entryOrderID.entryDate'], '', '', UB.i18n(' року'))
    result.nameStaffTable = staffTableData.name || ''
    const orderState = staffTableData.orderState || ''
    const entryOrderIDentryDate = staffTableData['entryOrderID.entryDate']

    const settingsOrg = await HR.reportUtils.getSettingsOrgForPlans(organizationID)
    result.roundToQuantity = settingsOrg.roundToQuantity

    const deptData = await UB.Repository('hr_department')
      .attrs(['ID', 'dictDepTypeID.name', 'departmentKindID.name', 'nameVoc', 'nameLoc', 'nameOr', 'nameAcc',
        'nameDat', 'nameGen', 'nameNom'])
      .where('orgID', '=', organizationID)
      .where('mi_treePath', 'like', '/' + unitID + '/')
      .misc({ __mip_ondate: onDate })
      .joinCondition('dictDepTypeID.mi_deleteDate', '>=', '#maxdate')
      .joinCondition('departmentKindID.mi_deleteDate', '>=', '#maxdate')
      .selectAsObject()

    const staffUnitData = await UB.Repository('hr_staffUnit')
      .attrs(['name'])
      .where('mi_dateFrom', '<=', onDate)
      .where('mi_dateTo', '>=', onDate)
      .selectById(unitID)

    if (staffUnitData) {
      result.unitName = staffUnitData.name || ''
    }
    const newOrgStructFull = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum', 'liquidate', 'mi_treePath',
        'staffOrderID', 'quantity', 'state', 'idxNum', 'fullName'])
      .where('orgID', '=', organizationID)
      .where('state', '=', 'ACTIVE', 'stateAct')
      /* в hr_staffUnit.meta не встановлено аттрибут dataHistory, тому __mip_ondate не працює */
      .where('mi_dateFrom', '<=', onDate, 'dateFrom')
      .where('mi_dateTo', '>=', onDate, 'dateTo')
      .where('staffOrderID', '=', staffTableID || 0, 'order')
      // .where('mi_treePath', 'like', '/' + unitID + '/')
      .notExists(UB.Repository('hr_staffUnit')
        .correlation('mi_data_id', 'mi_data_id')
        .where('staffOrderID', '=', staffTableID)
        // .where('mi_treePath', 'like', '/' + unitID + '/')
        .where('mi_deleteDate', '>=', '#maxdate'), 'notOtherThanOrder')
      .logic('(([stateAct] AND [dateFrom] AND [dateTo] AND [notOtherThanOrder]) OR [order])')
      .orderBy('idxNum')
      .selectAsObject()
    const newOrgStruct = newOrgStructFull.filter(el => el.mi_treePath.indexOf('/' + unitID + '/') !== -1)

    /* Старі посади на onDate. Вважається, що нові зміни будуть введені в дію датою onDate */
    const oldOnDate = (orderState === 'POSTED') ? AC.dateService.addDays(onDate, -1) : onDate
    const oldOrgStructFull = await UB.Repository('hr_staffUnit')
      .attrs(['ID', 'mi_data_id', 'parentUnitID', 'code', 'name', 'mi_unityEntity', 'accrualSum', 'liquidate', 'mi_treePath',
        'staffOrderID', 'quantity', 'state', 'idxNum', 'fullName'])
      .where('orgID', '=', organizationID)
      .where('mi_dateFrom', '<=', oldOnDate)
      .where('mi_dateTo', '>=', oldOnDate)
      .where('state', '=', 'ACTIVE')
      // .where('mi_treePath', 'like', '/' + unitID + '/')
      .where('liquidate', '=', 0)
      .selectAsObject()
    // const oldOrgStruct = oldOrgStructFull.filter(el => el.mi_treePath.indexOf('/' + unitID + '/') !== -1)

    const delUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && orgItem.liquidate)
    const addUnits = newOrgStruct.filter(orgItem => orgItem.staffOrderID === staffTableID && !orgItem.liquidate)
    /* В addUnits знаходяться нові та змінені оргодиниці. Змінені оргодиниці з addUnits повинні також попадати в ліквідовані delUnits зі старими окладами */
    const changedUnits = []
    const changedUnitIds = [0]
    addUnits.forEach(addUnit => {
      const currDataID = addUnit.mi_data_id
      // const oldUnit = _.find(oldOrgStruct, { mi_data_id: currDataID })
      const oldUnit = _.find(oldOrgStructFull, { mi_data_id: currDataID })
      if (oldUnit) {
        changedUnits.push(oldUnit)
        changedUnitIds.push(currDataID)
      }
    })

    if (delUnits.length || addUnits.length || changedUnits.length) {
      const addPos = await UB.Repository('hr_position')
        .attrs(positionAttributes)
        .where('orgID', '=', organizationID)
        .where('staffOrderID', '=', staffTableID)
        .where('liquidate', '=', 0)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.name')
        .selectAsObject()
      const pos = await UB.Repository('hr_position')
        .attrs(positionAttributes)
        .where('orgID', '=', organizationID)
        .where('staffOrderID', '=', staffTableID)
        .where('liquidate', '=', 1)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.name')
        .selectAsObject()
      const chgPos = await UB.Repository('hr_position')
        .attrs(positionAttributes)
        .where('orgID', '=', organizationID)
        .where('staffOrderID', '=', staffTableID)
        .where('mi_data_id', 'in', changedUnitIds)
        .misc({ __mip_recordhistory_all: true })
        .orderBy('dictPositionID.name')
        .selectAsObject()
      if (chgPos.length) {
        const chgOldPos = await UB.Repository('hr_position')
          .attrs(positionAttributes)
          .where('orgID', '=', organizationID)
          .where('mi_data_id', 'in', changedUnitIds)
          .where('state', '=', 'ACTIVE')
          .misc({ __mip_ondate: oldOnDate })
          .selectAsObject()
        // Для змінених вузлів дані треба брати з попереднього старого запису
        chgPos.forEach(chgPosItem => {
          const oldPosItem = _.find(chgOldPos, { mi_data_id: chgPosItem.mi_data_id })
          if (oldPosItem) {
            positionAttributes.forEach(item => {
              if (item !== 'ID' && item !== 'mi_data_id') {
                chgPosItem[item] = oldPosItem[item]
              }
            })
          }
        })
      }

      const tree = me.generateDataForReport(unitID, newOrgStruct, delUnits || [], changedUnits || [], addUnits || [], pos || [], chgPos || [], addPos || [], deptData, result.roundTo, result.roundToQuantity, entryOrderIDentryDate, showCases, newOrgStructFull, oldOrgStructFull)
      result.data = tree && tree.data ? tree.data : []
    }
    return result
  },
  onParamPanelConfig: function () {
    const paramForm = Ext.create('UBS.ReportParamForm', {
      collapsible: true,
      items: [
        {
          xtype: 'panel',
          layout: { type: 'vbox', align: 'stretch' },
          items: [
            {
              xtype: 'checkboxfield',
              fieldLabel: UB.i18n('Не виводити відмінки'),
              labelWidth: 160,
              name: 'notShowCases',
              value: true
            }
          ]
        }
      ],
      getParameters: function (owner) {
        const frm = owner.getForm()
        return {
          notShowCases: frm.findField('notShowCases').getValue()
        }
      }
    })
    return paramForm
  },
  generateDataForReport: function (itemID, orgStruct, delUnits, changedUnits, addUnits, delPos, changedPos, addPos, deptData, roundTo, roundToQuantity, entryOrderIDentryDate, showCases, newOrgStructFull, oldOrgStructFull) {
    if (!orgStruct || !orgStruct.length) return {}

    function makeUnit (currentUnit, unitDelete, unitAdd, unitChange, deptData, entryOrderIDentryDate, level) {
      const attributes = [
        { name: UB.i18n('Код'), att: 'code' },
        { name: UB.i18n('Номер за порядком'), att: 'idxNum' },
        { name: UB.i18n('Назва'), att: 'name' },
        { name: UB.i18n('Повна назва'), att: 'fullName' },
        { name: UB.i18n('Підпорядкування'), att: 'parentUnitID' },
        { name: UB.i18n('Тип підрозділу'), att: 'dictDepTypeID.name' },
        { name: UB.i18n('Вид підрозділу'), att: 'departmentKindID.name' },
        { name: UB.i18n('Гранична чисельність'), att: 'quantity' }
      ]
      if (showCases) {
        attributes.push(...[
          { name: UB.i18n('Назва. Називний'), att: 'nameNom' },
          { name: UB.i18n('Назва. Родовий'), att: 'nameGen' },
          { name: UB.i18n('Назва. Давальний'), att: 'nameDat' },
          { name: UB.i18n('Назва. Знахідний'), att: 'nameAcc' },
          { name: UB.i18n('Назва, Орудний'), att: 'nameOr' },
          { name: UB.i18n('Назва. Місцевий'), att: 'nameLoc' },
          { name: UB.i18n('Назва. Кличний'), att: 'nameVoc' }
        ])
      }
      const changesNew = []
      const changesOld = []
      let resultObj

      if (unitChange && unitAdd) {
        const deptItemA = _.find(deptData, { ID: unitAdd.ID })
        const deptItemC = _.find(deptData, { ID: unitChange.ID })
        attributes.forEach(item => {
          if (item.att !== 'code' && item.att !== 'idxNum' && item.att !== 'name' &&
              item.att !== 'fullName' && item.att !== 'quantity' && item.att !== 'parentUnitID') {
            unitAdd[item.att] = deptItemA ? HR.nameCase.cap(deptItemA[item.att] || '') : ''
            unitChange[item.att] = deptItemC ? HR.nameCase.cap(deptItemC[item.att] || '') : ''
          }
          if (unitAdd[item.att] !== unitChange[item.att]) {
            if (item.att === 'parentUnitID') {
              const parentUnitItemA = _.find(newOrgStructFull, { mi_data_id: unitAdd.parentUnitID })
              const parentUnitItemC = _.find(oldOrgStructFull, { mi_data_id: unitChange.parentUnitID })
              changesOld.push(`${item.name}: ${parentUnitItemC ? parentUnitItemC.fullName || '-' : '-'}`)
              changesNew.push(`${item.name}: ${parentUnitItemA ? parentUnitItemA.fullName || '-' : '-'}`)
            } else {
              changesOld.push(`${item.name}: ${unitChange[item.att] || '-'}`)
              changesNew.push(`${item.name}: ${unitAdd[item.att] || '-'}`)
            }
          }
        })
        resultObj = {
          code: unitChange.code || '',
          name: HR.nameCase.cap(unitChange.name || ''),
          oldValue: changesOld.join(';<br />'),
          newValue: changesNew.join(';<br />'),
          typeChange: UB.i18n('Зміна'),
          typeName: getDepTypeName(deptData, unitChange.ID),
          quantity: null,
          roundToQuantity: null,
          anyChnage: true
        }
      } else if (unitAdd || unitDelete) {
        resultObj = {
          code: unitDelete ? unitDelete.code || '' : unitAdd.code || '',
          name: unitDelete ? HR.nameCase.cap(unitDelete.name.toUpperCase() || '') : HR.nameCase.cap(unitAdd.name.toUpperCase() || ''),
          oldValue: unitDelete ? UB.i18n('Діюче') : '',
          newValue: UB.i18n(`{0}{1}`, unitDelete ? 'припинення дії' : 'вступ в дію', entryOrderIDentryDate ? ' з ' + AC.dateService.formatDate(entryOrderIDentryDate) : ''),
          typeChange: unitDelete ? UB.i18n('Виведення') : UB.i18n('Введення'),
          typeName: getDepTypeName(deptData, unitDelete ? unitDelete.ID : unitAdd.ID),
          quantity: null,
          roundToQuantity: null,
          anyChnage: true
        }
      } else {
        resultObj = {
          code: currentUnit.code || '',
          name: HR.nameCase.cap(currentUnit.name.toUpperCase() || ''),
          oldValue: '',
          newValue: '',
          typeChange: '',
          typeName: getDepTypeName(deptData, currentUnit.ID),
          quantity: null,
          roundToQuantity: null,
          anyChnage: false
        }
      }

      resultObj.name = `${level === 1 ? '' : '&nbsp;&nbsp;'.repeat(level - 1)}<b>${resultObj.name}</b>`
      return resultObj
    }

    function addPosItems (posItem, chngItem, resultObj, type, entryOrderIDentryDate, roundTo, roundToQuantity) {
      const attributes = [
        { name: UB.i18n('Тип посади'), att: 'positionType.name', isBoolean: false },
        { name: UB.i18n('Довідник посад'), att: 'dictPositionID.name', isBoolean: false },
        { name: UB.i18n('Довідник посад, повна назва'), att: 'dictPositionID.fullName', isBoolean: false },
        { name: UB.i18n('Номер за порядком'), att: 'idxNum', isBoolean: false },
        { name: UB.i18n('Назва штатної позиції'), att: 'fullName', isBoolean: false },
        { name: UB.i18n('Підпорядкування'), att: 'parentUnitID', isBoolean: false },
        { name: UB.i18n('Кількість посад'), att: 'quantity', isBoolean: false },
        { name: UB.i18n('Керівник організації'), att: 'isOrgBoss', isBoolean: true },
        { name: UB.i18n('Категорія посади'), att: 'positionCategory.name', isBoolean: false },
        { name: UB.i18n('Категорія персоналу'), att: 'dictStaffCatID.name', isBoolean: false },
        { name: UB.i18n('Спеціальність'), att: 'dictSpecialtyID.name', isBoolean: false },
        { name: UB.i18n('Клас персоналу'), att: 'dictEmpCategoryID.name', isBoolean: false },
        { name: UB.i18n('Тарифний розряд'), att: 'dictTarifCoeffID.name', isBoolean: false },
        { name: UB.i18n('Джерело фінансування'), att: 'dictFundSourceID.name', isBoolean: false },
        { name: UB.i18n('Оклад'), att: 'accrualSum', isBoolean: false },
        { name: UB.i18n('Вид оплати'), att: 'payElID.name', isBoolean: false },
        { name: UB.i18n('Тип посади держслужбовця'), att: 'dictWagePayID.name', isBoolean: false },
        { name: UB.i18n('Категорія посади держслужбовця'), att: 'psCategory.name', isBoolean: false },
        { name: UB.i18n('Група оплати праці держслужбовців'), att: 'dictStatePayID.name', isBoolean: false },
        { name: UB.i18n('Фахівці з питань реформ'), att: 'reformer', isBoolean: true }
      ]
      if (showCases) {
        attributes.push(...[
          { name: UB.i18n('Назва. Називний'), att: 'nameNom', isBoolean: false },
          { name: UB.i18n('Назва. Родовий'), att: 'nameGen', isBoolean: false },
          { name: UB.i18n('Назва. Давальний'), att: 'nameDat', isBoolean: false },
          { name: UB.i18n('Назва. Знахідний'), att: 'nameAcc', isBoolean: false },
          { name: UB.i18n('Назва, Орудний'), att: 'nameOr', isBoolean: false },
          { name: UB.i18n('Назва. Місцевий'), att: 'nameLoc', isBoolean: false },
          { name: UB.i18n('Назва. Кличний'), att: 'nameVoc', isBoolean: false },
          { name: UB.i18n('Повна назва. Називний'), att: 'fullNameNom', isBoolean: false },
          { name: UB.i18n('Повна назва. Родовий'), att: 'fullNameGen', isBoolean: false },
          { name: UB.i18n('Повна назва. Давальний'), att: 'fullNameDat', isBoolean: false },
          { name: UB.i18n('Повна назва. Знахідний'), att: 'fullNameAcc', isBoolean: false },
          { name: UB.i18n('Повна назва, Орудний'), att: 'fullNameOr', isBoolean: false },
          { name: UB.i18n('Повна назва. Місцевий'), att: 'fullNameLoc', isBoolean: false },
          { name: UB.i18n('Повна назва. Кличний'), att: 'fullNameVoc', isBoolean: false }
        ])
      }

      if (posItem) {
        const changesNew = []
        const changesOld = []
        const qnt = !roundToQuantity ? posItem.quantity || 0 : AC.currencyService.round(posItem.quantity || 0, roundToQuantity === 'numberGroup' ? 0 : roundToQuantity === 'decimal1' ? 1 : 2)
        if (chngItem) {
          attributes.forEach(item => {
            if (posItem[item.att] !== chngItem[item.att]) {
              if (item.att === 'parentUnitID') {
                const parentUnitItemA = _.find(newOrgStructFull, { mi_data_id: posItem.parentUnitID })
                const parentUnitItemC = _.find(oldOrgStructFull, { mi_data_id: chngItem.parentUnitID })
                changesOld.push(`${item.name}: ${parentUnitItemC ? parentUnitItemC.fullName || '-' : '-'}`)
                changesNew.push(`${item.name}: ${parentUnitItemA ? parentUnitItemA.fullName || '-' : '-'}`)
              } else {
                changesOld.push(`${item.name}: ${item.isBoolean ? (chngItem[item.att] ? 'Так' : 'Ні') : chngItem[item.att] || '-'}`)
                changesNew.push(`${item.name}: ${item.isBoolean ? (posItem[item.att] ? 'Так' : 'Ні') : posItem[item.att] || '-'}`)
              }
            }
          })
          resultObj.data.push({
            roundTo: roundTo,
            roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(qnt),
            code: chngItem.code || '',
            name: HR.nameCase.cap(posItem['dictPositionID.fullName'] || chngItem['dictPositionID.name'] || ''),
            oldValue: changesOld.join(';<br />'),
            newValue: changesNew.join(';<br />'),
            typeChange: UB.i18n('Зміна'),
            typeName: UB.i18n('посада'),
            quantity: qnt
          })
        } else {
          resultObj.data.push({
            roundTo: roundTo,
            roundToQuantity: roundToQuantity || HR.reportUtils.getQuantityFractional(qnt),
            code: posItem.code || '',
            name: HR.nameCase.cap(posItem['dictPositionID.fullName'] || posItem['dictPositionID.name'] || ''),
            oldValue: type === 1 ? '' : UB.i18n('Діюче'),
            newValue: `${type === 1 ? 'вступ в дію' : 'припинення дії'}${entryOrderIDentryDate ? ' з ' + AC.dateService.formatDate(entryOrderIDentryDate) : ''}`,
            typeChange: type === 1 ? UB.i18n('Введення') : UB.i18n('Виведення'),
            typeName: UB.i18n('посада'),
            quantity: qnt
          })
        }
      }
    }

    function getDepTypeName (deptData, id, attr = 'dictDepTypeID.name') {
      if (!id) return ''
      const deptItem = _.find(deptData, { ID: id })
      return deptItem ? HR.nameCase.cap(deptItem[attr] || '') : ''
    }

    function getData (parentID, level = 1) {
      const result = {
        data: []
      }
      const curStruct = orgStruct.filter(el => (el.parentUnitID === parentID && level !== 1) || (el.mi_data_id === parentID && level === 1))
      curStruct.forEach(orgItem => {
        if (orgItem.mi_unityEntity === 'hr_department') {
          const dUnit = delUnits.find(item => item.mi_data_id === orgItem.mi_data_id)
          const aUnit = addUnits.find(item => item.mi_data_id === orgItem.mi_data_id)
          const cUnit = changedUnits.find(item => item.mi_data_id === orgItem.mi_data_id)

          const unitItem = makeUnit(orgItem, dUnit, aUnit, cUnit, deptData, entryOrderIDentryDate, level)
          const subTree = getData(orgItem.mi_data_id, level + 1)
          if (subTree && subTree.data && subTree.data.length) {
            result.data.push(unitItem)
            result.data.push(...subTree.data)
          } else {
            if (unitItem.anyChnage) {
              result.data.push(unitItem)
            }
          }
        } else {
          const dPos = delPos.find(item => item.mi_data_id === orgItem.mi_data_id)
          const aPos = addPos.find(item => item.mi_data_id === orgItem.mi_data_id)
          const cPos = changedPos.find(item => item.mi_data_id === orgItem.mi_data_id)
          if (dPos) {
            addPosItems(dPos, undefined, result, 2, entryOrderIDentryDate, roundTo, roundToQuantity)
          }
          if (aPos || cPos) {
            addPosItems(aPos, cPos, result, 1, entryOrderIDentryDate, roundTo, roundToQuantity)
          }
        }
      })
      return result
    }

    const orgTree = getData(itemID)
    return orgTree || []
  }
}
