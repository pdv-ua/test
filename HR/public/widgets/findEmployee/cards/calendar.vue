<template>
  <el-card>
    <div class="findEmployee__card-title">Днi народження</div>
    <el-calendar v-model="value"/>
  </el-card>
</template>

<script>
  export default {
    data () {
      return {
        value: new Date()
      }
    }
  }
</script>
