import { useContext } from 'react';
import {
  GridContext,
  GridStateContext,
  GridDispatchContext,
  GridActionsContext,
  GridContextValue,
  GridActions,
} from './GridContext';
import { GridUIState, GridAction } from './gridReducer';

/**
 * Access the combined Grid context (state, dispatch, bound actions, store).
 * Throws a descriptive error if accessed outside of a <GridProvider>.
 */
export function useGridContext(): GridContextValue {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error('useGridContext must be used within a <GridProvider>');
  }
  return context;
}

/**
 * Access only the Grid UI state.
 * Subscribes only to changes in GridStateContext.
 */
export function useGridState(): GridUIState {
  const state = useContext(GridStateContext);
  if (!state) {
    throw new Error('useGridState must be used within a <GridProvider>');
  }
  return state;
}

/**
 * Access only the Grid dispatch function.
 * Guaranteed to never cause re-renders when state changes.
 */
export function useGridDispatch(): React.Dispatch<GridAction> {
  const dispatch = useContext(GridDispatchContext);
  if (!dispatch) {
    throw new Error('useGridDispatch must be used within a <GridProvider>');
  }
  return dispatch;
}

/**
 * Access the memoized bound action creators (openCellEditor, setSortRules, showToast, etc.).
 * Does not re-render when UI state changes.
 */
export function useGridActions(): GridActions {
  const actions = useContext(GridActionsContext);
  if (!actions) {
    throw new Error('useGridActions must be used within a <GridProvider>');
  }
  return actions;
}

/**
 * Selective state selector hook to minimize re-renders.
 */
export function useGridSelector<T>(selector: (state: GridUIState) => T): T {
  const state = useGridState();
  return selector(state);
}
