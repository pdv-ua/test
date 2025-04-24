const { mountUtils: { mountTab } } = require('@unitybase/adminui-vue')
const findEmployee = require('./findEmployee.vue').default
const Vuex = require('vuex')
const storeCfg = require('./store.js')

module.exports = function () {
  const store = new Vuex.Store(storeCfg)

  mountTab({
    component: findEmployee,
    store,
    title: 'findEmployee.title'
  })
}
