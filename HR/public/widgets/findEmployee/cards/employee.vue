<template>
  <div class="employee-search el-card is-always-shadow">
    <div class="employee-search__header">
      <el-avatar
        class="employee-search__avatar"
        :size="150"
        icon="employee-search__avatar__icon el-icon-user-solid"
        :src="avatar"
      />
      <el-tooltip
        class="employee-search__gender"
        :enterable="false"
        :content="$ut('hr_employee.sexType')"
        placement="left"
        effect="light"
      >
        <i
          class="fa"
          :class="{
            'fa-mars': sexType === 'M',
            'fa-venus': sexType === 'W'
          }"
        />
      </el-tooltip>
      <div class="employee-search__data">
          <employee-input />
          <div
            class="employee-search__position-name"
            :class="{
              'employee-search__skeleton employee-search__skeleton__dark': isBlankEmployee
            }"
          >
            {{ posName }}
          </div>
      </div>
    </div>
    <div class="employee-search__footer">
      <div class="employee-search__data">
        <div class="employee-search__data__row" :class="{ 'employee-search__skeleton': isBlankEmployee }">
          <span class="employee-search__data__label">
            {{ $ut('hr_employeeNumber.depName') }}
          </span>
          {{ depName }}
        </div>
        <div class="employee-search__data__row" :class="{ 'employee-search__skeleton': isBlankEmployee }">
          <span class="employee-search__data__label">
            {{ $ut('hr_position.positionType') }}
          </span>
          {{ positionType }}
        </div>
        <div class="employee-search__data__row" :class="{ 'employee-search__skeleton': isBlankEmployee }">
          <span class="employee-search__data__label">
            {{ $ut('hr_position.psCategory') }}
          </span>
          {{ psCategory }}
        </div>
        <div class="employee-search__data__row" :class="{ 'employee-search__skeleton': isBlankEmployee }">
          <span class="employee-search__data__label">
            {{ $ut('hr_employee.birthDate') }}
          </span>
          {{ formatDate(birthDate) }} <span class="employee-search__age" v-show="age">({{ age }} рокiв)</span>
        </div>
        <div class="employee-search__data__row" :class="{ 'employee-search__skeleton': isBlankEmployee }">
          <span class="employee-search__data__label">
            {{ $ut('hr_employee.dictEducationLevelID') }}
          </span>
          {{ education }}
        </div>
      </div>
      <el-button
        class="employee-search__button"
        :class="{ 'employee-search__button__skeleton': isBlankEmployee }"
        type="primary"
        @click="openEmployee"
        v-bind:hidden="empButtonHidden"
      >
        {{ $ut('findEmployee.button') }}
        <i class="el-icon-arrow-right" />
      </el-button>
    </div>
  </div>
</template>

<script>
  /*global $App*/
  const EmployeeInput = require('./employee-input.vue').default
  const { mapState } = require('vuex')

  export default {
    components: {
      EmployeeInput
    },

    data: () => ({
      empButtonHidden: !AC.entityUtils.verifyRightsMethod('hr_employee', 'view')
    }),

    computed: {
      ...mapState([
        'depName',
        'posName',
        'posCategoryName',
        'birthDate',
        'age',
        'sexType',
        'education',
        'employeeNumberID',
        'positionType',
        'psCategory',
        'employeeID',
        'avatar'
      ]),

      isBlankEmployee () {
        return this.employeeNumberID === null
      }
    },

    methods: {
      formatDate (date) {
        if (date) {
          return this.$moment(date).format('DD.MM.YYYY')
        } else {
          return null
        }
      },

      openEmployee () {
        if (AC.entityUtils.verifyRightsMethod('hr_service', 'openEmpCard')) {
          const entity = 'hr_employee'
          const instanceID = this.employeeID

          $App.doCommand({
            cmdType: 'showForm',
            entity,
            instanceID,

            // temporary fix, problem in UB.core.UBCommand.showForm
            target: $App.viewport.centralPanel,
            tabId: entity + entity + instanceID
          })
        }
      }
    }
  }
</script>


<style>
  .employee-search{
    display: flex;
    flex-direction: column;
  }

  .employee-search__header{
    background: linear-gradient(to left bottom, rgb(var(--bg)), rgba(var(--bg-hover), 0.6));
    position: relative;
    padding: 40px 0;
  }

  .employee-search__avatar{
    position: absolute;
    top: 100%;
    left: 50px;
    margin-top: -75px;
    border: 5px solid white;
  }

  .employee-search__avatar__icon{
    font-size: 50px;
  }

  .employee-search__footer{
    padding: 20px 0;
  }

  .employee-search__data{
    padding-left: 250px;
    padding-right: 70px;
  }

  .employee-search__gender{
    color: white;
    font-size: 24px;
    position: absolute;
    top: 20px;
    right: 20px;
  }

  .employee-search__position-name{
    margin-top: 8px;
    color: rgba(var(--text-contrast), 0.7);
    font-size: 17px;
    padding-left: 5px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    min-height: 20px; /*when empty*/
  }

  .employee-search__data__row {
    margin-bottom: 20px;
    line-height: 1.4;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    padding-right: 20px;
  }

  .employee-search__data__label{
    color: rgb(var(--info));
    margin-right: 4px;
  }

  .employee-search__data__label:after{
    content: ':';
  }

  .employee-search__skeleton{
    position: relative;
    padding-left: 10px; /*hide content which overflow because of border-radius*/
  }

  .employee-search__skeleton:after{
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #e8e8e8;
    border-radius: 50px;
  }

  .employee-search__skeleton__dark:after {
    background: #858890;
  }

  .employee-search__button{
    float: right;
    margin-right: 20px;
  }

  .employee-search__button__skeleton{
    border-color: #e8e8e8 !important;
    color: #e8e8e8 !important;
    background: #e8e8e8 !important;
    cursor: default;
    pointer-events: none;
  }
</style>
