import express from "express";
import UpstoxClient from "upstox-js-sdk";
import { getDatabase , ref, child, get , set , onValue , off , push , update } from "firebase/database";
import { initializeApp } from "firebase/app";



// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJXO48--7-6WbO9yaPaArQnWWnmTVN2XU",
  authDomain: "ntrade-engine.firebaseapp.com",
  databaseURL: "https://ntrade-engine-default-rtdb.firebaseio.com",
  projectId: "ntrade-engine",
  storageBucket: "ntrade-engine.firebasestorage.app",
  messagingSenderId: "155448679242",
  appId: "1:155448679242:web:54a54fd5ae2a070b0affb3"
};


// Initialize Firebase
const firebaseapp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseapp);


// Configure API client
const defaultClient = UpstoxClient.ApiClient.instance;
const OAUTH2 = defaultClient.authentications["OAUTH2"];

OAUTH2.accessToken = process.env.UPSTOX_ACCESS_TOKEN;
const streamer = new UpstoxClient.MarketDataStreamerV3();

const app = express();

app.get("/cron", async (req, res) => {
  res.send("ok");

  try {
    console.log("Fetching Upstox + calculating ORB...");
    // 👉 your logic here
  } catch (e) {
    console.error(e);
  }
});

app.listen(process.env.PORT || 3000);



/////////////////////////////
// BUFFER
/////////////////////////////

const buffer = {};
const ltpStore = {};
const tbqStore = {};
const tsqStore = {};

const imbalanceStore = {};



const ltpBuffer = {};
const tbqBuffer = {};
const tsqBuffer = {};

const imbalanceBuffer = {};

/////////////////////////////
// WEBSOCKET EVENTS
/////////////////////////////

//MCX_FO|454818
//NSE_FO|51714
//NSE_INDEX|Nifty 50
// Subscribe to instrument keys upon the 'open' event
streamer.on("open", () => {
  streamer.subscribe(["NSE_FO|51714"], "full");
});

// Handle incoming market data messages
streamer.on("message", (data) => {
  
  const feed = JSON.parse(data.toString("utf8"));

  if (!feed.feeds) return;

  for (const key in feed.feeds) {

    const marketFF = feed.feeds[key]?.fullFeed?.marketFF;

    if (!marketFF) continue;

    const ltp = marketFF?.ltpc?.ltp;
    const tbq = marketFF?.tbq;
    const tsq = marketFF?.tsq;


    // keep only latest price
    ltpStore[key] = ltp;
    tbqStore[key] = tbq;
    tsqStore[key] = tsq;
    imbalanceStore[key] = [(tbq - tsq) / (tbq + tsq)];




    const ts = Math.floor(Date.now() / 1000);

    buffer[`ticks/${key}/${ts}`] = ltp;

  }
});


// Handle errors
streamer.on("error", (err) => {
  console.error("WebSocket Error ❌", err);
});

// Handle close
streamer.on("close", () => {
  console.log("WebSocket Closed");
});


streamer.connect();


/////////////////////////////
// BATCH PUSH TO FIREBASE
/////////////////////////////

setInterval(async () => {

  const updates = { ...buffer};

  for (const symbol in ltpStore) {



    ltpBuffer[`ltp/${symbol}`] = ltpStore[symbol];
    tbqBuffer[`tbq/${symbol}`] = tbqStore[symbol];
    tsqBuffer[`tsq/${symbol}`] = tsqStore[symbol];

    imbalanceBuffer[`imbalance/${symbol}`] = imbalanceStore[symbol];

  }

  if (Object.keys(updates).length === 0) return;

  try {

    //await db.ref().update(updates);
    //await db.ref().update(ltpBuffer);
    await update(ref(database), ltpBuffer);
    await update(ref(database), tbqBuffer);
    await update(ref(database), tsqBuffer);

    await update(ref(database), imbalanceBuffer);
    
    //await update(ref(database), updates);
    console.log("Pushed:", Object.keys(updates).length);

  } catch (err) {

    console.error("Firebase Error:", err);

  }

  // clear buffer
  for (const k in buffer) delete buffer[k];

  // clear buffer
  for (const k in ltpBuffer) delete ltpBuffer[k];
  for (const k in tbqBuffer) delete tbqBuffer[k];
  for (const k in tsqBuffer) delete tsqBuffer[k];
  
  for (const k in imbalanceBuffer) delete imbalanceBuffer[k];

}, 1000);

