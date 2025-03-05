import * as Comlink from "comlink";

import { SelfProof, VerificationKey, Field, Proof, ZkProgram, JsonProof, setNumberOfWorkers } from "o1js";

import { MAX_MOVES, MAX_PARALLEL, States } from './zkLib';
import { zkProgram } from "./zkProgram";
import { zkWorkerAPI } from "./zkWorker";
import { GameBoard, GameBoardWithSeed } from "./game2048ZKLogic";

export class ZkServer {

    worker: Worker;
    //zkWorker = zkWorkerAPI;
    // Proxy to interact with the worker's methods as if they were local
    remoteApi: Comlink.Remote<typeof import("./zkWorker").zkWorkerAPI>;
    compiling = false;
    compiled = false;

    key: VerificationKey | undefined = undefined

    constructor() {
        // Initialize the worker from the zkWorker
        /*this.worker = new Worker(new URL("./zkWorker.tsx", import.meta.url), {
            type: "module",
        });*/

        // Wrap the worker with Comlink to enable direct method invocation
        //this.remoteApi = Comlink.wrap(this.worker);
    }

    async compileZKProgram() : Promise<VerificationKey | undefined>{
        if (this.compiled) {
        return;
        }
        console.log("[Server] Beginning compile");
        const result = await zkWorkerAPI.compileZKProgram();
        this.compiled = true;
        console.log("[Server] Compiled ZK program");
        return result.verificationKey;
    }
    async baseCaseAux(
        boardNums0: Number[],
        seedNum0: string,
        boardNums1: Number[],
        seedNum1: string,
        moves: string[],
    ): Promise<string> {
        console.log("on worker [aux]");
        console.log(boardNums0);
        console.log(boardNums1);
        const zkBoardWithSeed0 = this.auxSub(boardNums0, BigInt(seedNum0));
        const zkBoardWithSeed1 = this.auxSub(boardNums1, BigInt(seedNum1));

        return await zkWorkerAPI.baseCase(zkBoardWithSeed0, zkBoardWithSeed1, moves);
    }

    auxSub(boardNums: Number[], seedNum: bigint) {
        console.log("on auxsub");
        console.log(boardNums);
        const boardFields = boardNums.map((cell) => Field.from(cell.valueOf()));
        const zkBoard = new GameBoard(boardFields);
        const seed = Field.from(seedNum);
        const zkBoardWithSeed = new GameBoardWithSeed({
            board: zkBoard,
            seed,
        });

        return zkBoardWithSeed;
    }

    async inductiveStep(proof1, proof2){
        return await zkWorkerAPI.inductiveStep(proof1, proof2);
    }

}