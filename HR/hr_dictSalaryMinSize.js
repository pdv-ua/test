const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const dateService = require('../AC/modules/dataServices/dateService')

me.on('insert:before', beforeInsert)
me.on('update:before', beforeUpdate)

function beforeInsert (ctx) {
  // const execParams = ctx.mParams.execParams
  // if (!execParams.dateTo) {
  //   execParams.dateTo = dateService.maxDate()
  // }
  // validateData(execParams)
}

function beforeUpdate (ctx) {
  // const execParams = ctx.mParams.execParams
  // if (!execParams.dateTo) {
  //   execParams.dateTo = dateService.maxDate()
  // }
  // validateData(execParams)
}

function validateData (execParams) {
  // let dateFrom = new Date(execParams.dateFromView)
  // let dateTo = new Date(execParams.dateToView)
  // if (!dateFrom || !dateTo) {
  //   const instanceData = UB.Repository(__entityName)
  //     .attrs(['dateFrom', 'dateTo'])
  //     .where('ID', '=', execParams.ID)
  //     .orderBy('dateFrom', 'asc')
  //     .selectSingle()
  //   if (!instanceData) {
  //     return
  //   }
  //   dateFrom = new Date(instanceData.dateFrom)
  //   dateTo = new Date(instanceData.dateTo)
  // }
  // if (dateFrom > dateTo) {
  //   throw new UB.UBAbort(`<<<Дата початку ${dateService.formatDate(dateFrom)} не може бути більшою за дату закінчення ${dateService.formatDate(dateTo)}>>>`)
  // }
  // const checkData = UB.Repository(__entityName)
  //   .attrs(['dateFrom', 'dateTo'])
  //   .where('dateFrom', '<=', dateTo)
  //   .where('dateTo', '>=', dateFrom)
  //   .where('ID', '!=', execParams.ID)
  //   .orderBy('dateFrom', 'asc')
  //   .selectAsObject()
  // if (checkData.length) {
  //   let msgArray = []
  //   checkData.forEach(item => {
  //     msgArray.push(`з ${dateService.formatDate(item.dateFrom)} по ${dateService.formatDate(item.dateTo)}`)
  //   })
  //   throw new UB.UBAbort(`<<<Період запису перетинається з іншим періодом:<br>${msgArray.join('<br>')}>>>`)
  // }
}
