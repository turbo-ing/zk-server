import { Struct, Field, Provable, Proof, SelfProof} from 'o1js';
export const MAX_MOVES = 5;
export const MAX_PARALLEL = 1;

export class States extends Struct({
    state1: Field,
    state2: Field,
}) {
    constructor(state1: Field, state2: Field) {
        super({ state1, state2 });
    }
}

export class Moves extends Struct({
    value: Provable.Array(Field, MAX_MOVES),
}) {
    constructor(value: Field[]) {
        super({ value });
    }
}