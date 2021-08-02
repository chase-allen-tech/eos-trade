// import {default as cron} from 'node-cron';
const { JsonRpc } = require('eosjs');
const fetch = require('node-fetch');
const cron = require('node-cron');
const mysqlPromise = require('mysql2/promise');
const config = require('./config');
const { PRIVATE_KEY, URL_ENDPOINT } = require('./setting');

// const signatureProvider = new JsSignatureProvider([PRIVATE_KEY]);
const rpc = new JsonRpc(URL_ENDPOINT, { fetch }); //required to read blockchain state

require('array-foreach-async');
const pool = mysqlPromise.createPool({
    host: config.db.host,
    user: config.db.user,
    port: config.db.port,
    password: config.db.password,
    database: config.db.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

let isRunning = false;

cron.schedule("* * * * *", async () => {
    console.log('[cron entered]');
    if(!isRunning) {
        isRunning = true;
        try {
            let [rows, fields] = await pool.query("SELECT txid, blockid FROM eosTransactions WHERE `status` = ?", ['executed']);
            for(let i = 0; i < rows.length; i ++) {
                try {
                    let tx = await rpc.history_get_transaction(rows[i].txid, rows[i].blockid);
                    if(tx.trx.receipt.status != 'executed') {
                        await pool.query('UPDATE eosTransactions SET `status` = "executed", `result` = ? WHERE `txid` = ?', [tx.trx.receipt.status, rows[i].txid])
                    }
                } catch(err) { 
                    await pool.query('UPDATE eosTransactions SET `status` = "ERROR", `result` = ? WHERE `txid` = ?', ["ERROR", rows[i].txid])
                }
            }
            isRunning = false;
        } catch (err) {
            console.log(err);
            isRunning = false;
        }
    }
})