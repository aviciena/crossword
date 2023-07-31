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
  cellBorder: '#2E3192',
  numberColor: '#221F80',
  focusBackground: DefaultColor,
  highlightBackground: DefaultColor
}
interface SelectedClueObj {
  index: number;
  direction: string;
}

const MAX_COUNT_REPLY = 5;

export default function CrosswordBoard() {
  // all the same functionality, but for the decomposed CrosswordProvider
  const crosswordRef = useRef<CrosswordProviderImperative>(null);

  const [data, setData] = useState<any>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [boardTheme, setBoardTheme] = useState<any>(JSON.parse(JSON.stringify(BoardTheme)))
  const [selectedClue, setSelectedClue] = useState<SelectedClueObj | null>(null)
  const [maxReStyleCell, setMaxReStyleCell] = useState<number>(0)
  const [cellElement, setCellElement] = useState<any[]>([])
  const [selectedCell, setSelectedCell] = useState<number>(-1)

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
      setMaxReStyleCell(0);
      for (let j = 0; j < cellElement.length; j++) {
        const element = cellElement[j];
        element.removeEventListener("click", cellClickHandler);
      }
    }
  }, []);

  useEffect(() => {
    if (data) {
      crosswordRef.current?.reset();
      setTimeout(() => {
        reStyleBoardCell();
      }, 200);
    }
  }, [data]);

  useEffect(() => {
    if (maxReStyleCell < 3) {
      setTimeout(() => {
        reStyleBoardCell();
      }, 300);
    }
  }, [maxReStyleCell])

  useEffect(() => {
    if (selectedCell !== -1) {
      const { across, down } = data
      let found: boolean = false
      Object.keys(across).forEach((k) => {
        if (k === selectedCell.toString()) {
          setSelectedClue({ index: parseInt(k), direction: 'across' })
          found = true
        }
      })

      if (!found) {
        Object.keys(down).forEach((k) => {
          if (k === selectedCell.toString()) {
            setSelectedClue({ index: parseInt(k), direction: 'down' })
          }
        })
      }
      setSelectedCell(-1);
    } else {
      setSelectedClue(null)
    }
  }, [selectedCell])

  const cellClickHandler = (e: any) => {
    if (selectedCell === -1) {
      setSelectedCell(e.target?.attributes?.selected?.value);
    }
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: DefaultColor, focusBackground: DefaultColor }))
  }

  const reStyleBoardCell = () => {
    const svgNode = document.getElementsByTagName("svg");
    const { childNodes } = svgNode[0];
    if (childNodes.length === 0 && maxReStyleCell < MAX_COUNT_REPLY) {
      setMaxReStyleCell(maxReStyleCell + 1);
    } else {
      const arrNode = [];
      let isContinue = true;
      for (let i = 1; (i < childNodes.length && maxReStyleCell < MAX_COUNT_REPLY); i++) {
        const element = childNodes[i];
        const elChild: any = element.childNodes;
        if (elChild.length > 0) {
          const reactNode = elChild[0];
          reactNode.attributes['stroke-width'].value = '0.75';
          reactNode.attributes['selected'] = {
            value: elChild.length > 2 ? elChild[1].innerHTML : -1
          }
          arrNode.push(reactNode)
        } else {
          isContinue = false;
          setMaxReStyleCell(maxReStyleCell + 1);
        }
      }

      if (isContinue) {
        for (let j = 0; j < arrNode.length; j++) {
          const element = arrNode[j];
          element.addEventListener("click", cellClickHandler);
        }
        setCellElement(arrNode);
      }
    }
  }

  // onCorrect is called with the direction, number, and the correct answer.
  const onCorrectHandler = useCallback(() => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: DefaultColor, focusBackground: DefaultColor }))
  }, [data]);

  // onAnswerIncorrect is called with the direction, number, and the incorrect answer.
  const onAnswerIncorrectHandler = useCallback(() => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: ErrorColor, focusBackground: FocusErrorColor }))
  }, [data])

  const onCellChangeHandler = useCallback((row: number, col: number) => {
    // TO DO
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