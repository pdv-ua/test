/* global  $App, AC */
<template>
  <div class="u-form-layout">
    <u-toolbar/>
    <u-form-container
      v-loading.body="loading"
      label-position="top"
      :max-width="800"
    >
      <u-auto-field attribute-name="rate" />
      <u-auto-field attribute-name="dateFrom" />
      <u-auto-field attribute-name="dateTo" />
    </u-form-container>
  </div>
</template>

<script>
const { Form, mapInstanceFields } = require('@unitybase/adminui-vue')
const { mapGetters, mapActions, mapMutations } = require('vuex')
const UB = require('@unitybase/ub-pub')

module.exports.mount = cfg => {
  Form(cfg)
     .store({ // .store можно не использовать если не требуется иметь дополнительные параметры в нем
      state: {
        dictEducationRankID: cfg.parentContext.dictEducationRankID,
        instanceID: cfg.instanceID
      },
    })
    .processing({
      async beforeSave (store) {
        const item = store._modules.root.state.data
        const dataCollections = store.state.collections.data.items
        const data = dataCollections.map(i => i.data).filter(d => d.ID !== item.ID)
        if (data && data.length) {
          const oneDay = 1000 * 60 * 60 * 24
          const curreDateFrom = item.dateFrom
          const curreDateTo = item.dateTo
          const isInside = data.find(d => d.dateFrom >= curreDateFrom && d.dateTo <= curreDateTo)
          const isAround = data.find(d => d.dateFrom <= curreDateFrom && d.dateTo >= curreDateTo)
          const isUpper = data.find(d => d.dateFrom >= curreDateFrom && d.dateTo >= curreDateTo && d.dateFrom <= curreDateTo)
          const isLow = data.find(d => d.dateFrom <= curreDateFrom && d.dateTo <= curreDateTo && d.dateTo >= curreDateFrom)
          const isCrossing =  isUpper && isLow ? false : isUpper || isLow ? true : false
          if (!isCrossing) {
            if (isInside || isAround) {
              throw new UB.UBAbort(`<<< Неможливо відкоригувати дати інтервалів інших записів - збігається дата початку або дата кінця. Відкоригуйте дати дії поточного інтервалу і повторіть збереження >>>`)
            }
          }
          const dialogQuestion = 'Інтервал дії перетинається із іншими записами. Відкоригувати дати інтервалу дії інших записів?'
          const choice = await $App.dialogYesNo(UB.i18n('Попередження'), UB.i18n(dialogQuestion))
          if (!choice) {
            return
          }
          const that = this
          if (isUpper) {
            update(isUpper, 'dateFrom', new Date(Date.parse(curreDateTo) + oneDay), that)
          }
          if (isLow) {
            update(isLow, 'dateTo', new Date(Date.parse(curreDateFrom) - oneDay), that)
          }
          function update (item, key, value, that) {
            const index = dataCollections.findIndex(p => p.data.ID === item.ID)
            that.storeConfig.mutations.SET_DATA(store.state, {
              collection: 'data',
              index,
              key: key,
              value: value
            })
          }
        }
      },
      collections: {
        data: ({ state }) => UB.connection
          .Repository('trf_dictEducationRankRate')
            .attrs('ID', 'dateFrom', 'dateTo')
            .where('dictEducationRankID', '=', state.dictEducationRankID)
            .where('mi_deleteDate', '=', '9999-12-31')
      }
    })
    .validation()
    .mount()
}

module.exports.default = {
  name: 'dictEducationRankRate',
  inject: ['entitySchema', '$v', 'entity'],

  computed: {
    ...mapInstanceFields([
      'dateFromEmpty', 'dateToEmpty', 'rate'
    ])
  },
  
  methods: {
    ...mapGetters(['loading']),
    ...mapActions(['refresh']),
    ...mapMutations(['SET_DATA'])
  }
}
</script>
