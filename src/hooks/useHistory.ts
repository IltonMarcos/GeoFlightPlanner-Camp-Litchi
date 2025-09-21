
"use client"
import { useState, useCallback } from 'react';

export const useHistory = <T>(initialState: T) => {
  const [history, setHistory] = useState([initialState]);
  const [index, setIndex] = useState(0);

  const setState = useCallback((action: T | ((prevState: T) => T), overwrite = false) => {
    const currentState = history[index];
    const newState = typeof action === 'function'
      ? (action as (prevState: T) => T)(currentState)
      : action;

    if (!overwrite && JSON.stringify(currentState) === JSON.stringify(newState)) {
        return;
    }
    
    if (overwrite) {
        const newHistory = [...history];
        newHistory[index] = newState;
        setHistory(newHistory);
    } else {
        const newHistory = history.slice(0, index + 1);
        newHistory.push(newState);
        setHistory(newHistory);
        setIndex(newHistory.length - 1);
    }
  }, [index, history]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(prevIndex => prevIndex - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(prevIndex => prevIndex + 1);
    }
  }, [index, history.length]);

  const resetHistory = useCallback((newState: T) => {
    setHistory([newState]);
    setIndex(0);
  }, []);
  
  return {
    state: history[index],
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    resetHistory,
  } as const;
};
