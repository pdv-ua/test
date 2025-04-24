module.exports = {
  title: UB.i18n('Параметри'),
  xtype: 'panel',
  layout: 'fit',
  align: 'stretch',
  border: 2,
  layoutConfig: {
    collapsible: true,
    collapsed: true
  },
  flex: 1,
  items: [
    {
      xtype: 'panel',
      hidden: true,
      collapsed: false
    },
    {
      xtype: 'panel',
      collapsed: false,
      layout: { type: 'vbox', align: 'stretch' },
      items: [ ]
    }
  ]
}
