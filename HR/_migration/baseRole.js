const base = {
  desktopsCodes: [],
  shortcutCodes: [],
  elsRule: [
    { description: 'ubm_navshortcut', entityMask: 'ubm_navshortcut', methodMask: ['select'] },
    { description: 'AC', entityMask: 'ac_*', methodMask: ['*'] },
    { description: 'HR', entityMask: 'hr_*', methodMask: ['*'] },
    { description: 'SA', entityMask: 'sa_*', methodMask: ['*'] },
    { description: 'SIA', entityMask: 'sia_*', methodMask: ['select'] },
    { description: 'TIM', entityMask: 'tim_*', methodMask: ['*'] },
    { description: 'ubm_form', entityMask: 'ubm_form*', methodMask: ['select'] },
    { description: 'ubs_message', entityMask: 'ubs_message*', methodMask: ['select'] }
  ]
}

module.export = {
  base
}
