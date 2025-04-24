<template>
  <div class="findEmployee-grid">
    <employee class="findEmployee__employee"/>
    <!--<order-projects class="findEmployee__order-projects"/>-->
    <!--<calendar class="findEmployee__calendar"/>-->
    <!--<org-structure class="findEmployee__org-structure"/>-->
    <!--<oath-positions class="findEmployee__oath-positions"/>-->
    <!--<orders-other class="findEmployee__orders-other"/>-->
    <!--<tasks class="findEmployee__tasks"/>-->
  </div>
</template>

<script>
  const Employee = require('./cards/employee.vue').default
  const OrderProjects = require('./cards/order-projects.vue').default
  const Calendar = require('./cards/calendar.vue').default
  const OrgStructure = require('./cards/org-structure.vue').default
  const OathPositions = require('./cards/oath-positions.vue').default
  const OrdersOther = require('./cards/orders-other.vue').default
  const Tasks = require('./cards/tasks.vue').default

  export default {
    components: {
      Employee,
      OrderProjects,
      Calendar,
      OrgStructure,
      OathPositions,
      OrdersOther,
      Tasks
    }
  }
</script>

<style>
  .findEmployee-grid{
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: min-content;
    overflow-y: auto;
    height: 100%;
    grid-gap: 20px;
    padding: 20px;

    grid-template-areas:
      'employee calendar'
      'order-projects calendar'
      'org-structure oath-positions'
      'tasks orders-other';
  }

  .findEmployee-grid:after {
    content: "";
    height: 1px;
    grid-column: 1 / 1;
  }

  .findEmployee__card-title{
    font-size: 17px;
    font-weight: 500;
    padding-bottom: 30px;
  }

  .findEmployee__employee{
    grid-area: employee;
  }

  .findEmployee__order-projects{
    grid-area: order-projects;
  }

  .findEmployee__calendar{
    grid-area: calendar;
  }

  .findEmployee__org-structure{
    grid-area: org-structure;
  }

  .findEmployee__oath-positions{
    grid-area: oath-positions;
  }

  .findEmployee__orders-other{
    grid-area: orders-other;
  }

  .findEmployee__tasks{
    grid-area: tasks;
  }
</style>
