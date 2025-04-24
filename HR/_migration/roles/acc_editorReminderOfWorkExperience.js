module.exports = [
  {
    name: 'acc_editorReminderOfWorkExperience',
    description: 'Редагування щомісячного нагадування про стажі',
    description_uk: 'Редагування щомісячного нагадування про стажі',
    description_ru: 'Редактирование ежемесячного напоминания о стаже',
    description_az: 'Редагування щомісячного нагадування про стажі',
    sessionTimeout: 30,
    allowedAppMethods: 'changePassword,checkDocument,getDocument,getDomainInfo,logout,rest,setDocument,ubql',
    elsRule: [
      {
        description: 'hr_reminder',
        entityMask: 'hr_reminder',
        methodMask: ['getReminderOfWorkExperienceData']
      }
    ]
  }
]
