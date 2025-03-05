const express = require('express');
const cors = require('cors');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

import { ZkServer } from './zkServer';
import { zkWorkerAPI } from './zkWorker';

const app = express();
const PORT = process.env.PORT || process.argv.slice(2)[0] || 3002;

// Middleware
app.use(cors());
app.use(express.json());

const zkServer = new ZkServer();
zkServer.compileZKProgram();

async function run(str: string) {
  const { stdout, stderr } = await exec('./game2048_plonky2');
  console.log('['+str+'] stdout:', stdout);
  console.log('['+str+'] stderr:', stderr);
}

app.get('/', async (req, res) => {
  try {
    let r : Promise<void>[] = [];
    for(let i=0; i<1000; i++){
      r.push(run(i.toString()));
    };
    await Promise.all(r);
    res.status(200).json({ message: 'Binary executed successfully' });
  } catch (error) {
    console.error('[API] Error executing binary:', error);
    res.status(500).json({ error: 'Failed to execute binary' });
  }
});

// Endpoint to generate proofs
app.post('/baseCase', async (req, res) => {
  try {
    const initState : number = req.body.initState
    const newState : number = req.body.newState
    const moves = req.body.moves;
    console.log(req.body);
    
    // Return the proof and new state
    const proof = await zkWorkerAPI.baseCase(initState, newState, moves);
    console.log("[API][baseCase] Proof generated");
    res.status(200).json({ proofJSON: proof });
  } catch (error) {
    console.error('[API] Error generating proof:', error);
    res.status(500).json({ error: 'Failed to generate proof' });
  }
});

app.post('/inductiveStep', async (req, res) => {
  try {
    const proof1 = req.body.proof1;
    const proof2 = req.body.proof2;
    //console.log("Req: ",req.body);

    // Return the proof and new state
    const proof = await zkServer.inductiveStep(proof1, proof2);
    console.log("[API][inductiveStep] Proof generated");
    res.status(200).json({ proofJSON: proof });
  } catch (error) {
    console.error('[API] Error generating proof:', error);
    res.status(500).json({ error: 'Failed to generate proof' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`[API] ZK Proof server running on port ${PORT}`);
}); 