/* global Ext */
Ext.define('HR.controls.LinkButton', {
  extend: 'Ext.Component',
  alias: 'widget.linkbutton',
  autoEl: {
    tag: 'a',
    href: '#'
  },
  renderTpl: '{text}',
  initComponent: function () {
    this.renderData = {
      text: this.text
    }
    this.callParent(arguments)
  },
  afterRender: function () {
    this.mon(this.getEl(), 'click', this.handler, this)
  },
  handler: Ext.emptyFn
})
