module.exports = [
  {
    name: 'acc_positionJoinFundSource',
    description: 'Можливість об\'єднання джерел фінансування посад',
    description_uk: 'Можливість об\'єднання джерел фінансування посад',
    description_ru: 'Возможность объединения источников финансирования должностей',
    description_az: 'Vəzifələr üçün maliyyə mənbələrinin birləşdirilməsi imkanı',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    elsRule:
      [
        {
          description: 'hr_position',
          entityMask: 'hr_position',
          methodMask: ['joinPositionFundSource']
        }
      ]
  }
]
