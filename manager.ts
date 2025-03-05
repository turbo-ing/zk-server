const express = require('express');
const cors = require('cors');

const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

interface mapping {
    [key: number] : boolean
}
const map : mapping = {};
const subservers : {[key: number]: any} = {}; // Store references to spawned processes


spawnSubservers();

async function run(i: string) {
    console.log("Starting subserver on port "+i);
    const subserver = spawn('npx', ['tsx', 'server.ts', i], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Store the process reference
    const port = parseInt(i);
    subservers[port] = subserver;
    
    // Handle stdout
    subserver.stdout.on('data', (data: Buffer) => {
        console.log(`[Subserver ${i}] ${data.toString().trim()}`);
    });
    
    // Handle stderr
    subserver.stderr.on('data', (data: Buffer) => {
        console.error(`[Subserver ${i} Error] ${data.toString().trim()}`);
    });
    
    // Handle process exit
    subserver.on('close', (code: number) => {
        console.log(`Subserver on port ${i} exited with code ${code}`);
        map[port] = false;
        delete subservers[port];
    });
    
    // Return a promise that resolves when the server is ready
    return new Promise<void>((resolve) => {
        // You might want to wait for a specific output indicating the server is ready
        // For now, we'll just resolve immediately
        map[port] = false; // Mark as available
        resolve();
    });
}

//TODO add request queue so that we don't just break on too many requests
async function spawnSubservers(){
    try {
        let r : Promise<void>[] = [];
        for(let i=3001; i<=3010; i++){ //spawn 10 servers
            r.push(run(i.toString()));
            map[i] = false;
        }
        await Promise.all(r);
        //res.status(200).json({ message: 'Subserver executed successfully' });
      } catch (error) {
        console.error('[API] Error executing Subserver:', error);
        //res.status(500).json({ error: 'Failed to execute Subserver' });
      }
}
/*app.get('/', async (req, res) => {
  await spawnSubservers();
});*/

// Endpoint to generate proofs
app.post('/baseCase', async (req, res) => {
  try {
    const initState : number = req.body.initState
    const newState : number = req.body.newState
    const moves = req.body.moves;
    console.log(req.body);
    console.log(initState, newState, moves);

    //get free child process port
    let port;
    let freeProcess = false;
    while(!freeProcess){
        console.log("[Manager] Attempting to allocate process for delegation");
        for(let i=3001; i<=3100; i++){
            if(map[i] === false) {
                map[i] = true;
                port = i;
                console.log("[Manager] Delegating to child process on port "+port);
                freeProcess = true;
                break;
            }
        }
    }

    console.log("freeProcess: "+freeProcess);

    fetch("http://localhost:"+port+"/baseCase", {
    
        // Adding method type
        method: "POST",
        
        // Adding body or contents to send
        body: JSON.stringify({
            initState: initState,
            newState: newState,
            moves: moves,
        }),
        
        // Adding headers to the request
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",    
            "Content-Type": "application/json; charset=UTF-8"
        }
        }).then((response) => response.json()).then(async (json) => {
            console.log(json.proofJSON);
            console.log("[Manager][baseCase] Proof generated");
            map[port] = false;
            res.status(200).json({ proofJSON: json.proofJSON });
        });
  } catch (error) {
    console.error('[Manager][baseCase] Error generating proof:', error);
    res.status(500).json({ error: 'Failed to generate proof' });
  }
});

app.post('/inductiveStep', async (req, res) => {
  try {
    const proof1 = req.body.proof1;
    const proof2 = req.body.proof2;
    //console.log("[Manager] Req: ", req.body);
    //console.log("[Manager] Proof1: ", proof1);
    //console.log("[Manager] Proof2: ", proof2);

    //get free child process port
    let port;
    let freeProcess = false;
    while(!freeProcess){
        console.log("[Manager] Attempting to allocate process for delegation");
        for(let i=3001; i<=3100; i++){
            if(map[i] === false) {
                map[i] = true;
                port = i;
                console.log("[Manager] Delegating to child process on port "+port);
                freeProcess = true;
                break;
            }
        }
    }

    fetch("http://localhost:"+port+"/inductiveStep", {
    
        // Adding method type
        method: "POST",
        
        // Adding body or contents to send
        body: JSON.stringify({
            proof1: proof1,
            proof2: proof2,
        }),
        
        // Adding headers to the request
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",    
            "Content-Type": "application/json; charset=UTF-8"
        }
    }).then((response) => response.json()).then(async (json) => {
        console.log(json.proofJSON);
        console.log("[API][inductiveStep] Proof generated");
        map[port] = false;
        res.status(200).json({ proofJSON: json.proofJSON });
    });
  } catch (error) {
    console.error('[API] Error generating proof:', error);
    res.status(500).json({ error: 'Failed to generate proof' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Add a cleanup function for when the manager is shutting down
process.on('SIGINT', () => {
  console.log('Shutting down all subservers...');
  Object.values(subservers).forEach((process: any) => {
    process.kill();
  });
  process.exit(0);
});

// Start the server
app.listen(PORT, () => {
  console.log(`[API] ZK Manager running on port ${PORT}`);
}); 