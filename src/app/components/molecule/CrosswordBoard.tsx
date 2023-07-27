"use client"

import {
  CrosswordGrid,
  CrosswordProvider,
  CrosswordProviderImperative,
  DirectionClues,
} from '@jaredreisinger/react-crossword';

import React, { useState, useEffect, useRef, useCallback } from "react";
import Loading from '../atom/Loading';
import ErrorView from '../atom/ErrorView';

const IS_HIDE_CLUES = true
const ErrorColor = '#E4D7FF'
const DefaultColor = '#E3FFA8'
const FocusErrorColor = '#F615AC'

const BoardTheme = {
  allowNonSquare: true,
  gridBackground: '#E3E4F4',
  cellBorder: '#221F80',
  numberColor: '#221F80',
  focusBackground: DefaultColor,
  highlightBackground: DefaultColor
}
interface SelectedClueObj {
  index: number;
  direction: string;
}

export default function CrosswordBoard() {
  // all the same functionality, but for the decomposed CrosswordProvider
  const crosswordRef = useRef<CrosswordProviderImperative>(null);

  const [data, setData] = useState<any>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [boardTheme, setBoardTheme] = useState<any>(JSON.parse(JSON.stringify(BoardTheme)))
  const [selectedClue, setSelectedClue] = useState<SelectedClueObj | null>(null)
  const [inputEl, setInputEl] = useState<Element | null>(null)

  const inputFocusHandler = () => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: DefaultColor, focusBackground: DefaultColor }))
  }

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/crossword");
      return res.json();
    };

    setBoardTheme(BoardTheme)

    fetchData().then((data: any) => {
      setData(data);
      setLoading(false);
    });

    return () => {
      inputEl?.removeEventListener('focus', inputFocusHandler)
    }
  }, []);

  useEffect(() => {
    if (data) {
      setInputEl(document.querySelector('input[type="text"]'))
      crosswordRef.current?.reset();
    }
  }, [data])

  useEffect(() => {
    inputEl?.addEventListener('focus', inputFocusHandler)
  }, [inputEl])

  // onCorrect is called with the direction, number, and the correct answer.
  const onCorrectHandler = useCallback(() => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: DefaultColor, focusBackground: DefaultColor }))
  }, [data]);

  // onAnswerIncorrect is called with the direction, number, and the incorrect answer.
  const onAnswerIncorrectHandler = useCallback(() => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: ErrorColor, focusBackground: FocusErrorColor }))
  }, [data])

  const onCellChangeHandler = useCallback((row: number, col: number) => {
    const { across, down } = data
    let found: boolean = false
    Object.keys(across).forEach((k) => {
      if (across[k].row === row && across[k].col === col) {
        setSelectedClue({ index: parseInt(k), direction: 'across' })
        found = true
      }
    })

    if (!found) {
      Object.keys(down).forEach((k) => {
        if (down[k].row === row && down[k].col === col) {
          setSelectedClue({ index: parseInt(k), direction: 'down' })
        }
      })
    }
  }, [data])

  const renderClueView = () => {
    const direction: string = selectedClue?.direction ?? ''
    const index: number = selectedClue?.index ?? 1

    return (
      <div className='box-border p-2 border-2 mb-3.5 border-blue-500 rounded-lg text-sm'>
        <p className='text-blue-800 font-bold capitalize'>{index} - {direction}</p>
        <p>{data[direction][index].clue}</p>
      </div>
    )
  }

  const renderCrosswordBoard = () => (
    <div className='w-2/5'>
      {selectedClue && renderClueView()}
      <div className='flex'>
        <CrosswordProvider
          ref={crosswordRef}
          data={data}
          storageKey="crossword-test"
          onCorrect={onCorrectHandler}
          onAnswerIncorrect={onAnswerIncorrectHandler}
          onCellChange={onCellChangeHandler}
          theme={boardTheme}
        >
          {!IS_HIDE_CLUES && <DirectionClues direction="across" />}
          <CrosswordGrid />
          {!IS_HIDE_CLUES && <DirectionClues direction="down" />}
        </CrosswordProvider>
      </div>
    </div>
  );

  return (
    <div className='contents'>
      {isLoading && <Loading />}
      {!data && !isLoading && <ErrorView />}
      {data && renderCrosswordBoard()}
    </div>
  );
}