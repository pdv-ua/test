const UB = require('@unitybase/ub')
const __entityName = __filename.slice(__dirname.length + 1, -3)
const me = global[__entityName]
const entityBaseService = require('../AC/modules/entityServices/entityBaseService')
const entityService = require('../HR/modules/entityService')
const calcService = require('../HR/modules/calcService')

me.entity.addMethod('dashboard')
me.entity.addMethod('myReportsDashboard')
me.entity.addMethod('openEmpCard')
me.entity.addMethod('notShowSalary')
me.entity.addMethod('setDocDefaultParams')

let compositeDictEntityList = [
  global['hr_employee'],
  global['hr_employeeAccrual'],
  global['hr_positionHarmful'],
  global['hr_positionAccrual'],
  global['hr_dictIllnessPercent'],
  global['hr_dictTaxIndivid'],
  global['hr_dictTimeCostGroup'],
  global['hr_dictTimeCostInt'],
  global['hr_dictTimeCost'],
  global['hr_dictMilitaryRank'],
  global['hr_exportFields'],
  global['hr_dictTimeGroup'],
  global['hr_dictTariffGroup'],
  global['hr_dictTarifCoeff'],
  global['hr_dictWagePay'],
  global['hr_categPayEl'],
  global['hr_dictLivingCost'],
  global['hr_payEl'],
  global['hr_payFund'],
  global['hr_dictVacationCorr'],
  global['hr_dictIllnessRegime'],
  global['hr_dictRank'],
  global['hr_dictVacationKind'],
  global['hr_empVacationPlan'],
  global['hr_empVacationPeriod'],
  global['hr_people'],
  global['hr_dictProfession'],
  global['hr_dictBonusReason'],
  global['hr_dictSalaryRank'],
  global['hr_dictPayStage'],
  global['hr_workSchedule'],
  global['hr_dictStatePay'],
  global['hr_payPerm'],
  global['hr_fundPerm'],
  global['hr_dictStaffCat'],
  global['hr_dictStaffSubCat'],
  global['hr_employeeFamily'],
  global['hr_docRegVacation'],
  global['hr_docRegVacationUnpaid'],
  global['hr_docRegBusinessTrip'],
  global['hr_docRegVacationCompensation'],
  global['hr_docRegVacationKid'],
  global['hr_employeePayOut'],
  global['hr_payRetention'],
  global['hr_taxLimit'],
  global['hr_dictRequirements'],
  global['hr_dictParentUnitType'],
  global['hr_payElDepend'],
  global['hr_employeeWorkbook'],
  global['hr_outgoingFalseFact'],
  global['hr_dictDisabilityType'],
  global['hr_employeeBenefits'],
  global['hr_employeeTaxLimit'],
  global['hr_publServRang'],
  global['hr_dictExperience'],
  global['hr_dictExperienceDt'],
  global['hr_dictAddInfKind'],
  global['hr_employeeDisability'],
  global['hr_employeeSickLimit'],
  global['hr_payElTaxIndividEntry'],
  global['hr_departmentKind'],
  global['hr_docRegAvgPay'],
  global['hr_docRegRenewal'],
  global['hr_calendarHoliday'],
  global['hr_dictCompetency'],
  global['hr_dictTaskScore'],
  global['hr_entryOperation'],
  global['hr_payFundDepend'],
  global['hr_repSetParam'],
  global['hr_docRegAvgMonth'],
  global['hr_docRegBountyHelp'],
  global['hr_docRegSupAvgEarn'],
  global['hr_empOrderEasyWork'],
  global['hr_dictCategoryECB'],
  global['hr_payFundMethod'],
  global['hr_vacationScheduleActing'],
  global['hr_staffTable'],
  global['hr_staffTableOrgStructure'],
  global['hr_dictRequiredPara'],
  global['hr_dictRequiredPosition'],
  global['hr_dictLevelUsePc'],
  global['hr_empAssessment'],
  global['hr_dictPosition'],
  global['hr_dictImpartibleVac'],
  global['hr_depClassExp'],
  global['hr_dictExperienceSpec'],
  global['hr_dictLanguageLevel'],
  global['hr_dictProfCompetency'],
  global['hr_dictTrainingForm'],
  global['hr_dictTrainingKind'],
  global['hr_empWorkShdChange'],
  global['hr_dictEmpCategory'],
  global['hr_personCategory'],
  global['hr_empTarifCategory'],
  global['hr_dictMissionPurpose'],
  global['hr_dictAppointKind'],
  global['hr_dictReasonDism'],
  global['hr_dictRateTaxECB'],
  global['hr_payFundTimeCost'],
  global['hr_dictReasonAccrual'],
  global['hr_dictTempExecution'],
  global['trf_dictPupil'],
  global['trf_dictQualification'],
  global['trf_dictSubject'],
  global['trf_tariffSheet'],
  global['hr_dictTypeTaxECB'],
  global['trf_document'],
  global['trf_dictEducationRank'],
  global['trf_dictEducationRankRate'],
  global['hr_dictFssReq'],
  global['hr_dictPositionKind'],
  global['hr_dictPositionGroup'],
  global['hr_specialty'],
  global['hr_dictWorkType'],
  global['hr_dictWorkTypeTariff'],
  global['hr_dictTermContract'],
  global['hr_dictBalanceUnit'],
  global['ac_dictActivityType'],
  global['hr_dictDepCostKind'],
  global['hr_dictCostPlaceType'],
  global['hr_dictCostPlaceNumber'],
  global['trf_workNorm'],
  global['trf_workNormDt'],
  global['trf_dictPart'],
  global['hr_dictSheetSigner'],
  global['hr_dictSigners'],
  global['hr_dictMilitarySpeciality'],
  global['hr_dictNomMilitaryRank'],
  global['hr_empMilitaryContract'],
  global['hr_dictWorkGroup'],
  global['hr_dictWorkOperation'],
  global['hr_dictTech'],
  global['hr_dictTariffingPayEl'],
  global['hr_dictEmpCatTarifPos'],
  global['hr_dictStaffCatAccrual'],
  global['hr_dictPositionPayEl'],
  global['hr_dictNameAddition'],
  global['hr_dictKpiAccrual'],
  global['hr_dictTypeStudy'],
  global['hr_dictTypeOverpay'],
  global['hr_dictTypeStipend'],
  global['hr_dictStudGroup'],
  global['hr_employeeKpi'],
  global['hr_dictMultiGroup'],
  global['hr_empAddGuarantees'],
  global['hr_dictEducLevel'],
  global['hr_studEducationHistory'],
  global['hr_studEducationKind'],
  global['hr_studStipend'],
  global['hr_dictStipendAmount'],
  global['hr_dictIllnessReason'],
  global['hr_dictSickLimit'],
  global['hr_dictSicknessCause'],
  global['hr_dictTypeAsset'],
  global['hr_dictGroupAssets'],
  global['hr_dictCategAssets'],
  global['hr_dictTypeOfEmployment'],
  global['hr_dictTypeOfSourceOfEmployment'],
  global['hr_Assets'],
  global['trans_vehicle'],
  global['hr_employeeContact'],
  global['hr_dictSpecialRank'],
  global['hr_dictReasonTempAvgPay']
]

