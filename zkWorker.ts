"use client";

import * as Comlink from "comlink";
import { Field, SelfProof, Proof, JsonProof, ZkProgram, setNumberOfWorkers} from "o1js";
import { zkProgram } from "./zkProgram";
import { States, Moves, MAX_MOVES } from './zkLib';
setNumberOfWorkers(7);

export const zkWorkerAPI = {

  async compileZKProgram() {
    try{
      console.log("[Worker] About to compile ZK program");
      const result = await zkProgram.compile();
      console.log("[Worker] Compiled ZK program");
      return result;
    } catch (e) {
      console.log("[Worker] Failed here.")
      console.trace(e);
      return {verificationKey: {data: "", hash: Field(0)}}
    }
  },

  async baseCase(
    initState: number,
    newState: number,
    moves: number[],
  ): Promise<string> {
    //Generate the BoardArray for newBoard.
    const states = new States(Field(initState), Field(newState))

    const moveArr = moves.map((move)=> Field(move));

    //Fill out the moves array.
    if (moveArr.length < MAX_MOVES) {
      // pad with 0
      for (let i = moveArr.length; i < MAX_MOVES; i++) {
        moveArr.push(Field.from(0));
      }
    }

    const fieldMoves = new Moves(moveArr);


    const result = await zkProgram.base(states, fieldMoves);

    return JSON.stringify(result.proof.toJSON());
  },

  async inductiveStep(
    proof1: string,
    proof2: string,
  ): Promise<string> {
    //console.log(proof1);
    //console.log(proof2);
    const proof1a = await ZkProgram.Proof(zkProgram).fromJSON(JSON.parse(proof1));
    const proof2a = await ZkProgram.Proof(zkProgram).fromJSON(JSON.parse(proof2));

    const state1 = proof1a.publicInput.state1;
    const state2 = proof2a.publicInput.state2;
    const states = new States(state1, state2);
    console.log("[Worker] Pre-inductive:")
    console.log(states);
    const result = await zkProgram.inductive(states, proof1a, proof2a);
    console.log(result);
    console.log("[Worker] Received result at worker.");

    //Return the result
    return JSON.stringify(result.proof.toJSON());
  },
}