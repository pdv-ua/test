module.exports = [
  {
    name: 'acc_positionEditor',
    description: 'Можливість редагування посад',
    description_uk: 'Можливість редагування посад',
    description_ru: 'Возможность редактирования должностей',
    description_az: 'Vəzifələri redaktə etmək imkanı',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'accStaffFolderDictionary',
      'accStaffDictionary',
      'accStaff_position',
      'hr_position'
    ],
    elsRule:
      [
        {
          description: 'hr_position',
          entityMask: 'hr_position',
          methodMask: ['accPositionEditAlways', 'updateFunds', 'updateAddDescription', 'calcFunds', 'getPlanSumByPosition']
        }
      ]
  }
]
