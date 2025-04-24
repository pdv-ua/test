/* global UB */
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const stringService = require('../AC/modules/dataServices/stringService')
const Session = UB.Session

me.entity.addMethod('createUsers')

me.createUsers = function (ctx) {
  const mParams = ctx.mParams
  const onDate = mParams.onDate
  const orgID = mParams.orgID
  const employeeNumberID = mParams.employeeNumberID
  const employeeList = employeeNumberID
    ? UB.Repository('hr_employeeNumber')
      .attrs(['ID', 'employeeID', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName', 'employeeID.fullFIO'])
      .where('ID', '=', employeeNumberID)
      .selectAsObject()
    : UB.Repository('hr_employeeNumber')
      .attrs(['ID', 'employeeID', 'employeeID.firstName', 'employeeID.lastName', 'employeeID.middleName', 'employeeID.fullFIO'])
      .where('orgID', '=', orgID)
      .exists(UB.Repository('hr_employeePosition')
        .correlation('employeeNumberID', 'ID')
        .where('dateFrom', '<=', onDate)
        .where('dateTo', '>=', onDate)
        .where('workPlace', '=', '1')
        .where('mi_deleteDate', '>=', '#maxdate')
      )
      .notExists(UB.Repository('uba_user')
        .correlation('employeeNumberID', 'ID')
      ).selectAsObject()

  const groupID = UB.Repository('uba_group')
    .attrs('ID')
    .where('code', '=', 'group_cabinetUsers')
    .selectScalar()

  if (!groupID) {
    throw new UB.UBAbort(`<<<${UB.i18n('Не знайдено групу користувачів')}>>>`)
  }
  const store = UB.DataStore('uba_user')
  const orgStore = UB.DataStore('ac_userOrganization')
  const groupStore = UB.DataStore('uba_usergroup')
  employeeList.forEach(emp => {
    const loginUA = [emp['employeeID.lastName'], (emp['employeeID.firstName'] || '').charAt(0), (emp['employeeID.middleName'] || '').charAt(0)].filter(Boolean).join('_')
    const loginT = stringService.transliterate(loginUA)
    let login = loginT
    let isExist = true
    let npp = 1
    while (isExist) {
      const usr = UB.Repository('uba_user')
        .attrs(['ID'])
        .where('name', '=', login)
        .limit(1)
        .selectSingle()
      if (!usr) {
        isExist = false
        let userID = store.generateID()
        store.run('insert', {
          execParams: {
            ID: userID,
            name: login,
            fullName: emp['employeeID.fullFIO'],
            employeeNumberID: emp.ID
          }
        })
        store.execSQL(
          'update uba_user set uPasswordHashHexa=:newPwd:, lastPasswordChangeDate=:lastPasswordChangeDate: where id = :userID:',
          {
            newPwd: Session._buildPasswordHash(login, login),
            lastPasswordChangeDate: new Date(2000, 1, 1),
            userID: userID
          }
        )
        orgStore.run('insert', {
          execParams: {
            organizationID: orgID,
            userID: userID
          }
        })
        groupStore.run('insert', {
          execParams: {
            groupID: groupID,
            userID: userID
          }
        })
        mParams.userID = userID
      } else {
        login = loginT + '_' + npp
        npp++
      }
    }
  })
}