let orderEntityList = [
  global['hr_empOrderSickness'],
  global['hr_sicknessMeeting'],
  global['hr_docRegVacation'],
  global['hr_docRegVacationUnpaid'],
  global['hr_docRegBusinessTrip'],
  global['hr_docRegVacationCompensation'],
  global['hr_docRegVacationKid'],
  global['hr_empOrderTrainingDet'],
  global['hr_docRegAvgPay'],
  global['hr_docRegAvgLongPay'],
  global['hr_docRegSickness'],
  global['hr_positionInstruction'],
  global['hr_timeSheetChange'],
  global['hr_docRegAvgMonth'],
  global['hr_docRegBountyHelp'],
  global['hr_docRegSupAvgEarn'],
  global['hr_docRegEasyWork'],
  global['hr_empOrderEasyWork'],
  global['hr_empOrderUni'],
  global['hr_docRegFuneral'],
  global['hr_docRegFuneralComp'],
  global['hr_docRegDogCPHPay'],
  global['hr_docRegSinglePay'],
  global['hr_docRegSingleDeduction'],
  global['hr_docRegSeverancePay'],
  global['hr_docRegUnpaidAbsence'],
  global['hr_docRegRenewal'],
  global['hr_docRegBenefit'],
  global['hr_docRegShift']
]

