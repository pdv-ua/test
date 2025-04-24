const { mountUtils: { mountTab } } = require('@unitybase/adminui-vue')
const Dashboard = require('./dashboard.vue').default

module.exports = function (userParams) {
  mountTab({
    component: Dashboard,
    props: { userParams },
    title: 'dashboard.shortcutTitle'
  })
}
