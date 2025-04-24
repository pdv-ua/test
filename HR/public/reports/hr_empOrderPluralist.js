/* global _ UB AC HR appAC */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.instanceID, reportParams.params ? reportParams.params.orderExtraID || 0 : 0).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },
  getReportData: async function (ID, orderExtraID) {
    const me = this
    const result = {
      emblem: HR.reportUtils.getEmblem(),
      showTaxCode: false,
      rows: [],
      titleOrder: UB.i18n(`Про сумісництво`)
    }
    const orderExtract = await HR.reportUtils.getEmpOrderExtract(orderExtraID)
    result.orderType = orderExtract && orderExtract.ID ? UB.i18n('В И Т Я Г &nbsp;З&nbsp; Н А К А З У') : UB.i18n('Н А К А З')
    const order = await HR.reportUtils.getEmpOrder(ID)
    if (!order) {
      return result
    }
    const showTabNum = order.showTabNum

    await HR.reportUtils.getOrderPrintConfig(result, order.subOrganization ? order.masterOrganizationID : order.organizationID)
    const boldFormatBegin = result.normalFullName ? '' : '<b>'
    const boldFormatEnd = result.normalFullName ? '' : '</b>'

    const taskDet = await HR.reportUtils.getTask(ID, order.orderDate || order.entryDate, order.showTabNum, result.notUseMiddleNameInOrder)

    result.orderDate = AC.dateService.getStringFormatDate(order.orderDate, '', '')
    result.orderNumber = order.orderNumber
    result.orderIndex = order['dictEmpOrderIndexID.code'] === null ? '' : `/${order['dictEmpOrderIndexID.code']}`
    result.organizationName = order.orderOrganizationName
    result.titleOrder = (order.titleOrder || '').replace(/&/g, '&nbsp;')
    result.preamble = (order.preamble || '').replace(/&/g, '&nbsp;')
    result.city = await HR.reportUtils.getCityName(order.subOrganization ? order.masterOrganizationID : order.organizationID)
    if (order.reason) {
      result.orderReason = {
        reason: UB.i18n(`Підстава: {0}.`, order.reason)
      }
    }
    const orgGen = order.subOrganization && (order['organizationID.nameGen'] || order['organizationID.name'])
      ? ' ' + (order['organizationID.nameGen'] || order['organizationID.name']) : ''
    const useSexType = AC.settings.get('hrUseSexTypeInOrders', order.masterOrganizationID || order.organizationID) === true

    result.responsiblesInfo = await HR.reportUtils.getResponsiblesForOrder(order)
    result.showTaxCode = AC.settings.get('showTaxCode', order.masterOrganizationID || order.organizationID) === true

    const whereArray = order.sortItems === 'ORDER' ? [['empOrderType', 'in', ['TASK', 'PLURALIST', 'COMBININGPOS']]] : [['empOrderType', 'in', ['PLURALIST', 'COMBININGPOS']]]
    const orderDet = await HR.reportUtils.getEmpOrderDet(ID, order.orderDate || order.entryDate, ['departmentID'], whereArray, true)
    let pluralistDet = await UB.Repository('hr_empOrderPluralistDet')
      .attrs(['ID', 'dateFrom', 'dateToEmpty', 'mtCount', 'employeeID', 'employeeID.taxCode', 'employeeID.empTaxCodeType',
        'dictEmpCategoryID', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'employeeID.sexType', 'reason',
        'dictPositionID', 'dictPositionID.nameGen', 'dictPositionID.nameGenF', 'dictPositionID.name', 'posNameAddition',
        'vacPositionID', 'vacPositionID.employeeNumberID', 'vacPositionID.employeeID',
        'vacPositionID.employeeID.sexType', 'vacPositionID.employeeID.fullFIO', 'vacPositionID.employeeID.genName',
        'vacPositionID.employeeID.lastName', 'vacPositionID.employeeID.firstName', 'vacPositionID.employeeID.middleName'
      ])
      .attrsIf(showTabNum, ['tabNum'])
      .where('orderID', '=', ID)
      .selectAsObject()
    let combiningposDet = await UB.Repository('hr_empOrderCombiningposDet')
      .attrs(['ID', 'dateFrom', 'dateToEmpty', 'mtCount', 'employeeID', 'employeeID.taxCode', 'employeeID.empTaxCodeType',
        'dictEmpCategoryID', 'dictEmpCategoryID.genName', 'dictEmpCategoryID.name', 'employeeID.sexType', 'reason', 'accrualSum',
        'dictPositionID', 'dictPositionID.nameGen', 'dictPositionID.nameGenF', 'dictPositionID.name', 'posNameAddition'
      ])
      .attrsIf(showTabNum, ['tabNum'])
      .where('orderID', '=', ID)
      .selectAsObject()

    await HR.reportUtils.checkEmployeeChange(order.orderDate, ['lastName', 'firstName', 'middleName', 'fullFIO', 'genName'], pluralistDet, undefined, 'vacPositionID.employeeID')

    pluralistDet.push(...combiningposDet)

    let empOrderFundSource = await UB.Repository('hr_empOrderFundSource')
      .attrs(['paraID', 'dictFundSourceID', 'dictFundSourceID.name', 'dictFundSourceID.genName', 'mtCount'])
      .where('dictFundSourceID.mi_deleteDate', '>=', '#maxdate')
      .where('orderID', '=', ID)
      .selectAsObject()
    const orderAcc = await UB.Repository('hr_empOrderAcc')
      .attrs(['payElID.code', 'payElID.name', 'payElID.printName', 'accrualSum', 'accrualRate', 'empOrderDetID', 'dateFrom', 'dateTo'])
      .where('empOrderID', '=', ID)
      .selectAsObject({
        'payElID.name': 'payName',
        'payElID.code': 'payCode',
        'payElID.printName': 'payPrintName'
      })

    let ids = pluralistDet && pluralistDet.length > 0 ? _.uniq(pluralistDet.filter(el => el['vacPositionID.employeeNumberID']).map(el => el['vacPositionID.employeeNumberID'])) : []
    let empLongTermAbsc = await UB.Repository('hr_empLongTermAbsc')
      .attrs(['employeeNumberID', 'dateFrom', 'dateTo', 'orderID', 'paraID'])
      .where('employeeNumberID', 'in', ids)
      .selectAsObject()
    empLongTermAbsc = empLongTermAbsc && empLongTermAbsc.length ? _.groupBy(empLongTermAbsc, 'employeeNumberID') : []

    let departments = []
    let depNames = {}
    if (order.sortItems === 'STAFF') {
      const ids = _.compact(_.uniq(orderDet.map(item => item.departmentID)))
      departments = await HR.reportUtils.getDepartmentStructName(ids, order.organizationID, order.orderDate || order.entryDate, 'ID')
      depNames = await HR.reportUtils.getDepartmentsName(ids, ['name'], order.orderDate || order.entryDate, order.organizationID, ['treePath'])
    }
    const cntPunkt = (taskDet.tasks ? taskDet.tasks.length : 0) + (pluralistDet ? pluralistDet.length : 0)

    const mainWork = []
    const fld = _.groupBy(pluralistDet, item => { return `${item.employeeID}/${AC.dateService.formatDate(item.dateFrom)}` })
    _.forEach(fld, item => {
      let onDate = item[0].dateFrom
      if (onDate && AC.dateService.isValid(onDate)) {
        onDate = AC.dateService.shiftDate(onDate)
      } else {
        onDate = appAC.globalApplicationDate()
      }
      mainWork.push({ employeeID: item[0].employeeID, dateFrom: onDate, posName: '', femaleName: useSexType && item[0]['employeeID.sexType'] === 'W' })
    })

    for (let i = 0; i < mainWork.length; i++) {
      const whereList = [
        ['employeeID', '=', mainWork[i].employeeID],
        ['workPlace', 'in', ['1', '4']],
        ['dateFrom', '<=', mainWork[i].dateFrom],
        ['dateTo', '>', mainWork[i].dateFrom]
      ]
      const config = {
        fullPositionName: true,
        useSexType: mainWork[i].femaleName,
        notUseMiddleNameInOrder: false // result.notUseMiddleNameInOrder
      }
      mainWork[i].posName = await HR.reportUtils.getPositionNameFromEmployeePositionByParams(whereList, order.organizationID, mainWork[i].dateFrom, 'Dat', config)
    }
    for (let i = 0; i < pluralistDet.length; i++) {
      const el = pluralistDet[i]
      const item = orderDet.find(o => o.ID === el.ID)
      _.merge(el, item || [])
      el.toOrder = orderExtract && orderExtract.ID
        ? ((orderExtract.departmentID ? orderExtract.departmentID === item.departmentID : true) && (orderExtract.employeePositionID ? orderExtract.employeePositionID === item.employeePositionID : true))
        : true
      if (order.sortItems === 'STAFF' && item.departmentID && departments[item.departmentID]) {
        el['structID'] = departments[item.departmentID].treePath
        el['structName'] = departments[item.departmentID].name
      } else {
        el['structID'] = ''
        el['structName'] = ''
      }
      if (order.sortItems === 'STAFF' && item.departmentID && depNames[item.departmentID]) {
        el['departmentID.name'] = depNames[item.departmentID].name
        el['departmentID.treePath'] = depNames[item.departmentID].treePath
      } else {
        el['departmentID.name'] = ''
        el['departmentID.treePath'] = ''
      }

      if (el['vacPositionID.employeeNumberID'] && empLongTermAbsc[el['vacPositionID.employeeNumberID']]) {
        const flt = empLongTermAbsc[el['vacPositionID.employeeNumberID']].filter(o => o.dateFrom <= AC.dateService.shiftDate(el.dateFrom) && o.dateTo >= AC.dateService.shiftDate(el.dateFrom))
        if (flt && flt.length) {
          el.vacPositionOrderID = flt[0].orderID
          el.vacPositionParaID = flt[0].paraID
        }
      }
      let vacPosition = ''
      if (el.vacPositionID) {
        // Призначення на посаду, якщо там є призначений Працівник, який знаходиться у відпустці, довготривалій відпустці, військовій службі
        let employee = el['vacPositionID.employeeID.genName'] || el['vacPositionID.employeeID.fullFIO'] ||
          HR.reportUtils.getFullName(el['vacPositionID.employeeID.lastName'], el['vacPositionID.employeeID.firstName'],
            result.notUseMiddleNameInOrder ? '': el['vacPositionID.employeeID.middleName'], false)
        employee = HR.reportUtils.formatShortNameInOrder(employee, { notUseMiddleNameInOrder: result.notUseMiddleNameInOrder })

        const vacOrderDet = await me.findOrderInfo(el.vacPositionOrderID, el.vacPositionParaID)
        if (vacOrderDet) {
          if (vacOrderDet.empOrderType === 'MILSERVICE') {
            vacPosition = UB.i18n(` на період військової служби {0}`, employee)
            vacPosition += el.dateToEmpty ? '' : UB.i18n(`, до дня {0} фактичного виходу з військової служби`, el['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
          } else if (vacOrderDet['dictVacationKindID.isTempVacancy']) {
            vacPosition = UB.i18n(` на період {0} {1}`, HR.nameCase.uncap(vacOrderDet['dictVacationKindID.nameGen'] || vacOrderDet['dictVacationKindID.name'] || ''), employee)
            vacPosition += el.dateToEmpty ? '' : UB.i18n(`, до дня {0} фактичного виходу з відпустки`, el['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
          } else {
            vacPosition = UB.i18n(` на період відсутності {0}`, employee)
            vacPosition += el.dateToEmpty ? '' : UB.i18n(`, до дня {0} фактичного виходу`, el['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
          }
        } else {
          vacPosition = UB.i18n(` на період відсутності {0}`, employee)
          vacPosition += el.dateToEmpty ? '' : UB.i18n(`, до дня {0} фактичного виходу`, el['vacPositionID.employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'))
        }
        if (vacPosition.length) {
          vacPosition += ', '
        }
      }
      el.vacPositionInfo = vacPosition
    }

    let index = 0
    if (order.sortItems === 'STAFF') {
      pluralistDet = _.sortBy(pluralistDet, ['structID'])
    }
    const stDepts = _.groupBy(order.sortItems === 'STAFF' ? pluralistDet : orderDet, item => order.sortItems === 'STAFF' ? item.structID : 'null')
    _.forEach(stDepts, stItems => {
      stItems = order.sortItems === 'STAFF' ? _.sortBy(stItems, ['departmentID.treePath']) : stItems
      const objSt = {
        stName: order.sortItems === 'STAFF' ? HR.nameCase.cap(stItems[0].structName || '') : '',
        deps: []
      }
      const depts = _.groupBy(stItems, item => order.sortItems === 'STAFF' ? item.departmentID : 'null')
      _.forEach(depts, depItems => {
        const depName = HR.nameCase.cap(depItems[0]['departmentID.name'] || '')
        if (order.sortItems === 'STAFF') {
          depItems = depItems.sort(HR.reportUtils.funcOrderTreePathSort)
        }
        if (order.sortItems === 'ALPHABET') {
          depItems = depItems.sort(HR.reportUtils.funcOrderFioTabNumSort)
        }
        const objDep = {
          depName: order.sortItems !== 'STAFF' || depName === objSt.stName ? '' : depName,
          items: []
        }
        _.forEach(depItems, item => {
          const itemIdxText = cntPunkt === 1 ? '' : `${++index}. `
          if (item.empOrderType === 'TASK') {
            const orderItem = taskDet.tasks.find(o => o.ID === item.ID)
            if (orderItem) {
              const text = `${itemIdxText}${orderItem.task}${orderItem['positionName'] ? ` ${orderItem['positionName']}` : ''}${orderItem['employeeName'] ? ` ${orderItem['employeeName']}` : ''}.`
              objDep.items.push({
                toOrder: true,
                indent: 1,
                text: text
              })
            }
          } else {
            const pluralistDetItem = order.sortItems === 'STAFF' ? item : _.find(pluralistDet, { ID: item.ID })
            if (pluralistDetItem) {
              // const datPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'dat', true)
              const datPosInfo = HR.reportUtils.getEmpIncaseInfo(item, 'dat', true)

              const genPosInfo = HR.reportUtils.getInfoItemOrderInCase(item, 'gen', true, false, '', {
                yesActualPositionName: !!pluralistDetItem.dictEmpCategoryID
              })

              /*
              if (pluralistDetItem.dictEmpCategoryID) {
                genPosInfo = HR.reportUtils.getPosIncaseInfo(item, 'gen', true, false)
                genPosInfo.posName = genPosInfo.dictPosName
                genPosInfo.posName += item['employeePositionID.positionID.nameAddition'] || item['positionID.nameAddition'] ? (genPosInfo.posName ? ' ' : '') + (item['employeePositionID.positionID.nameAddition'] || item['positionID.nameAddition']) : ''
                genPosInfo.posName += (genPosInfo.posName ? ' ' : '') + (pluralistDetItem['dictEmpCategoryID.genName'] || pluralistDetItem['dictEmpCategoryID.name'] || '')
                genPosInfo.posName += (genPosInfo.posName ? ' ' : '') + (item['employeePositionID.positionID.departmentID.nameGen'] || item['positionID.departmentID.nameGen'] || item['employeePositionID.positionID.departmentID.name'] || item['positionID.departmentID.name'] || '')
              } else {
                genPosInfo = HR.reportUtils.getPosIncaseInfo(item, 'gen', true)
              }
               */

              const dateFrom = AC.dateService.formatDate(pluralistDetItem.dateFrom)
              const posItem = _.find(mainWork, { employeeID: pluralistDetItem.employeeID, dateFrom: AC.dateService.shiftDate(pluralistDetItem.dateFrom) })
              const roundToQuantity = HR.reportUtils.getQuantityFractional(pluralistDetItem.mtCount)
              const mtCount = HR.reportUtils.quantityToString(pluralistDetItem.mtCount, roundToQuantity)
              const fsData = empOrderFundSource.filter(fsItem => fsItem.paraID === item.ID && fsItem.dictFundSourceID)
              let dictFundSource = []
              fsData.forEach((fsItem, npp) => {
                const last = fsItem.length === 1 || npp === fsData.length - 1
                  ? ''
                  : npp < fsData.length - 2 ? ', ' : ' та '
                dictFundSource.push(UB.i18n(`{0}&nbsp;{1} за рахунок коштів {2}{3}`, fsItem.mtCount || 0, (fsItem.mtCount || 0) === 1 ? 'ставку' : 'ставки', fsItem['dictFundSourceID.genName'] || fsItem['dictFundSourceID.name'] || '', last))
              })
              const dictFundSourceText = dictFundSource.length
                ? UB.i18n(` Оплата праці на {0}.`, dictFundSource.join(''))
                : ''
              const tabNum = showTabNum && pluralistDetItem['tabNum'] ? UB.i18n(`(Таб. №&nbsp;{0})`, pluralistDetItem['tabNum']) : ''

              let text
              if (pluralistDetItem.empOrderType === 'PLURALIST') {
                let orderWord = UB.i18n('Дозволити')
                orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
                text = UB.i18n(`{0}{6} {1}{5}{2}сумісництво{3} з&nbsp;{4} `, itemIdxText, boldFormatBegin + datPosInfo.empName + boldFormatEnd, posItem.posName ? ', ' + posItem.posName + orgGen + ' ' : ' ',
                  genPosInfo.posName ? UB.i18n(' по посаді ') + genPosInfo.posName + orgGen : '', dateFrom, tabNum ? ' ' + tabNum : '', orderWord) +
                  (pluralistDetItem.dateToEmpty ? UB.i18n(` по {0} `, AC.dateService.formatDate(pluralistDetItem.dateToEmpty)) : '') +
                  pluralistDetItem.vacPositionInfo +
                  UB.i18n(`з оплатою {0}&nbsp;ставки{1}.`, mtCount, ' посадового окладу'/* posDictName ? ' посадового окладу ' + posDictName + orgGen : '' */) +
                  dictFundSourceText
              } else {
                let orderWord = UB.i18n('Доручити')
                orderWord = result.smallOrderWord ? orderWord : orderWord.toUpperCase()
                let dictPositionName
                if (pluralistDetItem.dictPositionID) {
                  dictPositionName = useSexType && item['employeeID.sexType'] === 'W'
                    ? pluralistDetItem['dictPositionID.nameGenF'] || pluralistDetItem['dictPositionID.nameGen'] || pluralistDetItem['dictPositionID.name'] || ''
                    : pluralistDetItem['dictPositionID.nameGen'] || pluralistDetItem['dictPositionID.name'] || ''
                  text = UB.i18n(`{0}{1} {2}{3}, за {4} згодою, з {5} {6}року виконання додаткової роботи за вакантною посадою{7} в порядку суміщення посад без звільнення від основної роботи{8}{9}.`,
                    itemIdxText, orderWord, boldFormatBegin + datPosInfo.empName + boldFormatEnd, posItem.posName ? ', ' + posItem.posName + orgGen : '',
                    useSexType && item['employeeID.sexType'] === 'W' ? UB.i18n('її') : UB.i18n('його'),
                    dateFrom, pluralistDetItem.dateToEmpty ? UB.i18n(`по {0} `, AC.dateService.formatDate(pluralistDetItem.dateToEmpty)) : '',
                    dictPositionName ? ' ' + dictPositionName : '',
                    '', // pluralistDetItem.accrualSum ? UB.i18n(` та встановити доплату за суміщення в розмірі {0} гривень на місяць`, HR.reportUtils.formatAsCurrency(pluralistDetItem.accrualSum)) : '',
                    tabNum ? ' ' + tabNum : '')
                }
              }

              text = text.replace('</b> ', ' </b>')
              text = text.replace('</b>,', ',</b>&nbsp;')
              objDep.items.push({
                toOrder: pluralistDetItem.toOrder,
                indent: 1,
                text: text
              })
              let orderAccRows = orderAcc.filter(el => el.empOrderDetID === pluralistDetItem.ID)
              if (orderAccRows && orderAccRows.length > 0) {
                orderAccRows = _.groupBy(orderAccRows, item => { return item.payCode === '42' })
                _.forEach(orderAccRows, orderAccItems => {
                  orderAccItems.forEach((el, idx) => {
                    const accrualStr = el.accrualSum
                      ? UB.i18n(` у розмірі {0}&nbsp;гривень`, HR.reportUtils.formatAsCurrency(el.accrualSum))
                      : (el.accrualRate
                        ? UB.i18n(` у розмірі {0}&nbsp;відсотків`, el.accrualRate) + (result.funcOrgType ? UB.i18n(' окладу') : UB.i18n(' від посадового окладу'))
                        : '')
                    const accrualDateFrom = el.dateFrom ? `${UB.i18n('з')}&nbsp;${AC.dateService.formatDate(el.dateFrom)}` : ''
                    const accrualDateTo = (!el.dateTo || AC.dateService.isMaxDate(el.dateTo)) ? '' : ` ${UB.i18n('по')}&nbsp;${AC.dateService.formatDate(el.dateTo)}`

                    if (orderAccItems.length === 1) {
                      objDep.items.push({
                        toOrder: pluralistDetItem.toOrder,
                        indent: 1,
                        text: el.payCode === '42'
                          ? `${UB.i18n('Виплатити')} ${HR.reportUtils.formatShortName(pluralistDetItem['employeeID.datName'] || pluralistDetItem['employeeID.fullFIO'], false)} ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}.`
                          : `${UB.i18n('Встановити')} ${HR.reportUtils.formatShortName(pluralistDetItem['employeeID.datName'] || pluralistDetItem['employeeID.fullFIO'], false)} ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr} ${accrualDateFrom}${accrualDateTo !== '' ? accrualDateTo + '.' : '.'}`
                      })
                    } else {
                      if (idx === 0) {
                        objDep.items.push({
                          toOrder: pluralistDetItem.toOrder,
                          indent: 1,
                          text: el.payCode === '42'
                            ? `${UB.i18n('Виплатити')} ${HR.reportUtils.formatShortName(pluralistDetItem['employeeID.datName'] || pluralistDetItem['employeeID.fullFIO'], false)}:`
                            : `${UB.i18n('Встановити')} ${HR.reportUtils.formatShortName(pluralistDetItem['employeeID.datName'] || pluralistDetItem['employeeID.fullFIO'], false)}:`
                        })
                      }
                      objDep.items.push({
                        toOrder: pluralistDetItem.toOrder,
                        indent: 1,
                        text: el.payCode === '42'
                          ? `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr}${idx === (orderAccItems.length - 1) ? '.' : ';'}`
                          : `  - ${HR.nameCase.uncap(el.payPrintName || el.payName || '')} ${accrualStr} ${accrualDateFrom}${accrualDateTo}${idx === (orderAccItems.length - 1) ? '.' : ';'}`
                      })
                    }
                  })
                })
              }
              if (result.showTaxCode && pluralistDetItem['employeeID.taxCode']) {
                let taxCodeInfo = pluralistDetItem['employeeID.empTaxCodeType'] === 'TAXCODE'
                  ? UB.i18n('Ідентифікаційний номер ')
                  : pluralistDetItem['employeeID.empTaxCodeType'] === 'PASSPORT'
                    ? UB.i18n('Серія, номер паспорту ')
                    : pluralistDetItem['employeeID.empTaxCodeType'] === 'IDCARD' ? UB.i18n('Номер ID картки ') : ''
                taxCodeInfo += pluralistDetItem['employeeID.taxCode'] + '.'
                objDep.items.push({
                  toOrder: pluralistDetItem.toOrder,
                  text: taxCodeInfo,
                  indent: 0
                })
              }
              if (pluralistDetItem.reason) {
                objDep.items.push({
                  toOrder: pluralistDetItem.toOrder,
                  text: UB.i18n(`Підстава: {0}.`, pluralistDetItem.reason),
                  indent: 1
                })
              }
            }
          }
        })
        objDep.items = objDep.items.filter(el => el.toOrder)

        if (objDep.items.length) {
          objSt.deps.push(objDep)
        }
      })

      if (objSt.deps.length) {
        result.rows.push(objSt)
      }
    })

    if (pluralistDet.length === 1) {
      const item = orderDet[0]
      const genEmpInfo = HR.reportUtils.getEmpIncaseInfo(item, 'gen', true)
      const titleName = HR.reportUtils.formatShortName(genEmpInfo.empName)
      result.titleOrder += `${result.titleOrder && titleName ? '<br/>' : ''}${titleName || ''}`
    } else if (pluralistDet.length > 1) {
      result.titleOrder += UB.i18n(` працівників`)
    }

    result.tasks = order.sortItems === 'ORDER' ? [] : taskDet.tasks.map(e => ({
      task: `${cntPunkt === 1 ? '' : ++index + '. '}${e.task}${e['positionName'] ? ` ${e['positionName']}` : ''}${e['employeeName'] ? ` ${e['employeeName']}` : ''}.`
    }))
    return result
  },
  findOrderInfo: async function (orderID, paraID) {
    const config = [{
      type: 'VACATION',
      ub: 'hr_empOrderVacationListDet',
      attr: ['ID', 'empOrderType', 'dictVacationKindID.nameLoc', 'dictVacationKindID.nameGen', 'dictVacationKindID.name',
        'dictVacationKindID.byArticle', 'dictVacationKindID.isTempVacancy', 'dateFrom', 'dateTo'],
      alias: {}
    }, {
      type: 'VACATIONLONG',
      ub: 'hr_empOrderVacationlongDet',
      attr: ['ID', 'empOrderType', 'dictVacationKindID.nameLoc', 'dictVacationKindID.nameGen', 'dictVacationKindID.name',
        'dictVacationKindID.byArticle', 'dictVacationKindID.isTempVacancy', 'dateFrom', 'dateTo'],
      alias: {}
    }, {
      type: 'VACATIONPROLONGL',
      ub: 'hr_empOrderVacationprolonglDet',
      attr: ['ID', 'empOrderType', 'primeVacationParaID.dictVacationKindID.nameLoc', 'primeVacationParaID.dictVacationKindID.nameGen',
        'primeVacationParaID.dictVacationKindID.name', 'primeVacationParaID.dictVacationKindID.byArticle', 'primeVacationParaID.dictVacationKindID.isTempVacancy',
        'primeVacationParaID.dateFrom', 'dateTo'], // дата начала с оригинального приказа, а дата окончания с приказа продолжения
      alias: {
        'primeVacationParaID.dictVacationKindID.nameLoc': 'dictVacationKindID.nameLoc',
        'primeVacationParaID.dictVacationKindID.nameGen': 'dictVacationKindID.nameGen',
        'primeVacationParaID.dictVacationKindID.name': 'dictVacationKindID.name',
        'primeVacationParaID.dictVacationKindID.byArticle': 'dictVacationKindID.byArticle',
        'primeVacationParaID.dictVacationKindID.isTempVacancy': 'dictVacationKindID.isTempVacancy',
        'primeVacationParaID.dateFrom': 'dateFrom'
      }
    }, {
      type: 'MILSERVICE',
      ub: 'hr_empOrderMilserviceDet',
      attr: ['ID', 'empOrderType', 'dateFrom', 'dateTo'],
      alias: {}
    }]
    if (!orderID || !paraID) {
      return undefined
    }

    const empOrderType = await UB.Repository('hr_empOrderDet')
      .attrs('empOrderType')
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('orderID', '=', orderID)
      .where('ID', '=', paraID)
      .selectScalar()

    const flt = _.find(config, { type: empOrderType })
    if (!flt) {
      return undefined
    }
    const orderDet = await UB.Repository(flt.ub)
      .attrs(flt.attr)
      .where('orderID.orderState', 'in', ['POSTED', 'PROCESSED'])
      .where('ID', '=', paraID)
      .selectSingle(flt.alias)

    return orderDet
  }
}
