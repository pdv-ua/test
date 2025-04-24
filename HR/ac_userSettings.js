const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
me.entity.addMethod('saveSelection')
me.entity.addMethod('deleteCat')
me.entity.addMethod('saveSelectionOrg')
me.entity.addMethod('deleteCatOrg')

me.saveSelection = function (ctx) {
  const mParams = ctx.mParams
  const userID = mParams.userID
  const catName = mParams.catName
  const catCode = mParams.catCode
  const actionCode = mParams.actionCode
  const codes = JSON.parse(mParams.codes)

  const settingName = mParams.settingName
  const store = UB.DataStore('ac_userSettings')

  let userSettings = UB.Repository('ac_userSettings')
    .attrs(['ID', 'params'])
    .where('userID', '=', userID)
    .selectSingle()
  let userSettingsID = userSettings ? userSettings.ID : null
  let userParams = userSettings ? JSON.parse(userSettings.params) : null

  switch (actionCode) {
    case 'addNewCat':
      if (userSettings) {
        if (userParams[settingName]) {
          userParams[settingName].lastCatCode = catCode
          userParams[settingName].catList.push({
            catName,
            catCode,
            rowList: codes
          })
        } else {
          userParams[settingName] = {
            lastCatCode: catCode,
            catList: [{
              catName,
              catCode,
              rowList: codes
            }]
          }
        }
        store.run('update', {
          execParams: {
            ID: userSettingsID,
            params: JSON.stringify(userParams)
          }
        })
      } else {
        store.run('insert', {
          execParams: {
            userID: userID,
            params: JSON.stringify({
              [`${settingName}`]: {
                lastCatCode: catCode,
                catList: [{
                  catName,
                  catCode,
                  rowList: codes
                }]
              }
            })
          }
        })
      }

      break
    case 'editExistedCat':
      let currCat = userParams[settingName].catList.find(cat => cat.catCode === catCode)
      currCat.catName = catName
      currCat.rowList = codes
      store.run('update', {
        execParams: {
          ID: userSettingsID,
          params: JSON.stringify(userParams)
        }
      })
      break
  }
}

me.saveSelectionOrg = function (ctx) {
  const mParams = ctx.mParams
  const userID = mParams.userID
  const catName = mParams.catName
  const catCode = mParams.catCode
  const orgID = mParams.orgID
  const actionCode = mParams.actionCode
  const codes = JSON.parse(mParams.codes)

  const settingName = mParams.settingName
  const store = UB.DataStore('ac_userSettings')

  let userSettings = UB.Repository('ac_userSettings')
    .attrs(['ID', 'params'])
    .where('userID', '=', userID)
    .selectSingle()
  let userSettingsID = userSettings ? userSettings.ID : null
  let userParams = userSettings ? JSON.parse(userSettings.params) : null

  switch (actionCode) {
    case 'addNewCat':
      if (userSettings) {
        if (userParams[settingName]) {
          let userOrgParams = userParams[settingName].find(el => el.orgID === orgID)
          if (userOrgParams) {
            userOrgParams.lastCatCode = catCode
            userOrgParams.catList.push({
              catName,
              catCode,
              rowList: codes
            })
          } else {
            userParams[settingName].push({
              orgID: orgID,
              lastCatCode: catCode,
              catList: [{
                catName,
                catCode,
                rowList: codes
              }]
            })
          }
        } else {
          userParams[settingName] = [
            {
              orgID: orgID,
              lastCatCode: catCode,
              catList: [{
                catName,
                catCode,
                rowList: codes
              }]
            }
          ]
        }
        store.run('update', {
          execParams: {
            ID: userSettingsID,
            params: JSON.stringify(userParams)
          }
        })
      } else {
        store.run('insert', {
          execParams: {
            userID: userID,
            params: JSON.stringify({
              [`${settingName}`]: [
                {
                  orgID: orgID,
                  lastCatCode: catCode,
                  catList: [{
                    catName,
                    catCode,
                    rowList: codes
                  }]
                }
              ]
            })
          }
        })
      }

      break
    case 'editExistedCat':
      let currCat = userParams[settingName].find(el => el.orgID === orgID).catList.find(cat => cat.catCode === catCode)
      currCat.catName = catName
      currCat.rowList = codes
      store.run('update', {
        execParams: {
          ID: userSettingsID,
          params: JSON.stringify(userParams)
        }
      })
      break
  }
}

me.deleteCat = function (ctx) {
  const mParams = ctx.mParams
  const userID = mParams.userID
  const settingName = mParams.settingName

  const catCode = mParams.catCode

  const store = UB.DataStore('ac_userSettings')

  let userSettings = UB.Repository('ac_userSettings')
    .attrs(['ID', 'params'])
    .where('userID', '=', userID)
    .selectSingle()
  let userSettingsID = userSettings.ID
  let userParams = JSON.parse(userSettings.params)
  userParams[settingName].catList = userParams[settingName].catList.filter(el => el.catCode !== catCode)
  store.run('update', {
    execParams: {
      ID: userSettingsID,
      params: JSON.stringify(userParams)
    }
  })
}

me.deleteCatOrg = function (ctx) {
  const mParams = ctx.mParams
  const userID = mParams.userID
  const settingName = mParams.settingName

  const catCode = mParams.catCode
  const orgID = mParams.orgID

  const store = UB.DataStore('ac_userSettings')

  let userSettings = UB.Repository('ac_userSettings')
    .attrs(['ID', 'params'])
    .where('userID', '=', userID)
    .selectSingle()
  let userSettingsID = userSettings.ID
  let userParams = JSON.parse(userSettings.params)

  userParams[settingName].find(el => el.orgID === orgID).catList = userParams[settingName].find(el => el.orgID === orgID).catList.filter(el => el.catCode !== catCode)
  store.run('update', {
    execParams: {
      ID: userSettingsID,
      params: JSON.stringify(userParams)
    }
  })
}
