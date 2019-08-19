'use strict';

/**
 * Return an object where each key in `updateFns` is mapped to the key itself.
 */
function actionTypes(updateFns) {
  return Object.keys(updateFns).reduce(function(types, key) {
    types[key] = key;
    return types;
  }, {});
}

/**
 * Given objects which map action names to update functions, this returns a
 * reducer function that can be passed to the redux `createStore` function.
 *
 * @param {Object[]} actionToUpdateFn - Objects mapping action names to update
 *                                      functions.
 */
function createReducer(...actionToUpdateFn) {
  // Combine the (action name => update function) maps together into a single
  // (action name => update functions) map.
  //
  // After namespace migration, remove the requirement for actionToUpdateFns
  // to use arrays. Why? createReducer will be called once for each module rather
  // than once for all modules.
  const actionToUpdateFns = {};
  actionToUpdateFn.forEach(map => {
    Object.keys(map).forEach(k => {
      actionToUpdateFns[k] = (actionToUpdateFns[k] || []).concat(map[k]);
    });
  });

  return (state = {}, action) => {
    const fns = actionToUpdateFns[action.type];
    if (!fns) {
      return state;
    }
    // Some states return an array rather than an object. They need to be
    // handled differently so we don't cast them to an object.
    if (Array.isArray(state)) {
      return [...fns[0](state, action)];
    }
    return Object.assign({}, state, ...fns.map(f => f(state, action)));
  };
}

/**
 * Takes a mapping of namespaced modules and the store's `getState()` function
 * and returns an aggregated flat object with all the selectors at the root
 * level. The keys to this object are functions that call the original
 * selectors with the `state` argument set to the current value of `getState()`
 * for namespaced modules or `getState().base` for non-namespaced modules.
 */
function bindSelectors(namespaces, getState) {
  const totalSelectors = {};
  Object.keys(namespaces).forEach(namespace => {
    const selectors = namespaces[namespace].selectors;
    const scopeSelector = namespaces[namespace].scopeSelector;
    Object.keys(selectors).forEach(selector => {
      totalSelectors[selector] = function() {
        const args = [].slice.apply(arguments);
        if (scopeSelector) {
          // Temporary scaffold until all selectors use namespaces.
          args.unshift(getState()[namespace]);
        } else {
          // Namespace modules get root scope
          args.unshift(getState());
        }
        return selectors[selector].apply(null, args);
      };
    });
  });
  return totalSelectors;
}

module.exports = {
  actionTypes,
  bindSelectors,
  createReducer,
};
