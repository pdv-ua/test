const __entityName = __filename.slice(__dirname.length + 1, -3)
const UB = require('@unitybase/ub')
const me = global[__entityName]

me.entity.addMethod('loadEmployeeList')

me.loadEmployeeList = function (ctx) {
    const mParams = ctx.mParams
    const ds = UB.DataStore('hr_employeeTaskDt')
    if (mParams.isDeleteExisting) {
      const existing = UB.Repository('hr_employeeTaskDt').attrs('ID')
        .where('employeeTaskID', '=', mParams.employeeTaskID)
        .select()
      while (!existing.eof) {
        ds.run('delete', { execParams: { ID: existing.get('ID') } })
        existing.next()
      }
    }

    let i=0
    mParams.records.forEach(employeeNumberID=>{
        const isNotExist = mParams.isDeleteExisting || UB.Repository('hr_employeeTaskDt')
            .attrs('ID','employeeTaskID','employeeNumberID')
            .where('employeeNumberID', '=', employeeNumberID)
            .where('employeeTaskID', '=', mParams.employeeTaskID)
            .select()
            .eof
        if (isNotExist) {
            ds.run('insert', {
                execParams: {
                    employeeTaskID: mParams.employeeTaskID, 
                    employeeNumberID: employeeNumberID,
                    taskDtState: mParams.taskDtState 
                }
              })
              i++
        }
    })
    mParams.insCount = i
}