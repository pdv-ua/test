exports.formCode = {
  initComponentStart,
  initComponentDone,
  initUBComponent
}

function initComponentStart () {
  let me = this
  me.on('formDataReady', onFormDataReady, me)
  me.on('aftersave', afterSave, me)
}

function initComponentDone () {
  const me = this
  AC.viewUtils.setAttr(me)
  me.attr.payFundID = me.queryById('payFundID')
}

function initUBComponent () {
  const me = this
  me.attr.payFundID.store.ubRequest.whereList = {
    byNotExists: {
      expression: '',
      condition: 'subquery',
      subQueryType: 'notExists',
      value: {
        entity: 'hr_idParam',
        fieldList: ['ID'],
        method: 'select',
        whereList: {
          cond: {
            expression: '[valuesID]=[{master}.ID]',
            condition: 'custom'
          },
          mi_deleteDate: {
            condition: 'equal',
            expression: '[mi_deleteDate]',
            value: '#maxdate'
          },
          byNotSelf: {
            condition: 'notEqual',
            expression: '[valuesID]',
            value: me.record.get('valuesID') || -1
          },
          byTab: {
            expression: '[listParamID.code]',
            condition: 'in',
            values: { 'code': me.tabsCode }
          },
          byOrgID: {
            condition: 'equal',
            expression: '[orgID]',
            value: appAC.globalOrganization()
          }
        }
      }
    }
  }
  if (!me.isNewInstance) {
    me.attr.payFundID.setValueById(me.record.get('valuesID'))
  }
}

function onFormDataReady () {
  const me = this

  const valuesID = me.record.get('valuesID')
  valuesID !== me.attr.payFundID.getValue() && me.attr.payFundID.setValueById(valuesID || null)
}

function afterSave () {
  const me = this
  me.sender && me.sender.onRefresh ? me.sender.onRefresh() : me.sender && me.sender.panel.onRefresh && me.sender.panel.onRefresh()
}
