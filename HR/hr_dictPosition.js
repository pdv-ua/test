const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const UB = require('@unitybase/ub')
const _ = require('lodash')
const orderService = require('../HR/modules/orderService')
const entityService = require('../HR/modules/entityService')

me.on('update:before', beforeUpdate)
me.on('insert:before', beforeInsert)
me.on('insert:after', updateProfession)
me.on('update:after', updateProfession)
me.on('delete:after', deleteProfession)

function beforeUpdate (ctx) {
  setDescription(ctx)
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description', 'caption'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'caption', 'nameEng',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
    'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF',
    'nameLocF', 'nameVocF', 'nameEngF', 'fullNameEng', 'nameForeign'
  ])
}

function beforeInsert (ctx) {
  setDescription(ctx)
  entityService.fixLineBreaks(ctx, ['name', 'fullName', 'description', 'caption'])
  entityService.removeExtraChars(ctx, ['code', 'name', 'fullName', 'description', 'caption', 'nameEng',
    'nameNom', 'nameGen', 'nameDat', 'nameAcc', 'nameOr', 'nameLoc', 'nameVoc', 'fullNameNom', 'fullNameGen', 'fullNameDat',
    'fullNameAcc', 'fullNameOr', 'fullNameLoc', 'fullNameVoc', 'nameNomF', 'nameGenF', 'nameDatF', 'nameAccF', 'nameOrF',
    'nameLocF', 'nameVocF', 'nameEngF', 'fullNameEng', 'nameForeign'
  ])
}

function setDescription (ctx) {
  const instanceData = JSON.parse(ctx.dataStore.asJSONObject)[0] || { }
  const execParams = ctx.mParams.execParams
  const suffix = []
  const positionType = _.isNull(execParams.positionType) ? null : (execParams.positionType || instanceData.positionType)
  if (execParams.code) {
    let codeList = String(execParams.code || '0').match(/\d+/g) || ['0']
    execParams.codeSort = Number(`${(codeList[0] || '0').substring(0, 12)}.${((codeList[1] || '0').padStart(6, '0')).substring(0, 6)}`)
  }
  if (['8', '12'].includes(positionType)) {
    // Працівник за тарифним розрядом
    // Клас (якщо є), Тарифний розряд (якщо є), Підкатегорію (якщо є) ось так:  [Вища категорія-Тарифний розряд 5-Середній медперсонал].
    const dictEmpCategory = _.isNull(execParams.dictEmpCategoryID) ? null
      : UB.Repository('hr_dictEmpCategory')
        .attrs('name')
        .where('ID', '=', execParams.dictEmpCategoryID || instanceData.dictEmpCategoryID || null)
        .misc({ __allowSelectSafeDeleted: true })
        .selectScalar()
    const dictTarifCoeff = _.isNull(execParams.dictTarifCoeffID) ? null
      : UB.Repository('hr_dictTarifCoeff')
        .attrs('name')
        .where('ID', '=', execParams.dictTarifCoeffID || instanceData.dictTarifCoeffID || null)
        .misc({ __allowSelectSafeDeleted: true })
        .selectScalar()
    const dictStaffSubCat = _.isNull(execParams.dictStaffSubCatID) ? null
      : UB.Repository('hr_dictStaffSubCat')
        .attrs('name')
        .where('ID', '=', execParams.dictStaffSubCatID || instanceData.dictStaffSubCatID || null)
        .misc({ __allowSelectSafeDeleted: true })
        .selectScalar()
    if (dictEmpCategory) suffix.push(dictEmpCategory)
    if (dictTarifCoeff) suffix.push(dictTarifCoeff)
    if (dictStaffSubCat) suffix.push(dictStaffSubCat)
  } else {
    const dictStaffCat = _.isNull(execParams.dictStaffCatID) ? null
      : UB.Repository('hr_dictStaffCat')
        .attrs('code')
        .where('ID', '=', execParams.dictStaffCatID || instanceData.dictStaffCatID || null)
        .misc({ __allowSelectSafeDeleted: true })
        .selectScalar()
    const psCategory = _.isNull(execParams.psCategory) ? null
      : UB.Repository('ubm_enum').attrs(['shortName'])
        .where('eGroup', '=', 'HR_POSITION_PSCATEGORY')
        .where('code', '=', execParams.psCategory || instanceData.psCategory || null)
        .misc({ __allowSelectSafeDeleted: true })
        .selectScalar()
    const dictStatePay = _.isNull(execParams.dictStatePayID) ? null
      : UB.Repository('hr_dictStatePay')
        .attrs('groupN')
        .where('ID', '=', execParams.dictStatePayID || instanceData.dictStatePayID || null)
        .misc({ __allowSelectSafeDeleted: true })
        .selectScalar()
    if (dictStaffCat) suffix.push(dictStaffCat)
    if (psCategory) suffix.push(psCategory)
    if (dictStatePay) suffix.push(dictStatePay)
  }
  const code = _.isNull(execParams.code) ? '' : (execParams.code || instanceData.code || '')
  execParams.description = (code + ' ' + (execParams.name || instanceData.name) + (suffix.length ? ' [' + suffix.join('-') + ']' : '')).trim()
}

function updateProfession (ctx) {
  let mParams = ctx.mParams
  let execParams = mParams.execParams
  const dictPosition = UB.Repository('hr_dictPosition').attrs(['*']).selectById(execParams.ID)
  if (!dictPosition) {
    return
  }
  orderService.updateProfession(dictPosition)
}
function deleteProfession (ctx) {
  const execParams = ctx.mParams.execParams
  const profession = UB.Repository('org_profession').attrs(['ID']).where('ID', '=', execParams.ID).selectSingle()
  const store = UB.DataStore('org_profession')
  if (profession) {
    return
  }
  store.run('delete', {
    execParams: {
      ID: profession.ID
    }
  })
  store.freeNative()
}
