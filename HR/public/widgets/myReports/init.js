const { mountUtils: { mountTab } } = require('@unitybase/adminui-vue')
const Dashboard = require('./myReports.vue').default

module.exports = function (userParams) {
  mountTab({
    component: Dashboard,
    props: { userParams },
    title: 'userReports.shortcutTitle'
  })
}
