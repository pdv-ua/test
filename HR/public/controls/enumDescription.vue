<template>
  <span>{{ displayValue }}</span>
</template>

<script>
/**
* Component for select UB enum.
*/
export default {
  name: 'UEnumDescription',
  props: {
    /**
     * Selected item ID
     * @model
     */
    value: {
      type: [Number, String],
      default () {
        return null
      }
    },
    /**
     * Enum group from dictionary 'ubm_enum'
     */
    eGroup: {
      type: String,
      required: true
    },
  },

  data () {
    return {
      valueAttribute: 'code',
      enumEntity: 'ubm_enum',
      displayValue: null
    }
  },

  computed: {
    entitySchema () {
      return this.$UB.connection.domain.get(this.enumEntity)
    },

    displayAttribute () {
      return this.entitySchema.descriptionAttribute
    }
  },

  methods: {
    getEnumRequest () {
      return this.$UB.Repository(this.enumEntity)
        .attrs('eGroup', this.valueAttribute, this.displayAttribute, 'sortOrder')
        .where('eGroup', '=', this.eGroup)
        .orderBy('sortOrder')
    },

    fillData () {
      this.displayValue = null
      return this.getEnumRequest()
        .where(this.valueAttribute, '=', this.value)
        .selectSingle()
        .then((item) => {
          if (item) {
            this.displayValue = item[this.displayAttribute]
          }
        })
    }
  },

  watch: {
    // when value (ID) changed need to get formatted label
    value: {
      immediate: true,
      handler: 'fillData'
    }
  },
  // created() {
  //   this.fillData()
  // },
}
</script>
