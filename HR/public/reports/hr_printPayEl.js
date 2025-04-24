/* global UB AC _ appAC Ext */
exports.reportCode = {
  buildReport: function (reportParams) {
    const me = this

    return me.getReportData(reportParams.payIDs || [0]).then(data => {
      return AC.reportService.generateReport(data, me)
    })
  },

  getReportData: async function (payIDs) {
    const me = this
    const result = {
      organizationName: '',
      onDate: AC.dateService.formatDate(AC.dateService.todayDate()),
      methodGroupTypes: []
    }
    let payEl = await UB.Repository('hr_payEl')
      .attrs(['ID', 'code', 'name', 'dateFromEmpty', 'dateToEmpty', 'methodID', 'methodID.payElEntryType', 'methodID.name',
        'methodID.methodGroupID', 'methodID.methodGroupID.name', 'methodID.methodGroupID.groupType', 'methodID.methodGroupID.groupType.name',
        'calcProportion.name', 'isMtCount', 'calcSumType.name', 'calcAvgType.name', 'periodType.name', 'calcMounth',
        'roundAverage', 'dictTimeCostID.name', 'dictTimeCostWorkID.name', 'dictTimeCostAvgID.name', 'estimated.name',
        'alimonyLessPayment', 'typePrepayment.name', 'percPrepayment', 'prepaymentDay', 'includeSecondJobs',
        'ignoreInCalcPay', 'calcAlgorithm.name', 'repaymentOnly', 'shortDay', 'shortWeek', 'onlyPlanTrip',
        'surchargeExperience.name', 'calcIndAvgType.name', 'dictExperienceID.name', 'roundUpTo.name', 'roundAvgUpTo.name',
        'isAutoCalc', 'isRecalculate', 'dictFundSourceID.name', 'entryOperationID.name',
        'genName', 'printName'])
      .where('ID', 'in', payIDs)
      .selectAsObject()
    result.organizationName = await UB.Repository('hr_organization')
      .attrs(['name'])
      .where('mi_data_id', '=', appAC.globalOrganization())
      .where('state', '=', 'ACTIVE')
      .misc({ __mip_ondate: AC.dateService.todayDate() })
      .selectScalar()

    if (!payEl || !payEl.length) {
      AC.reportService.removeEmptyValues(result)
    }

    const methodIDs = _.uniq(payEl && payEl.length ? payEl.map(item => item.methodID) : [0])
    let methodCfgPanel = await UB.Repository('hr_methodCfgPanel').attrs(['methodID', 'cfgPanelID.code', 'cfgPanelNameID.name'])
      .where('methodID', 'in', methodIDs)
    // .where('cfgPanelID.code', 'notIn', ['salaryProperty', 'hospitalProperty', 'additionalParams', 'nameCase'])
      .orderBy('sortOrder')
      .selectAsObject({
        'cfgPanelNameID.name': 'name'
      })
    let methodCfgAttr = await UB.Repository('hr_methodCfgAttr').attrs(['methodID', 'attrName'])
      .where('methodID', 'in', methodIDs)
      .selectAsObject()

    const Tabs =
        [{
          title: UB.i18n('Властивості'),
          itemId: 'property',
          items: [
            {
              attributeName: 'calcProportion',
              description: UB.i18n('Нараховується по'),
              value: 'calcProportion.name'
            },
            {
              attributeName: 'isMtCount',
              description: UB.i18n('Кількість ставок враховується у розрахунку'),
              value: 'isMtCount',
              bool: true
            },
            {
              attributeName: 'calcSumType',
              description: UB.i18n('Розраховується від'),
              value: 'calcSumType.name'
            },
            {
              attributeName: 'calcAvgType',
              description: UB.i18n('Розрахунок від'),
              value: 'calcAvgType.name'
            },
            {
              attributeName: 'periodType',
              description: UB.i18n('Сума для розрахунку визначається по'),
              value: 'periodType.name'
            },
            {
              attributeName: 'calcMounth',
              description: UB.i18n('Кількість місяців для розрахунку середнього заробітку'),
              value: 'calcMounth',
              format: '0'
            },
            {
              attributeName: 'dictTimeCostID',
              description: UB.i18n('Елемент обліку робочого часу'),
              value: 'dictTimeCostID.name'
            },
            {
              attributeName: 'dictTimeCostWorkID',
              description: UB.i18n('Елемент обліку робочого часу (робочий час)'),
              value: 'dictTimeCostWorkID.name'
            },
            {
              attributeName: 'dictTimeCostAvgID',
              description: UB.i18n('Елемент обліку робочого часу (за середнім)'),
              value: 'dictTimeCostAvgID.name'
            },
            {
              attributeName: 'estimated',
              description: UB.i18n('Робочій час оцінюється за'),
              value: 'estimated.name'
            },
            {
              attributeName: 'alimonyLessPayment',
              description: UB.i18n('Сума не більше відсотку від доходу'),
              value: 'alimonyLessPayment',
              format: '0.000000'
            },
            {
              attributeName: 'typePrepayment',
              description: UB.i18n('Розрахунок суми авансу'),
              value: 'typePrepayment.name'
            },
            {
              attributeName: 'percPrepayment',
              description: UB.i18n('Відсоток авансу'),
              value: 'percPrepayment'
            },
            {
              attributeName: 'prepaymentDay',
              description: UB.i18n('День виплати авансу'),
              value: 'prepaymentDay',
              format: '0'
            },
            {
              attributeName: 'includeSecondJobs',
              description: UB.i18n('Включати заробіток внутрішнього сумісництва'),
              value: 'includeSecondJobs',
              bool: true
            },
            {
              attributeName: 'ignoreInCalcPay',
              description: UB.i18n('Не враховувати у нараховано/утримано/виплачено'),
              value: 'ignoreInCalcPay',
              bool: true
            },
            {
              attributeName: 'calcAlgorithm',
              description: UB.i18n('Алгоритм розрахунку'),
              value: 'calcAlgorithm.name'
            },
            {
              attributeName: 'repaymentOnly',
              description: UB.i18n('Лише погашення заборгованості'),
              value: 'repaymentOnly',
              bool: true
            },
            {
              attributeName: 'shortDay',
              description: UB.i18n('Доплачувати за скорочення дня'),
              value: 'shortDay',
              bool: true
            },
            {
              attributeName: 'shortWeek',
              description: UB.i18n('Доплачувати за скорочення тижня'),
              value: 'shortWeek',
              bool: true
            },
            {
              attributeName: 'onlyPlanTrip',
              description: UB.i18n('Враховувати тільки відрядження за плановим заробітком'),
              value: 'onlyPlanTrip',
              bool: true
            },
            {
              attributeName: 'surchargeExperience',
              description: UB.i18n('Підвищення надбавки при зміні стажу виконується'),
              value: 'surchargeExperience.name'
            },
            {
              attributeName: 'calcIndAvgType',
              description: UB.i18n('Розраховувати за'),
              value: 'calcIndAvgType.name'
            },
            {
              attributeName: 'useDictTech',
              description: UB.i18n('Облік продукції та списання матеріалів за технологічними картами'),
              value: 'useDictTech',
              bool: true
            },
            {
              attributeName: 'useKPI',
              description: UB.i18n('Розмір нарахування визначається за KPI'),
              value: 'useKPI',
              bool: true
            }
          ]
        },
        {
          title: UB.i18n('Відсоток оплати'),
          itemId: 'payElRate',
          items: undefined,
          entity: 'hr_payElRate',
          entityGroup: 'hr_payElRate',
          fieldList: [
            { name: 'rate', description: UB.i18n('Відсоток'), format: '0.00', span: 3, align: 'right' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: undefined,
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Нараховується на суму'),
          itemId: 'payElEntrySum',
          items: undefined,
          entity: 'hr_payElEntry',
          entityGroup: 'hr_payElEntrySUM',
          fieldList: [
            { name: 'payElBaseID.code', description: UB.i18n('Код'), span: 1, align: 'left' },
            { name: 'payElBaseID.name', description: UB.i18n('Назва'), span: 2, align: 'left' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: ['entryType', '=', 'SUM'],
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Не менше суми'),
          itemId: 'payElEntryMinSum',
          items: undefined,
          entity: 'hr_payElEntry',
          entityGroup: 'hr_payElEntryMINSUM',
          fieldList: [
            { name: 'payElBaseID.code', description: UB.i18n('Код'), span: 1, align: 'left' },
            { name: 'payElBaseID.name', description: UB.i18n('Назва'), span: 2, align: 'left' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: ['entryType', '=', 'MINSUM'],
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Нараховується на час'),
          itemId: 'payElEntryTime',
          items: undefined,
          entity: 'hr_payElEntry',
          entityGroup: 'hr_payElEntryTIME',
          fieldList: [
            { name: 'payElBaseID.code', description: UB.i18n('Код'), span: 1, align: 'left' },
            { name: 'payElBaseID.name', description: UB.i18n('Назва'), span: 2, align: 'left' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: ['entryType', '=', 'TIME'],
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Плановий заробіток'),
          itemId: 'payElEntryPlanSum',
          items: undefined,
          entity: 'hr_payElEntry',
          entityGroup: 'hr_payElEntryPLANSUM',
          fieldList: [
            { name: 'payElBaseID.code', description: UB.i18n('Код'), span: 1, align: 'left' },
            { name: 'payElBaseID.name', description: UB.i18n('Назва'), span: 2, align: 'left' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: ['entryType', '=', 'PLANSUM'],
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Граничний розмір'),
          itemId: 'payElAlimonyLimit',
          items: undefined,
          entity: 'hr_payElAlimonyLimit',
          entityGroup: 'hr_payElAlimonyLimit',
          fieldList: [
            { name: 'dateFrom', description: UB.i18n('Дата початку'), span: 3, align: 'center' },
            { name: 'coefficientMin', description: UB.i18n('Мінімум'), format: '0.00', span: 1, align: 'right' },
            { name: 'coefficientMax', description: UB.i18n('Максимум'), format: '0.00', span: 1, align: 'right' }
          ],
          whereList: undefined,
          orderList: ['dateFrom', 'desc']
        },
        {
          title: UB.i18n('Види доходів'),
          itemId: 'payElTaxIndivid',
          items: undefined,
          entity: 'hr_payElTaxIndividEntry',
          entityGroup: 'hr_payElTaxIndividEntry',
          fieldList: [
            { name: 'taxIndividID.name', description: UB.i18n('Назва'), span: 3, align: 'left' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: undefined,
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Нараховується на час'),
          itemId: 'payElTimeCost',
          items: undefined,
          entity: 'hr_payElTimeCost',
          entityGroup: 'hr_payElTimeCost',
          fieldList: [
            { name: 'dictTimeCostID.code', description: UB.i18n('Код'), span: 1, align: 'left' },
            { name: 'dictTimeCostID.nameSmall', description: UB.i18n('Назва'), span: 2, align: 'left' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: undefined,
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Виключення робочого часу'),
          itemId: 'payElTimeCostOut',
          items: undefined,
          entity: 'hr_payElTimeCost',
          entityGroup: 'hr_payElTimeCost',
          fieldList: [
            { name: 'dictTimeCostID.code', description: UB.i18n('Код'), span: 1, align: 'left' },
            { name: 'dictTimeCostID.nameSmall', description: UB.i18n('Назва'), span: 2, align: 'left' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: undefined,
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Стаж'),
          itemId: 'payElExperience',
          items: [
            {
              attributeName: 'dictExperienceID',
              description: UB.i18n('Вид стажу'),
              value: 'dictExperienceID.name'
            }
          ],
          entity: 'hr_payElExperience',
          entityGroup: 'hr_payElExperience',
          fieldList: [
            { name: 'years', description: UB.i18n('Кількість років стажу'), format: '0', span: 1, align: 'right' },
            { name: 'months', description: UB.i18n('Кількість місяців стажу'), format: '0', span: 1, align: 'right' },
            { name: 'rate', description: UB.i18n('Відсоток'), format: '0.00', span: 1, align: 'right' },
            { name: 'dateFromEmpty', description: UB.i18n('Діє з'), span: 1, align: 'center' },
            { name: 'dateToEmpty', description: UB.i18n('Діє по'), span: 1, align: 'center' }
          ],
          whereList: undefined,
          orderList: ['dateTo', 'desc']
        },
        {
          title: UB.i18n('Загальні налаштування'),
          itemId: 'additionalParams',
          items: [
            {
              attributeName: 'roundUpTo',
              description: UB.i18n('Округлювати суму'),
              value: 'roundUpTo.name'
            },
            {
              attributeName: 'roundAvgUpTo',
              description: UB.i18n('Округлювати середній до'),
              value: 'roundAvgUpTo.name'
            },
            {
              attributeName: 'roundAverage',
              description: UB.i18n('Округлювати середній заробіток'),
              value: 'roundAverage',
              bool: true
            },
            {
              attributeName: 'isAutoCalc',
              description: UB.i18n('Розраховувати автоматично'),
              value: 'isAutoCalc',
              bool: true
            },
            {
              attributeName: 'isRecalculate',
              description: UB.i18n('Перераховувати'),
              value: 'isRecalculate',
              bool: true
            },
            {
              attributeName: 'dictFundSourceID',
              description: UB.i18n('Джерело фінансування'),
              value: 'dictFundSourceID.name'
            },
            {
              attributeName: 'entryOperationID',
              description: UB.i18n('Бухгалтерська проводка'),
              value: 'entryOperationID.name'
            }
          ]
        },
        {
          title: UB.i18n('Відмінки'),
          itemId: 'nameCase',
          items: [
            {
              attributeName: 'genName',
              description: UB.i18n('Родовий'),
              value: 'genName'
            },
            {
              attributeName: 'printName',
              description: UB.i18n('Знахідний'),
              value: 'printName'
            }
          ]
        }
        ]

    let panelArray = Tabs.filter(item => methodCfgPanel.map(el => el['cfgPanelID.code']).indexOf(item.itemId) !== -1 && item.entity)
    const entityUniq = []
    panelArray = _.groupBy(panelArray, item => item.entityGroup)
    _.forEach(panelArray, async panelConfig => {
      entityUniq.push({
        fieldList: panelConfig[0].fieldList,
        entity: panelConfig[0].entity,
        entityGroup: panelConfig[0].entityGroup,
        whereList: panelConfig[0].whereList,
        orderList: panelConfig[0].orderList
      })
    })

    const entityArray = {}
    for (let i = 0; i < entityUniq.length; i++) {
      const panelConfig = entityUniq[i]
      const entity = UB.Repository(panelConfig.entity)
        .attrs(panelConfig.fieldList.map(el => el.name))
        .attrs(['payElID'])
        .where('payElID', 'in', payIDs)

      if (panelConfig.whereList) {
        entity.where(panelConfig.whereList[0], panelConfig.whereList[1], panelConfig.whereList[2])
      }
      if (panelConfig.orderList) {
        entity.orderBy(panelConfig.orderList[0], panelConfig.orderList[1])
      }
      entityArray[panelConfig.entityGroup] = await entity.selectAsObject()
    }

    methodCfgAttr = methodCfgAttr && methodCfgAttr.length ? _.groupBy(methodCfgAttr, 'methodID') : []
    methodCfgPanel = methodCfgPanel && methodCfgPanel.length ? _.groupBy(methodCfgPanel, 'methodID') : []
    payEl = _.groupBy(payEl, 'methodID.methodGroupID.groupType')

    _.forEach(payEl, (groupType) => {
      const groupTypeObj = {
        typeName: groupType[0]['methodID.methodGroupID.groupType.name'],
        methodGroups: []
      }
      groupType = _.groupBy(groupType, 'methodID.methodGroupID')
      _.forEach(groupType, (methodGroup) => {
        const methodGroupObj = {
          groupName: methodGroup[0]['methodID.methodGroupID.name'],
          methods: []
        }
        methodGroup = _.groupBy(methodGroup, 'methodID')
        _.forEach(methodGroup, (method) => {
          const panels = methodCfgPanel[method[0].methodID] ? methodCfgPanel[method[0].methodID] : []
          const attributes = methodCfgAttr[method[0].methodID] ? methodCfgAttr[method[0].methodID].map(item => item.attrName) : []
          const methodObj = {
            methodName: method[0]['methodID.name'],
            groupName: method[0]['methodID.methodGroupID.name'],
            typeName: method[0]['methodID.methodGroupID.groupType.name'],
            pays: []
          }
          _.forEach(method, (pay) => {
            const payObj = {
              payCode: pay.code || '',
              payName: pay.name || '',
              panels: []
            }
            _.forEach(panels, (tabPanel) => {
              const panelConfig = _.find(Tabs, { 'itemId': tabPanel['cfgPanelID.code'] })
              if (panelConfig) {
                const obj = {
                  panelName: UB.i18n(tabPanel.name || panelConfig.title),
                  attributes: []
                }
                if (panelConfig.items) {
                  const attrArray = tabPanel['cfgPanelID.code'] === 'nameCase' ? panelConfig.items : panelConfig.items.filter(item => attributes.indexOf(item.attributeName) !== -1)
                  _.forEach(attrArray, (item) => {
                    obj.attributes.push({
                      columns: [{
                        value: item.description,
                        span: 2,
                        align: 'left'
                      }, {
                        value: me.getValue(pay[item.value], item),
                        span: 3,
                        align: 'left'
                      }]
                    })
                  })
                }
                if (panelConfig.entity) {
                  const entity = entityArray[panelConfig.entityGroup] ? entityArray[panelConfig.entityGroup].filter(el => el.payElID === pay.ID) : []
                  if (entity && entity.length) {
                    const values = panelConfig.fieldList.map(item => {
                      return {
                        value: `<b>${item.description}</b>`,
                        span: item.span,
                        align: 'center'
                      }
                    })
                    obj.attributes.push({
                      columns: values
                    })

                    _.forEach(entity, (entityItem) => {
                      const values = panelConfig.fieldList.map(item => {
                        return {
                          value: me.getValue(entityItem[item.name], item),
                          span: item.span,
                          align: item.align
                        }
                      })
                      obj.attributes.push({
                        columns: values
                      })
                    })
                  }
                }
                if (obj.attributes.length) {
                  payObj.panels.push(obj)
                }
              }
            })
            methodObj.pays.push(payObj)
          })
          methodGroupObj.methods.push(methodObj)
        })
        groupTypeObj.methodGroups.push(methodGroupObj)
      })
      result.methodGroupTypes.push(groupTypeObj)
    })

    return AC.reportService.removeEmptyValues(result)
  },
  getValue: function (value, item) {
    if (item.name === 'dateFromEmpty' || item.name === 'dateToEmpty' || item.name === 'dateFrom') {
      return value ? AC.dateService.formatDate(value) : ''
    }
    if (item.format) {
      return Ext.util.Format.number(value || 0, item.format)
    }
    if (item.bool) {
      return value ? UB.i18n('Так') : UB.i18n('Ні')
    }

    return value || ''
  }
}
