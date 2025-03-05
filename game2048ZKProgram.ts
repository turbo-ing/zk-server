import { Provable, ZkProgram, SelfProof, provable } from "o1js";

import {
  addRandomTile,
  addRandomTile2,
  applyOneMoveCircuit,
  applyOneMoveCircuit2,
  BoardArray,
  Direction,
  GameBoardWithSeed,
  MAX_MOVES2,
  MAX_PARALLEL,
  ProofArray,
} from "./game2048ZKLogic";

export const Game2048ZKProgram = ZkProgram({
  name: "Game2048ZKProgram",
  publicOutput: BoardArray,

  methods: {
    baseCase: {
      privateInputs: [BoardArray, Direction],

      async method(boards: BoardArray, directions: Direction) {
        let initBoard = boards.value[0];
        let newBoard = boards.value[1];

        let currentBoard = initBoard.getBoard();
        let currentSeed = initBoard.getSeed();

        for (let i = 0; i < MAX_MOVES2; i++) {
          let nextBoard = applyOneMoveCircuit2(
            currentBoard,
            directions.value[i],
          );

          let needAddTile = nextBoard.hash().equals(currentBoard.hash()).not();

          currentBoard = nextBoard;
          [currentBoard, currentSeed] = addRandomTile2(
            currentBoard,
            currentSeed,
            needAddTile,
          );
        }
        Provable.log(currentBoard);
        Provable.log(newBoard);
        for (let j = 0; j < 16; j++) {
          currentBoard.cells[j].assertEquals(newBoard.board.cells[j]);
        }
        newBoard.seed.assertEquals(currentSeed);
        return { publicOutput: boards };
      },
    },

    /**
     * Inductive Step: Recursively verifies groups of proofs by comparing their
     * initial and terminal states to verify that there is a continuous transition
     * between them (eg A->E, E->I. We compare E, E and return proof that A->I).
     */
    inductiveStep: {
      privateInputs: [SelfProof, SelfProof],

      async method(
        proof1: SelfProof<void, BoardArray>,
        proof2: SelfProof<void, BoardArray>,
      ) {
        Provable.log(proof1);
        Provable.log(proof2);
        //verify both earlier proofs
        proof1.verify();
        proof2.verify();

        Provable.log("Verified both proofs.");

        const proof1board1 = proof1.publicOutput.value[0];
        const proof1board2 = proof1.publicOutput.value[1];
        const proof2board1 = proof2.publicOutput.value[0];
        const proof2board2 = proof2.publicOutput.value[1];

        //compare seeds
        proof1board2.seed.assertEquals(proof2board1.seed);
        Provable.log("Verified both seeds.");

        //compare cells
        for (let c = 0; c < 16; c++) {
          proof1board2.board.cells[c].assertEquals(proof2board1.board.cells[c]);
        }
        Provable.log("Verified all cells.");

        //construct new BoardArray capturing the fact that we now have a proof for A->C from A->B, B->C
        const boardArr = [proof1board1, proof2board2];
        const retArray = new BoardArray(boardArr);
        Provable.log(boardArr);

        Provable.log("Created return array.");
        Provable.log(retArray);

        return { publicOutput: retArray };
      },
    },
  },
});
