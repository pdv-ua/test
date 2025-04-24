module.exports.run = (conn) => {
  const reportColum = [{
    code: 'trf_salary_1',
    newFullName: 'За звання [5]',
    newShortName: 'За звання [5]'
  },
  {
    code: 'trf_salary_2',
    newFullName: 'Підвищення за тип закладу [6]',
    newShortName: 'Підвищення за тип закладу [6]'
  },
  {
    code: 'trf_salary_3',
    newFullName: 'Інші підвищення [7]',
    newShortName: 'Інші підвищення [7]'
  },
  {
    code: 'trf_salary_4',
    newFullName: 'Класне керівництво [8]',
    newShortName: 'Класне керівництво [8]'
  },
  {
    code: 'trf_salary_5',
    newFullName: 'Перевірка зошитів [9]',
    newShortName: 'Перевірка зошитів [9]'
  },
  {
    code: 'trf_salary_6',
    newFullName: 'Завідування кабінетами, майстернями, бібліотеками [10]',
    newShortName: 'Завідування кабінетами [10]'
  },
  {
    code: 'trf_salary_7',
    newFullName: 'Керівники гуртків, інші доплати (пост. КМУ № 643) [11]',
    newShortName: 'Керівники гуртків, інші доплати [11]'
  },
  {
    code: 'trf_salary_8',
    newFullName: 'Керівництво предметними та методичними комісіями (пост. КМУ № 1096) [12]',
    newShortName: 'Керівництво комісіями [12]'
  },
  {
    code: 'trf_salary_9',
    newFullName: 'За шкідливість, ЕОМ [13]',
    newShortName: 'За шкідливість, ЕОМ [13]'
  },
  {
    code: 'trf_salary_10',
    newFullName: 'Вислуга років педпрацівникам [15]',
    newShortName: 'Вислуга років педпрацівникам [15]'
  },
  {
    code: 'trf_salary_11',
    newFullName: 'Грошова винагорода [16]',
    newShortName: 'Грошова винагорода [16]'
  },
  {
    code: 'trf_salary_12',
    newFullName: 'Матеріальна допомога на оздоровлення [17]',
    newShortName: 'Матеріальна допомога на оздоровлення [17]'
  },
  {
    code: 'trf_salary_13',
    newFullName: 'Вислуга років медичним працівникам [18]',
    newShortName: 'Вислуга років медичним працівникам [18]'
  },
  {
    code: 'trf_salary_14',
    newFullName: 'Надбавка 50% (Бібліотекарям) [19]',
    newShortName: 'Надбавка 50% (Бібліотекарям) [19]'
  },
  {
    code: 'trf_salary_15',
    newFullName: 'Доплата за вислугу (Бібліотекарям) [20]',
    newShortName: 'Доплата за вислугу (Бібліотекарям) [20]'
  },
  {
    code: 'trf_salary_16',
    newFullName: 'Матеріальна допомога бібліотекарям [21]',
    newShortName: 'Матеріальна допомога бібліотекарям [21]'
  },
  {
    code: 'trf_salary_17',
    newFullName: 'Допомога бібліотекарям на оздоровлення [22]',
    newShortName: 'Допомога бібліотекарям на оздоровлення [22]'
  },
  {
    code: 'trf_salary_18',
    newFullName: 'Надбавка пед-пр. 20% [23]',
    newShortName: 'Надбавка пед-пр. 20% [23]'
  },
  {
    code: 'trf_salary_19',
    newFullName: 'Матеріальна допомога в тому числі на поховання [24]',
    newShortName: 'Матеріальна допомога в тому числі на поховання [24]'
  },
  {
    code: 'trf_salary_20',
    newFullName: 'Стимулюючі надбавки в тому числі молодим спеціалістам [25]',
    newShortName: 'Стимулюючі надбавки [25]'
  },
  {
    code: 'trf_salary_21',
    newFullName: 'Надбавка бухгалтерам 50% [26]',
    newShortName: 'Надбавка бухгалтерам 50% [26]'
  },
  {
    code: 'trf_salary_22',
    newFullName: 'Премія [27]',
    newShortName: 'Премія [27]'
  },
  {
    code: 'trf_salary_23',
    newFullName: 'За суміщення посад [28.1]',
    newShortName: 'За суміщення посад [28.1]'
  },
  {
    code: 'trf_salary_24',
    newFullName: 'За вчене звання [28.2]',
    newShortName: 'За вчене звання [28.2]'
  },
  {
    code: 'trf_salary_25',
    newFullName: 'За наукову ступінь [28.3]',
    newShortName: 'За наукову ступінь [28.3]'
  },
  {
    code: 'trf_salary_26',
    newFullName: 'За перевищення наповнюваності груп [28.4]',
    newShortName: 'За перевищення наповнюваності груп [28.4]'
  },
  {
    code: 'trf_salary_27',
    newFullName: 'За почесні звання України [29.1]',
    newShortName: 'За почесні звання України [29.1]'
  },
  {
    code: 'trf_salary_28',
    newFullName: 'За використання в роботі іноземної мови [29.2]',
    newShortName: 'За використання в роботі іноземної мови [29.2]'
  },
  {
    code: 'trf_salary_29',
    newFullName: 'За спортивні звання [29.3]',
    newShortName: 'За спортивні звання [29.3]'
  },
  {
    code: 'trf_salary_30',
    newFullName: 'За класність водіям [29.4]',
    newShortName: 'За класність водіям [29.4]'
  },
  {
    code: 'trf_salary_31',
    newFullName: 'Індексація [30]',
    newShortName: 'Індексація [30]'
  },
  {
    code: 'trf_salary_32',
    newFullName: 'Компенсація за невикористану відпустку [31]',
    newShortName: 'Компенсація за невикористану відпустку [31]'
  },
  {
    code: 'trf_salary_33',
    newFullName: 'Заміни [32]',
    newShortName: 'Заміни [32]'
  },
  {
    code: 'trf_salary_34',
    newFullName: 'Лікарняні за рахунок установи [33]',
    newShortName: 'Лікарняні за рахунок установи [33]'
  },
  {
    code: 'trf_salary_35',
    newFullName: 'Нічні, святкові [34]',
    newShortName: 'Нічні, святкові [34]'
  },
  {
    code: 'trf_salary_36',
    newFullName: 'Доплата до мінімальної зарплати [35]',
    newShortName: 'Доплата до мінімальної зарплати [35]'
  },
  {
    code: 'trf_salary_37',
    newFullName: 'Із загальної суми відпускні [44]',
    newShortName: 'Із загальної суми відпускні [44]'
  }]
  conn.Repository('hr_listParam')
    .attrs(['*'])
    .where('code', 'in', reportColum.map(o => o.code))
    .selectAsObject()
    .forEach(row => {
      try {
        const newProp = reportColum.find(o => o.code === row.code)
        if (newProp) {
          conn.update({
            entity: 'hr_listParam',
            __skipOptimisticLock: true,
            execParams: {
              ID: row.ID,
              fullName: newProp.newFullName,
              shortName: newProp.newShortName
            }
          })
        }
      } catch (error) {}
    })
}
