<template>
  <div
    class="u-sidebar__quick-access-group"
    :class="{'u-sidebar-column': isCollapsed}"
  >
    <el-tooltip
      :content="$ut('Робочий стіл')"
      :placement="isCollapsed ? 'left': 'bottom'"
    >
      <el-button
        icon="fa fa-search"
        round
        :class="{'u-sidebar__button-column': isCollapsed}"
        @click="showDashboard"
      />
    </el-tooltip>
  </div>
</template>

<script>
const dashboardInit = require('./dashboard/init.js')
export default {
  name: 'DocSidebarButtons',
  data () {
   let reservationAccessible = AC.entityUtils.verifyRightsMethod('hr_service', 'dashboard')
    return {
      reservationAccessible: reservationAccessible,
    }
  },
  computed: {
    isCollapsed () {
      return this.$parent.isCollapsed
    }
  },
  methods: {
    showDashboard () {
      doShowDashboard()
    }
  }
}

function doShowDashboard () {
  const hasDashboardRole = AC.entityUtils.verifyRightsMethod('hr_service', 'dashboard')
  if (hasDashboardRole) {
    dashboardInit()
  }
}
</script>

<style>
  .u-sidebar__quick-access-group {
    display: flex;
    justify-content: space-around;
    align-items: center;
    border-bottom: 1px solid rgba(var(--info), 0.15);
    padding-bottom: 10px;
    flex-shrink: 0;
  }

  .u-sidebar-column {
    flex-direction: column;
    padding-bottom: 0;
  }

  .u-sidebar__button-column {
    margin-bottom: 10px;
    margin-left: 0 !important;
  }

  .u-sidebar__dropdown-menu-button {
    text-align: center;
    height: min-content;
    max-height: 600px;
    overflow-y: scroll;
  }
</style>
