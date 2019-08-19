'use strict';

const util = require('../util');

const fixtures = {
  update: {
    ADD_ANNOTATIONS: function(state, action) {
      if (!state.annotations) {
        return { annotations: action.annotations };
      }
      return { annotations: state.annotations.concat(action.annotations) };
    },
    SELECT_TAB: function(state, action) {
      return { tab: action.tab };
    },
  },
  selectors: {
    namespace1: {
      selectors: {
        countAnnotations1: function(state) {
          return state.namespace1.annotations.length;
        },
      },
    },
    namespace2: {
      scopeSelector: true,
      selectors: {
        countAnnotations2: function(state) {
          // scopeSelector does not need namespaced path
          return state.annotations.length;
        },
      },
    },
  },
};

describe('reducer utils', function() {
  describe('#actionTypes', function() {
    it('returns an object with values equal to keys', function() {
      assert.deepEqual(
        util.actionTypes({
          SOME_ACTION: sinon.stub(),
          ANOTHER_ACTION: sinon.stub(),
        }),
        {
          SOME_ACTION: 'SOME_ACTION',
          ANOTHER_ACTION: 'ANOTHER_ACTION',
        }
      );
    });
  });

  describe('#createReducer', function() {
    it('can not return undefined during initialization', function() {
      // See redux.js:assertReducerShape
      const reducer = util.createReducer(fixtures.update);
      const initialState = reducer(undefined, {
        type: 'fake',
      });
      assert.isOk(initialState);
    });

    it('returns a reducer that combines each update function from the input object', function() {
      const reducer = util.createReducer(fixtures.update);
      const newState = reducer(
        {},
        {
          type: 'ADD_ANNOTATIONS',
          annotations: [{ id: 1 }],
        }
      );
      assert.deepEqual(newState, {
        annotations: [{ id: 1 }],
      });
    });

    it('returns a new object if the action was handled', function() {
      const reducer = util.createReducer(fixtures.update);
      const originalState = { someFlag: false };
      assert.notEqual(
        reducer(originalState, { type: 'SELECT_TAB', tab: 'notes' }),
        originalState
      );
    });

    it('returns the original object if the action was not handled', function() {
      const reducer = util.createReducer(fixtures.update);
      const originalState = { someFlag: false };
      assert.equal(
        reducer(originalState, { type: 'UNKNOWN_ACTION' }),
        originalState
      );
    });

    it('preserves state not modified by the update function', function() {
      const reducer = util.createReducer(fixtures.update);
      const newState = reducer(
        { otherFlag: false },
        {
          type: 'ADD_ANNOTATIONS',
          annotations: [{ id: 1 }],
        }
      );
      assert.deepEqual(newState, {
        otherFlag: false,
        annotations: [{ id: 1 }],
      });
    });

    it('applies update functions from each input object', () => {
      const firstCounterActions = {
        INCREMENT_COUNTER(state) {
          return { firstCounter: state.firstCounter + 1 };
        },
      };
      const secondCounterActions = {
        INCREMENT_COUNTER(state) {
          return { secondCounter: state.secondCounter + 1 };
        },
      };
      const reducer = util.createReducer(
        firstCounterActions,
        secondCounterActions
      );

      const state = { firstCounter: 5, secondCounter: 10 };
      const action = { type: 'INCREMENT_COUNTER' };
      const newState = reducer(state, action);

      assert.deepEqual(newState, { firstCounter: 6, secondCounter: 11 });
    });
  });

  describe('#bindSelectors', function() {
    it('bound functions call original functions with current value of getState()', function() {
      const getState = sinon.stub().returns({
        namespace1: {
          annotations: [{ id: 1 }],
        },
        namespace2: {
          annotations: [{ id: 1 }],
        },
      });
      const bound = util.bindSelectors(fixtures.selectors, getState);
      // test namespaced selector
      assert.equal(bound.countAnnotations1(), 1);
      // test scopeSelector
      assert.equal(bound.countAnnotations2(), 1);
    });
  });
});
