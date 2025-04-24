<template>
  <div class="employee-search__fio">
    <i
      class="employee-search__fio-icon el-icon-search"
      @click="selectInput"
    />
    <u-select-entity
      v-model="employeeNumberID"
      :repository="repository"
      remove-default-actions
      clearable
      ref="entitySelect"
      placeholder="findEmployee.search.input.placeholder"
      class="employee-search__fio__input"
    />
  </div>
</template>

<script>
  /*global appHR*/
  const { computedVuex } = require('@unitybase/adminui-vue')

  export default {
    computed: {
      ...computedVuex(['employeeNumberID']),

      globalOrganization () {
        return appAC.globalOrganization()
      }
    },

    watch: {
      globalOrganization () {
        this.employeeNumberID = null
      }
    },

    methods: {
      selectInput () {
        this.$refs.entitySelect.$refs.input.select()
      },

      repository () {
        return this.$UB.Repository('hr_employeeNumberS')
          .attrs('ID', 'description')
          .where('orgID', '=', this.globalOrganization)
      }
    }
  }
</script>

<style>
  .employee-search__fio{
    position: relative;
  }

  .employee-search__fio__input .el-input__inner{
    background: none;
    color: #51515c;
    border: none;
    border-bottom: 1px solid rgba(var(--text-contrast), 0.5);
    border-radius: 0;
    font-size: 20px;
    font-weight: 500;
    padding: 0;
    padding-bottom: 4px;
    padding-left: 5px;
  }


  .employee-search__fio__input .el-input__suffix{
    right: 0;
  }

  .employee-search__fio__input .el-input__icon{
    color: 1px solid rgba(var(--text-contrast), 0.5);
  }

  .employee-search__fio-icon{
    --size: 24px;
    font-size: var(--size);
    position: absolute;
    right: calc(100% + 10px);
    top: calc(50% - (var(--size) / 2));
    color: white;
    cursor: pointer;
  }
</style>
