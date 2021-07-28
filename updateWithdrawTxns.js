import {default as cron} from 'node-cron';
import mysqlPromise from 'mysql2/promise';

import config from './config';


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
    if(!isRunning) {
        isRunning = true;
        try {
            let [rows, fields] = await pool.query("SELECT txId, blockId FROM eosTransactions WHERE `status` = ?", ['pending']);
            for(let i = 0; i < rows.length; i ++) {
                try {
                    let tx = await rpc.history_get_transaction(rows[i].txId, rows[i].blockId);
                    if(tx) {
                        await pool.query('UPDATE eosTransactions SET status = "Completed", result = ? WHERE txId = ?', [tx.trx.receipt.status, rows[i].txId])
                    }
                } catch(err) { console.log(err)}
            }
        } catch (err) {console.log(err);}
    }
})