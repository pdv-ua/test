module.exports = [
  {
    name: 'acc_editorTransportHR',
    description: 'Редагування довідника транспортних засобів - кадри',
    description_uk: 'Редагування довідника транспортних засобів - кадри',
    description_ru: 'Редагування довідника транспортних засобів - кадри',
    description_az: 'Редагування довідника транспортних засобів - кадри(aз)',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    desktopsCodes: ['arm_accStaff'],
    shortcutCodes: [
      'dc_trans_vehicle',
      'accHREmp_trans_vehicle'
    ],
    elsRule: [
      {
        description: 'trans_vehicle',
        entityMask: 'trans_vehicle',
        methodMask: [ '*' ]
      },
      {
        description: 'trans_model',
        entityMask: 'trans_model',
        methodMask: [ '*' ]
      }
    ]
  }
]
