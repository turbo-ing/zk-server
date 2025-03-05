import * as Comlink from "comlink";

import { SelfProof, VerificationKey, Field, Proof, ZkProgram, JsonProof, setNumberOfWorkers } from "o1js";

import { MAX_MOVES, MAX_PARALLEL, States } from './zkLib';
import { zkProgram } from "./zkProgram";
import { zkWorkerAPI } from "./zkWorker";

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
    async baseCase(initState, newState, moves){
        return await zkWorkerAPI.baseCase(initState, newState, moves);
    }

    async inductiveStep(proof1, proof2){
        return await zkWorkerAPI.inductiveStep(proof1, proof2);
    }

}