const paymentEntity = [
  global['ac_fundSource'],
  global['hr_dictLivingCost'],
  global['hr_dictIndexSalary'],
  global['hr_dictSalaryMinSize'],
  global['hr_taxRate'],
  global['hr_taxLimit'],
  global['hr_dictTaxIndivid'],
  global['hr_taxLimitBase'],
  global['hr_maxBaseECB'],
  global['hr_dictRateTaxECB'],
  global['hr_payDim'],
  global['hr_dictCategoryECB'],
  global['hr_payEl'],
  global['hr_payElAlimonyLimit'],
  global['hr_payElExperience'],
  global['hr_payElRate'],
  global['hr_payElTaxIndividEntry'],
  global['hr_payPerm'],
  global['hr_fundPerm'],
  global['hr_payFund'],
  global['hr_payFundRate'],
  global['hr_entryOperation'],
  global['hr_entryAcc'],
  global['hr_dictSalaryRank'],
  global['hr_dictTypeTaxECB'],
  global['hr_dictStaffCat'],
  global['hr_dictExperience'],
  global['hr_dictKpiAccrual']
]

compositeDictEntityList.forEach(compositeEntity => {
  if (compositeEntity) {
    compositeEntity.on('insert:before', entityService.setAttrs)
    compositeEntity.on('update:before', entityService.setAttrs)
  }
})

function setDocDefaultParams (ctx) {
  let attrName = ['description', 'caption']
  attrName.forEach(name => {
    const attr = ctx.dataStore.entity.attributes[name]
    if (attr && attr.customSettings) {
      const caption = (attr.customSettings.caption !== undefined) ? UB.i18n(attr.customSettings.caption)
        : ctx.dataStore.entity.caption
      let compositeValue = entityBaseService.getCompositeAttributeValue(ctx, name)
      const execParams = ctx.mParams.execParams
      execParams.description = `${caption ? (UB.i18n(caption) + ' ') : ''}${compositeValue || ''}`
    }
  })
}

orderEntityList.forEach(orderEntity => {
  if (orderEntity) {
    orderEntity.on('insert:before', setDocDefaultParams)
    orderEntity.on('update:before', setDocDefaultParams)
  }
})

paymentEntity.forEach(compositeEntity => {
  if (compositeEntity) {
    compositeEntity.on('insert:after', setCalc)
    compositeEntity.on('update:after', setCalc)
    compositeEntity.on('delete:after', setCalc)
  }
})

function setCalc (ctx) {
  const mParams = ctx.mParams
  const execParams = mParams.execParams
  if (!mParams.isImport && Object.keys(execParams).find(o => !['ID', 'mi_modifyDate', 'mi_modifyUser',
    'code', 'name', 'description', 'caption', 'comment', 'orderNumber', 'orderDate',
    'codeSort', 'genName', 'nominalName', 'printName', 'shortPrintName' ].includes(o))) {
    const entityName = entityBaseService.getEntityName(ctx)
    switch (entityName) {
      case 'hr_payPerm': {
        const res = UB.Repository(entityName).attrs(['payElID.methodID.methodGroupID.groupType']).misc({ __allowSelectSafeDeleted: true }).selectById(execParams.ID)
        if (res['payElID.methodID.methodGroupID.groupType'] !== 'FORPAY') {
          calcService.addCalcQueue({ allOrganization: true, description: UB.i18n(`Змінено дані {0}`, entityName) })
        }
        break
      }
      case 'hr_payEl': {
        const res = UB.Repository(entityName).attrs(['methodID.methodGroupID.groupType']).misc({ __allowSelectSafeDeleted: true }).selectById(execParams.ID)
        if (res['methodID.methodGroupID.groupType'] !== 'FORPAY') {
          calcService.addCalcQueue({ allOrganization: true, description: UB.i18n(`Змінено дані {0}`, entityName) })
        }
        break
      }
      default:
        calcService.addCalcQueue({ allOrganization: true, description: UB.i18n(`Змінено дані {0}`, entityName) })
    }
  }
}

me.dashboard = function (ctx) {}
me.myReportsDashboard = function (ctx) {}

me.openEmpCard = function (ctx) {}

me.notShowSalary = function () {}

me.setDocDefaultParams = function (ctx) {
  setDocDefaultParams(ctx)
}
