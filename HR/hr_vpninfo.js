/* global UB, ubs_settings */
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
me.entity.addMethod('setpassword')
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')

const Session = require('@unitybase/ub').Session

me.rls = function () {
  if (entityBaseService.userIsMemberOf({ roleNames: ['admin'] })) {
    return '(1=1)'
  }
  return `( [userID] = :(${Session.userID}): )`
}

me.on('insert:before', function (ctxt) {
  const execParams = ctxt.mParams.execParams
  if (execParams.userID !== Session.userID && !entityBaseService.userIsMemberOf({ roleNames: ['admin'] })) {
    throw new UB.UBAbort('Acess deny')
  }
})

me.setpassword = function (ctxt) {
  const execParams = ctxt.mParams.execParams
  if (!execParams.userID) return
  let ID = UB.Repository('hr_vpninfo').attrs(['ID']).where('userID', '=', execParams.userID).selectScalar()
  let store = UB.DataStore(__entityName)
  if (execParams.userID !== Session.userID && !entityBaseService.userIsMemberOf({ roleNames: ['admin'] })) {
    throw new UB.UBAbort('Acess deny')
  }

  // eslint-disable-next-line camelcase
  let passwordPolicy = ubs_settings ? {
    minLength: ubs_settings.loadKey('UBA.passwordPolicy.minLength', 3),
    checkCmplexity: ubs_settings.loadKey('UBA.passwordPolicy.checkCmplexity', false),
    checkDictionary: ubs_settings.loadKey('UBA.passwordPolicy.checkDictionary', false),
    allowMatchWithLogin: ubs_settings.loadKey('UBA.passwordPolicy.allowMatchWithLogin', false),
    checkPrevPwdNum: ubs_settings.loadKey('UBA.passwordPolicy.checkPrevPwdNum', 4)
  } : {}

  let newPwd = execParams.password || ''
  // minLength
  if (passwordPolicy.minLength > 0) {
    if (newPwd.length < passwordPolicy.minLength) {
      throw new UB.UBAbort('<<<Password is too short>>>')
    }
  }

  // checkCmplexity
  if (passwordPolicy.checkCmplexity) {
    if (!(/[A-Z]/.test(newPwd) && /[a-z]/.test(newPwd) &&
        /[0-9]/.test(newPwd) && /[~!@#$%^&*()_+|\\=\-/'":;<>]/.test(newPwd))
    ) {
      throw new UB.UBAbort('<<<Password is too simple>>>')
    }
  }

  store.run((ID ? 'update' : 'insert'), {
    __skipOptimisticLock: true,
    execParams: {
      ID: ID || store.generateID(),
      userID: execParams.userID,
      uPasswordHashVpn: execParams.password
    }
  })
}
