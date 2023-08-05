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
const CorrectColor = '#E3FFA8'
const FocusErrorColor = '#F615AC'
const DefaultColor = 'rgb(255,255,204)'
const ClearColor = 'rgb(255,255,255)'

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
  const [boardTheme, setBoardTheme] = useState<any>(JSON.parse(JSON.stringify(BoardTheme)));
  const [selectedClue, setSelectedClue] = useState<SelectedClueObj | null>(null);
  const [maxReStyleCell, setMaxReStyleCell] = useState<number>(0);
  const [cellElement, setCellElement] = useState<any[]>([]);
  const [selectedCell, setSelectedCell] = useState<number>(-1);
  const [selectedCellBoard, setSelectedCellBoard] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/crossword");
      return res.json();
    };

    setBoardTheme(BoardTheme);

    fetchData().then((data: any) => {
      setData(data);
      setLoading(false);
    });

    return () => {
      setMaxReStyleCell(0);
      for (const el of cellElement) {
        el.removeEventListener("click", cellClickHandler);
      }
    }
  }, []);

  useEffect(() => {
    if (data) {
      crosswordRef.current?.reset();
      setTimeout(() => {
        setCellAttribute();
      }, 200);
    }
  }, [data]);

  useEffect(() => {
    if (maxReStyleCell < MAX_COUNT_REPLY) {
      setTimeout(() => {
        setCellAttribute();
      }, 300);
    }
  }, [maxReStyleCell])

  useEffect(() => {
    //Display clue view when user click cell
    if (selectedCell !== -1) {
      const { across, down } = data;
      let found: boolean = false;
      Object.keys(across).forEach((k) => {
        if (k === selectedCell.toString()) {
          setSelectedClue({ index: parseInt(k), direction: 'across' })
          found = true;
        }
      })

      if (!found) {
        Object.keys(down).forEach((k) => {
          if (k === selectedCell.toString()) {
            setSelectedClue({ index: parseInt(k), direction: 'down' });
          }
        })
      }
      setSelectedCell(-1);
    }
  }, [selectedCell])

  useEffect(() => {
    //Add or Remove click listener for each cell
    if (cellElement.length > 0) {
      for (const el of cellElement) {
        el.removeEventListener("click", cellClickHandler);
        el.addEventListener("click", cellClickHandler);
      }
    }
  }, [cellElement, selectedCellBoard])

  useEffect(() => {
    doValidateCellBoardColor();
  }, [boardTheme])

  useEffect(() => {
    setTimeout(() => {
      //Re-fill cell color for correct or incorrect clue
      if (selectedCellBoard.length > 0) {
        for (const board of selectedCellBoard) {
          const { index, color } = board;
          const element: any = cellElement[index];
          const elChild: any = element.childNodes;

          const childIdx = elChild.length === 3 ? 2 : 1;

          if (elChild[childIdx]?.childNodes.length > 0) {
            const reactNode: any = elChild[0];
            reactNode.attributes['fill'].value = color;
          }
        }

        setCellElement(cellElement);
      }
    }, 50);
  }, [selectedCellBoard])

  //validate correct or incorrect clue
  const doValidateCellBoardColor = () => {
    const selectedBoards = JSON.parse(JSON.stringify(selectedCellBoard));

    for (let i = 0; (i < cellElement.length); i++) {
      const { childNodes } = cellElement[i];
      const activeCellColor = childNodes[0].attributes?.fill?.value;
      const obj = {
        index: i,
        color: activeCellColor
      };

      const foundIdx = selectedBoards.findIndex((x: any) => x.index === i);
      const childIdx = childNodes.length === 3 ? 2 : 1;

      const value = childNodes.length > 2 ? childNodes[1].innerHTML : -1;
      if (activeCellColor === ErrorColor && value !== -1) {
        obj.color = FocusErrorColor;
      } else if (activeCellColor === FocusErrorColor) {
        obj.color = ErrorColor;
      }

      if (foundIdx > 0 && childNodes[childIdx]?.childNodes.lenght === 0) {
        obj.color = ClearColor;
        selectedBoards[foundIdx] = obj;
      } else if (activeCellColor === CorrectColor
        || activeCellColor === ErrorColor
        || activeCellColor === FocusErrorColor) {
        if (foundIdx > 0) {
          selectedBoards[foundIdx] = obj;
        } else {
          selectedBoards.push(obj);
        }
      }
    }

    setSelectedCellBoard(selectedBoards);
  }

  /**
   * Handler when user click cell
   * @param e eventListener
   */
  const cellClickHandler = (e: any) => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: DefaultColor, focusBackground: DefaultColor }))

    if (e.target?.attributes?.selected?.value !== -1) {
      setSelectedCell(e.target?.attributes?.selected?.value);
    } else {
      let isContinue = true;
      //add timeout to makesure the cell already filled
      setTimeout(() => {
        for (let i = 0; (i < cellElement.length && isContinue); i++) {
          const { childNodes } = cellElement[i];
          const activeCellColor = childNodes[0].attributes?.fill?.value;
          if (activeCellColor === DefaultColor && childNodes.length > 1) {
            const clueVal = childNodes[1].attributes?.selected?.value;
            setSelectedCell(clueVal);
            isContinue = false;
          }
        }
      }, 200);
    }
  }

  /**
   * Set 'selected' cell attribute whit clue key [1,2,3,etc]
   * @param childNodes Nodes
   */
  const doSetCellAttribute = (childNodes: any) => {
    const arrNode = [];
    let isContinue = true;
    for (let i = 1; (i < childNodes.length && maxReStyleCell < MAX_COUNT_REPLY); i++) {
      const element: any = childNodes[i];
      const elChild: any = element.childNodes;
      if (elChild.length > 0) {
        const reactNode = elChild[0];
        reactNode.attributes['stroke-width'].value = '0.75';
        element.setAttribute("cell", elChild.length > 2 ? elChild[1].innerHTML : -1);
        const value = {
          value: elChild.length > 2 ? elChild[1].innerHTML : -1
        }
        reactNode.attributes['selected'] = value;
        for (const el of elChild) {
          el.attributes['selected'] = value;
        }

        arrNode.push(element);
      } else {
        isContinue = false;
        setMaxReStyleCell(maxReStyleCell + 1);
      }
    }

    if (isContinue) {
      setCellElement(arrNode);
    }
  }

  /**
   * Get "svg" tag element and adding "selected" in cell attribute
   */
  function setCellAttribute() {
    const svgNode = document.getElementsByTagName("svg");
    const { childNodes } = svgNode[0];
    if (childNodes.length === 0 && maxReStyleCell < MAX_COUNT_REPLY) {
      setMaxReStyleCell(maxReStyleCell + 1);
    } else {
      doSetCellAttribute(childNodes);
    }
  }

  // onCorrect is called with the direction, number, and the correct answer.
  const onCorrectHandler = useCallback(() => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: CorrectColor, focusBackground: CorrectColor }));
  }, [data]);

  // onAnswerIncorrect is called with the direction, number, and the incorrect answer.
  const onAnswerIncorrectHandler = useCallback(() => {
    setBoardTheme((prev: any) => ({ ...prev, highlightBackground: ErrorColor, focusBackground: FocusErrorColor }));
  }, [data])

  const onCellChangeHandler = useCallback((row: number, col: number) => {
    // TO DO
  }, [data])

  /**
   * Display clue view
   * @returns View
   */
  const renderClueView = () => {
    const direction: string = selectedClue?.direction ?? '';
    const index: number = selectedClue?.index ?? 1;

    return (
      <div className='box-border p-2 border-2 mb-3.5 border-blue-500 rounded-lg text-sm'>
        <p className='text-blue-800 font-bold capitalize'>{index} - {direction}</p>
        <p>{data[direction][index].clue}</p>
      </div>
    )
  }

  /**
   * Display or create Crossword Board
   * @returns View
   */
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
