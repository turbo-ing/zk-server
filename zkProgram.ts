import { SelfProof, Field, Provable, ZkProgram } from "o1js";

import { MAX_MOVES, States, Moves } from './zkLib';

export const zkProgram = ZkProgram({
    name: "zkProgram",
    publicInput: States, // states
    publicOutput: States,
    methods: {
        //Base case: we take two states and a set of moves, then verify that the moves map initial state to final state. We return the initial and final state.
        //Public inputs: State, state
        //Private inputs: moves[]
        base: {
            privateInputs: [Moves],
            async method(
                states : States,
                moves : Moves,
            ) {
                Provable.log("[Program] Inputs:")
                //Provable.log("Moves:"+moves.val);
                Provable.log("[Program] States: "+states.state1.value+", "+states.state2.value);
                let currentState = states.state1;
                const finalState = states.state2;
                for (let i = 0; i < MAX_MOVES; i++) {
                    Provable.log("[Program] Index " + i + ":");
                    Provable.log(moves.value[i]);
                    const nextState = Field(currentState.add(moves.value[i]));
                    currentState = nextState;
                }
                currentState.assertEquals(finalState)
                return {publicOutput: states};
            }
        },
        
        //Inductive step: we take two proofs, and prove that the two proofs are consecutive.
        //Public inputs: State, state
        //Private inputs: Proof, proof
        inductive: {
            privateInputs: [SelfProof<States, States>, SelfProof<States, States>],
            async method(
                states: States,
                proof1: SelfProof<States, States>,
                proof2: SelfProof<States, States>,
            ) {
                Provable.log("[Program] Inputs:")
                Provable.log("[Program] Proof 1 - State 1: "+proof1.publicInput.state1.value+", State 2: "+proof1.publicInput.state2.value)
                Provable.log("[Program] Proof 2 - State 1: "+proof2.publicInput.state1.value+", State 2: "+proof2.publicInput.state2.value)
                //verify proofs
                proof1.verify();
                proof2.verify();
                Provable.log("[Program] Proving state transition"+proof1.publicInput.state1.value+"to"+proof2.publicInput.state2.value)
                //assert that the two proofs share continuity
                Provable.log(proof1.publicInput.state1.add(1))
                Provable.log(proof1.publicInput.state2.add(1))
                Provable.log(proof2.publicInput.state1.add(1))
                Provable.log(proof2.publicInput.state2.add(1))
                proof1.publicInput.state2.add(1).assertEquals(proof2.publicInput.state1.add(1))
                //proof1.publicInput.state2.assertEquals(proof2.publicInput.state1);
                return {publicOutput: states}
            }
        } 
    },
});