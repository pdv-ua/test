const { SET } = require('@unitybase/adminui-vue')
const UB = require('@unitybase/ub-pub')

module.exports = {
  state () {
    return {
      employeeNumberID: null,
      employeeID: null,
      depName: '',
      posName: '',
      birthDate: '',
      age: '',
      posCategoryName: '',
      sexType: '',
      education: '',
      positionType: '',
      psCategory: '',
      avatarData: null,
      avatar: null
    }
  },

  mutations: {
    SET
  },

  actions: {
    async load ({ state, commit, dispatch }) {
      commit('SET', { key: 'avatar', value: null })
      commit('SET', { key: 'sexType', value: null })

      if (state.employeeNumberID) {
        await Promise.all([
          dispatch('loadEmployeeNumber'),
          dispatch('loadEmployeePosition')
        ])
        dispatch('loadAvatar')
      }
    },

    async loadEmployeeNumber ({ state, commit, dispatch }) {
      const employeeNumber = await UB.Repository('hr_employeeNumberS')
        .attrs(
          'employeeID',
          'depName',
          'posName',
          'posCategoryName',
          'employeeID.birthDate',
          'employeeID.sexType',
          'employeeID.dictEducationLevelID.name',
          'employeeID.age',
          'employeeID.photo'
        )
        .selectById(state.employeeNumberID)

      commit('SET', { key: 'employeeID', value: employeeNumber.employeeID })
      commit('SET', { key: 'depName', value: employeeNumber.depName })
      commit('SET', { key: 'posName', value: employeeNumber.posName })
      commit('SET', { key: 'posCategoryName', value: employeeNumber.posCategoryName })
      commit('SET', { key: 'birthDate', value: employeeNumber['employeeID.birthDate'] })
      commit('SET', { key: 'sexType', value: employeeNumber['employeeID.sexType'] })
      commit('SET', { key: 'age', value: employeeNumber['employeeID.age'] })
      commit('SET', { key: 'education', value: employeeNumber['employeeID.dictEducationLevelID.name'] })
      commit('SET', { key: 'avatarData', value: employeeNumber['employeeID.photo'] })
    },

    async loadEmployeePosition ({ state, commit }) {
      const employeePosition = await UB.Repository('hr_employeePositionS')
        .attrs('positionID.positionType.name', 'positionID.psCategory.name')
        .where('employeeNumberID', '=', state.employeeNumberID)
        .where('mi_deleteDate', '>=', '#maxdate')
        .orderBy('dateFrom', 'asc')
        .selectSingle()

      commit('SET', { key: 'positionType', value: employeePosition['positionID.positionType.name'] })
      commit('SET', { key: 'psCategory', value: employeePosition['positionID.psCategory.name'] })
    },

    async loadAvatar ({ state, commit }) {
      const avatarData = state.avatarData
      if (avatarData) {
        const photoAttr = JSON.parse(avatarData)
        const file = await UB.connection.getDocument({
          entity: 'hr_employee',
          attribute: 'photo',
          ID: state.employeeID,
          store: '',
          origName: photoAttr.origName,
          filename: photoAttr.fName
        }, { resultIsBinary: true })
        const blobData = new Blob([file], { type: photoAttr.ct })
        const link = window.URL.createObjectURL(blobData)
        commit('SET', { key: 'avatar', value: link })
      } else {
        commit('SET', { key: 'avatar', value: null })
      }
    }
  },

  plugins: [watchEmployee]
}

function watchEmployee (store) {
  store.watch(
    (state) => state.employeeNumberID,
    () => store.dispatch('load')
  )
}
