/* global Ext  AC */
const JSZip = require('jszip/dist/jszip.min.js')
const fileSaver = require('file-saver')
const $App = require('@unitybase/adminui-pub')
const UB = require('@unitybase/ub-pub')

Ext.define('HR.SignListPanel', {
  extend: 'Ext.panel.Panel',
  alias: 'widget.signlistpanel',
  // width: 800,
  // height: 600,

  layout: {
    type: 'vbox', align: 'stretch'
    // type: 'fit'
  },
  overflowY: 'auto',
  isDetail: true,
  title: UB.i18n('КЕП по документу'),

  setValue: function (record, entityName) {
    let me = this
    me.masterRecord = record
    me.updateView()
  },

  onRefreshDetail: function (record, entityName) {
    let me = this
    me.masterRecord = record
    me.updateView()
  },

  updateView: function () {
    let me = this
    me.viewStore.ubRequest = UB.Repository('hr_empOrderSignature').attrs(['ID', 'signerName', 'signatureDate'])
      .where(me.parentField, '=', me.masterRecord.get('ID'))
      .where('canceled', '=', false)
      .ubql()
    me.viewStore.load()
  },

  initComponent: function () {
    let me = this
    if (!me.parentField) {
      me.parentField = 'docID'
    }
    var store = Ext.create('UB.ux.data.UBStore', {
      autoLoad: false,
      ubRequest: UB.Repository('hr_empOrderSignature').attrs(['ID', 'signerName', 'signatureDate'])
        .where(me.parentField, '=', 0)
        .ubql()
    })
    me.viewStore = store
    store.on('load', function (ctrl, records) {
      if (records.length > 0) {
        me.show()
      }
    })
    // store.load()
    let view = Ext.create('Ext.view.View', {
      store: store,
      flex: 2,
      tpl: [
        '<tpl for=".">',
        '<div class="thumb-wrap" id="{name:stripTags}">',
        '<div class="thumb signature-item">',
        '<span class="x-editable">{signatureDateString:htmlEncode} {signerName:htmlEncode}</span>',
        '</div>',
        '</div>',
        '</tpl>',
        '<div class="x-clear"></div>'
      ],
      // multiSelect: true,
      // height: 310,
      // trackOver: true,
      // overItemCls: 'x-item-over',
      autoScroll: true,
      itemSelector: 'div.thumb-wrap',
      /* emptyText: 'No images to display',
      /*
      plugins: [
        Ext.create('Ext.ux.DataView.DragSelector', {}),
        Ext.create('Ext.ux.DataView.LabelEditor', { dataIndex: 'name' })
      ],
      */
      prepareData: function (data) {
        Ext.apply(data, {
          // shortName: Ext.util.Format.ellipsis(data.name, 15),
          // sizeString: Ext.util.Format.fileSize(data.size),
          signatureDateString: (AC.dateService.formatDate(data.signatureDate, 'dd.mm.yyyy hh:nn'))
        })
        return data
      },
      listeners: {
        itemclick: async function (ctrl, record, item) {
          const me = ctrl.up('form')
          const signature = await $App.connection.getDocument({
            entity: 'hr_empOrderSignature',
            attribute: 'signature',
            ID: record.get('ID')
          }, {
            bypassCache: true, resultIsBinary: true
          })
          const pki = await $App.connection.pki()
          const order = await UB.Repository('hr_order')
            .attrs(['ID', 'orderClass.entityName'])
            .selectById(me.record.get('ID'))
          const verificationResult = await pki.verify(signature, {
            entity: order ? order['orderClass.entityName'] : 'hr_order',
            attribute: 'document',
            ID: me.record.get('ID') })
          return pki.verificationUI([verificationResult])
        },
        selectionchange: function (dv, nodes) { }
      }
    })
    let panelBtn = Ext.widget('panel', {
      height: 50,
      layout: { type: 'hbox', pack: 'center' },
      items: [{
        xtype: 'button',
        tooltip: UB.i18n('Вивантажити'),
        text: UB.i18n('Вивантажити'),
        cls: 'green-action',
        handler: function () {
          downloadSignatures(me.masterRecord.get('ID'), me.parentField)
        }
      }]
    })
    me.items = [view, panelBtn]
    me.hidden = true
    me.callParent(arguments)
  }
})

function downloadSignatures (docID, parentField) {
  return Promise.all([
    UB.Repository('hr_order')
      .attrs(['ID', 'orderClass.entityName'])
      .selectById(docID).then(order => {
        return $App.connection.getDocument({
          entity: order ? order['orderClass.entityName'] : 'hr_order',
          attribute: 'document',
          ID: docID
        }, { bypassCache: true, resultIsBinary: true })
      }),
    UB.Repository('hr_order').attrs(['ID', 'orderNumber', 'orderDate', 'description'])
      .where('ID', '=', docID).selectSingle(),
    UB.Repository('hr_empOrderSignature').attrs(['ID', 'signature', 'signerName', 'signatureDate'])
      .where(parentField, '=', docID)
      .where('canceled', '=', false)
      .selectAsObject()
      .then(function (items) {
        return Promise.all(
          items.map(f => $App.connection.getDocument({
            entity: 'hr_empOrderSignature',
            attribute: 'signature',
            ID: f.ID
          }, {
            bypassCache: true, resultIsBinary: true
          }))
        ).then(function (signatures) {
          items.forEach((v, i) => { v.data = signatures[i] })
          return items
        })
      })
  ]).then(function ([document, docInfo, signatures]) {
    let zip = new JSZip()
    docInfo.description = docInfo.description || UB.i18n('документ')
    zip.file(docInfo.description + '.pdf', document, {
      binary: true,
      compressionOptions: { compression: 'STORE' }
    })
    signatures.forEach(function (signature, idx) {
      let dateStr = !signature.signatureDate ? '' : AC.dateService.formatDate(AC.dateService.unshiftDate(signature.signatureDate), 'dd.mm.yyyy h:n')
      zip.file(signature.signerName + '_' + dateStr + '_' + idx + '.p7s', signature.data, {
        binary: true,
        compressionOptions: { compression: 'STORE' }
      })
    })
    let fileRes = zip.generate({ type: 'blob', compression: 'STORE' })
    fileSaver.saveAs(fileRes, docInfo.description + '.zip')
  })
}
