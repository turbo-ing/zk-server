"use client";

import * as Comlink from "comlink";
import { Field, SelfProof, Proof, JsonProof, ZkProgram, setNumberOfWorkers} from "o1js";
import { States, Moves, MAX_MOVES } from './zkLib';
import { BoardArray, Direction, GameBoardWithSeed, MAX_MOVES2 } from "./game2048ZKLogic";
import { DirectionMap, MoveType } from "./constants";
import { Game2048ZKProgram } from "./game2048ZKProgram";
setNumberOfWorkers(7);

export const zkWorkerAPI = {

  async compileZKProgram() {
    try{
      console.log("[Worker] About to compile ZK program");
      const result = await Game2048ZKProgram.compile();
      console.log("[Worker] Compiled ZK program");
      return result;
    } catch (e) {
      console.log("[Worker] Failed here.")
      console.trace(e);
      return {verificationKey: {data: "", hash: Field(0)}}
    }
  },

  async baseCase(
    initBoard: GameBoardWithSeed,
    newBoard: GameBoardWithSeed,
    moves: string[],
  ): Promise<string> {
    //Generate the BoardArray for newBoard.
    let boardArr: BoardArray = new BoardArray([initBoard, newBoard]);

    //Generate the Direction from moves[].
    const directionsFields = moves.map((move) => {
      return Field.from(DirectionMap[move as MoveType] ?? 0);
    });

    //Fill out the moves array.
    if (directionsFields.length < MAX_MOVES2) {
      // pad with 0
      for (let i = directionsFields.length; i < MAX_MOVES2; i++) {
        directionsFields.push(Field.from(0));
      }
    }

    const directions = new Direction(directionsFields);

    //Invoke the program function based on the old function.
    const result = await Game2048ZKProgram.baseCase(boardArr, directions);

    //Difference here: we need to push the new proof to the proof queue
    //in zkClient, rather than storing it locally here on the worker.
    console.log("[generateZKProof] Generated proof");

    console.log(result.proof);

    //TODO: sort this out
    return JSON.stringify(result.proof.toJSON());
  },

  async inductiveStep(proofjson1: string, proofjson2: string): Promise<string> {
    const proof1: SelfProof<void, BoardArray> = await ZkProgram.Proof(
      Game2048ZKProgram,
    ).fromJSON(JSON.parse(proofjson1));
    const proof2: SelfProof<void, BoardArray> = await ZkProgram.Proof(
      Game2048ZKProgram,
    ).fromJSON(JSON.parse(proofjson2));

    let result = await Game2048ZKProgram.inductiveStep(proof1, proof2);
    return JSON.stringify(result.proof.toJSON());
  },
}