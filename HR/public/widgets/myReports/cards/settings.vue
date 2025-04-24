<template>
    <el-card>
        <div class="myReports__setting">
            <el-tooltip
                    effect="dark"
                    content="Додати категорію"
                    placement="bottom-start" >
                <u-button
                        icon="fa fa-plus-circle"
                        size="small"
                        appearance="inverse"
                        @click="addNewCategory()">
                </u-button>
            </el-tooltip>
        </div>
    </el-card>
</template>

<script>
  export default {
    data: () => ({

    }),
    mounted () {

    },
    methods: {
      async addNewCategory () {
        $App.doCommand({
          cmdType: 'showForm',
          formCode: 'hr_myReportsCategory',
          cmpInitConfig: {
            isNewCategory: true,
            onSelectData: () => {
              const me = this
              me.$parent.loadUserReports()
            }
          }
        })
      }
    }
  }

</script>

<style>
.myReports__setting{
padding: 0px;
margin: 0px;
justify-content: right;
align-items: center;
text-align: right;
}
</style>

