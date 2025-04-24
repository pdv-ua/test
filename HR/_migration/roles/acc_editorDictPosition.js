module.exports = [
  {
    name: 'acc_editorDictPosition',
    description: 'Редактор довідника посад',
    description_uk: 'Редактор довідника посад',
    description_ru: 'Редактор справочника должностей',
    description_az: 'İşə istinad redaktoru',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderDictionary',
      'accStaffDictionary',
      'accStaff_dictTarifCoeff',
      'hr_dictTarifCoeff',
      'accStaff_dictTariffGroup',
      'hr_dictTariffGroup',
      'accStaff_dictParentUnitType',
      'hr_dictParentUnitType',
      'accStaff_dictBasicFunctn',
      'hr_dictBasicFunctn',
      'accStaff_dictPosition',
      'hr_dictPosition',
      'accStaff_dictProfession',
      'hr_dictProfession',
      'accStaff_dictLivingCost',
      'hr_dictLivingCost',
      'accStaff_dictDepType',
      'hr_dictDepType',
      'accStaff_dictWagePay',
      'hr_dictWagePay',
      'accStaff_categPayEl',
      'hr_categPayEl',
      'accStaff_dictHarmfulKind',
      'hr_dictHarmfulKind',
      'accStaff_dictEducationLevel',
      'hr_dictEducationLevel',
      'accStaff_dictStatePay',
      'hr_dictStatePay',
      'accStaff_dictCountry',
      'ac_dictCountry',
      'accStaff_dictRegion',
      'ac_dictRegion',
      'accStaff_dictCity',
      'ac_dictCity',
      'accStaff_dictGovernmType',
      'hr_dictGovernmType',
      'accStaff_dictFutureOfWork',
      'hr_dictFutureOfWork',
      'accStaff_departmentKind',
      'hr_departmentKind',
      'accStaff_dictRespEmployee',
      'hr_orgRespPosition',
      'accStaff_dictEmpCategory',
      'hr_dictEmpCategory',
      'accStaff_dictReasonAccrual',
      'hr_dictReasonAccrual',
      'accHREmp_specialty',
      'hr_specialty',
      'accStaff_dictPositionKind',
      'hr_dictPositionKind',
      'accStaff_dictPositionGroup',
      'hr_dictPositionGroup'
    ],
    elsRule:
      [
        {
          description: 'Довідник посад',
          entityMask: 'hr_dictPosition',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Довідник видів посад',
          entityMask: 'hr_dictPositionKind',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        },
        {
          description: 'Довідник груп посад',
          entityMask: 'hr_dictPositionGroup',
          methodMask: ['select', 'addnew', 'insert', 'update', 'delete']
        }
      ]
  }
]
