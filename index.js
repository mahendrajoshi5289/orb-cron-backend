import express from "express";
import admin from "firebase-admin";

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




/////////////////////////////
// BUFFER
/////////////////////////////

// const buffer = {};
// const ltpStore = {};
// const tbqStore = {};
// const tsqStore = {};

// const imbalanceStore = {};



// const ltpBuffer = {};
// const tbqBuffer = {};
// const tsqBuffer = {};

// const imbalanceBuffer = {};

/////////////////////////////
// WEBSOCKET EVENTS
/////////////////////////////

//MCX_FO|487665
//NSE_FO|51714
//NSE_INDEX|Nifty 50
// Subscribe to instrument keys upon the 'open' event
// streamer.on("open", () => {
//   streamer.subscribe(["MCX_FO|487665"], "full");
// });

// // Handle incoming market data messages
// streamer.on("message", (data) => {
  
//   const feed = JSON.parse(data.toString("utf8"));

//   if (!feed.feeds) return;

//   for (const key in feed.feeds) {

//     const marketFF = feed.feeds[key]?.fullFeed?.marketFF;

//     if (!marketFF) continue;

//     const ltp = marketFF?.ltpc?.ltp;
//     const tbq = marketFF?.tbq;
//     const tsq = marketFF?.tsq;


//     // keep only latest price
//     ltpStore[key] = ltp;
//     tbqStore[key] = tbq;
//     tsqStore[key] = tsq;
//     imbalanceStore[key] = [(tbq - tsq) / (tbq + tsq)];




//     const ts = Math.floor(Date.now() / 1000);

//     buffer[`ticks/${key}/${ts}`] = ltp;

//   }
// });


// // Handle errors
// streamer.on("error", (err) => {
//   console.error("WebSocket Error ❌", err);
// });

// // Handle close
// streamer.on("close", () => {
//   console.log("WebSocket Closed");
// });


// streamer.connect();


// /////////////////////////////
// // BATCH PUSH TO FIREBASE
// /////////////////////////////

// setInterval(async () => {

//   const updates = { ...buffer};

//   for (const symbol in ltpStore) {



//     ltpBuffer[`ltp/${symbol}`] = ltpStore[symbol];
//     tbqBuffer[`tbq/${symbol}`] = tbqStore[symbol];
//     tsqBuffer[`tsq/${symbol}`] = tsqStore[symbol];

//     imbalanceBuffer[`imbalance/${symbol}`] = imbalanceStore[symbol];

//   }

//   if (Object.keys(updates).length === 0) return;

//   try {

//     //await db.ref().update(updates);
//     //await db.ref().update(ltpBuffer);
//     await update(ref(database), ltpBuffer);
//     await update(ref(database), tbqBuffer);
//     await update(ref(database), tsqBuffer);

//     await update(ref(database), imbalanceBuffer);
    
//     //await update(ref(database), updates);
//     console.log("Pushed:", Object.keys(updates).length);

//   } catch (err) {

//     console.error("Firebase Error:", err);

//   }

//   // clear buffer
//   for (const k in buffer) delete buffer[k];

//   // clear buffer
//   for (const k in ltpBuffer) delete ltpBuffer[k];
//   for (const k in tbqBuffer) delete tbqBuffer[k];
//   for (const k in tsqBuffer) delete tsqBuffer[k];
  
//   for (const k in imbalanceBuffer) delete imbalanceBuffer[k];

// }, 1000);


app.use(express.json());

// 🔥 Initialize Firebase Admin using ENV
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  ),
});

// ✅ Health check (optional)
app.get("/", (req, res) => {
  res.send("FCM server running 🚀");
});

// ✅ Send Notification Endpoint
app.post("/send-notification", async (req, res) => {
  const { token, title, body, data } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Missing FCM token" });
  }

  try {
    const message = {
      token,
      notification: {
        title: title || "📢 Alert",
        body: body || "New notification",
      },
      data: data || {}, // optional custom data
    };

    const response = await admin.messaging().send(message);

    res.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error("FCM Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


app.listen(process.env.PORT || 3000);


function getFcm_Tokens()
{

  const dbRef = ref(getDatabase(firebaseapp));
  get(child(dbRef, `users/`)).then((snapshot) => {
    if (snapshot.exists()) {
      
      console.log(snapshot.val());
      const users = snapshot.val();

      // extract all FCM tokens
      const tokens = Object.values(users)
        .map(user => user.fm_token)
        .filter(token => token); // remove null/undefined

      console.log("found all tokens: " , tokens);

      const tokensStrings = [...new Set(tokens.map(t => t.token))];
      console.log(tokensStrings);

      sendNotify(tokensStrings);
      
    } else {
      console.log("No data available");
    }
  }).catch((error) => {
    console.error(error);
  });  
}
getFcm_Tokens();

async function sendNotify(tokensStrings)
{

  await sendNotification("dNtEcVrfXNWjsVnhu5K_e1:APA91bH4B6bT9bLmMe09bJkTErjwff5CtxeCXDm3y4w46xbI4Zx0owymTZuZubdk-RjWPurjecRNcSDb3KuDl2SQJR3G4NdTAUu9zc68_9HtEto-vdvKFN0", data.price);


  // for (const token of tokensStrings) {
  //   await sendNotification(token, price);
//}

}
// 🚀 Function to send notification
async function sendNotification(token, price) {
  console.log(token);
  await admin.messaging().send({
    token,
    notification: {
      title: "🚀 BUY SIGNAL",
      body: `Price crossed 100 → ${price}`,
    },
  });

  console.log("Notification sent ✅");
}

// // 🔁 Run every 2 minutes
// setInterval(async () => {
//   try {
//     // 👉 Replace with real data (API / DB / strategy)
//     const data = {
//       price: Math.random() * 150,
//     };

//     console.log("Checking...", data.price);

//     await sendNotification("f5MpI017oxdBXM2u0hg_My:APA91bEu6vXV4fGUVIsGFgrE_p8V6zyaMzdPMoBrPjO5xnQDvfc4DX1XDPmq3Hno_VuVt1UlKy-J46SHXumnTbijsfUlWNBW6uvf1im3MBnbt4y-3p9FDSA", data.price);
    

//   } catch (err) {
//     console.error("Error:", err);
//   }
// }, 500); // 2 minutes