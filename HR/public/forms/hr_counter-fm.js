exports.formCode = {
  initUBComponent: function () {
    let ctrlObj = {}
    ctrlObj.example = this.down('[name=example]')
    ctrlObj.prefix = this.down('[name=prefix]')
    ctrlObj.size = this.down('[name=size]')
    ctrlObj.numcounter = this.down('[name=numcounter]')
    ctrlObj.orderEntity = this.down('[name=orderEntity]')

    this.record.store.on('update', (store, reco, oper, modified) => {
      if (modified.includes('orderEntity')) {
        this.initDetail(ctrlObj)
      }
    }
    )

    this.on('afterSave', () => {
      this.initDetail(ctrlObj)
    })

    this.initDetail(ctrlObj)
    this.initExample(ctrlObj)

    ctrlObj.prefix.on('change', () => {
      this.initExample(ctrlObj)
    })

    ctrlObj.size.on('change', (obj) => {
      if (obj.getValue() <= 14) this.initExample(ctrlObj)
    })
  },

  initDetail: function (ctrlObj) {
    let entityName = this.record.get('orderEntity')
    ctrlObj.numcounter.getStore().ubRequest.whereList = {
      'regKey': {
        expression: '[regKey]',
        condition: 'like',
        values: {
          'regKey': entityName || '*'
        }
      }
    }
    ctrlObj.numcounter.getStore().load()
  },

  initExample: function (ctrlObj) {
    let size = ctrlObj.size.value - (ctrlObj.prefix.value.length || 0)
    ctrlObj.example.setValue(ctrlObj.prefix.value + '1'.padStart(size, '0'))
  }
}
