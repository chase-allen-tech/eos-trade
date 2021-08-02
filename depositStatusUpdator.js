const { JsonRpc } = require('eosjs');
const fetch = require('node-fetch');
const mysqlPromise = require('mysql2/promise');
const config = require('./config');
const { URL_ENDPOINT } = require('./setting');

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

const getAllUsers = async () => {
    let [rows, fields] = await pool.query("SELECT name FROM eosAddresses");
    let addresses = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].name.length == 12) {
            addresses.push(rows[i].name);
        }
    }
    return addresses;
}

const isExistInTransactions = async (txid) => {
    let [rows, fields] = await pool.query("SELECT txid FROM eosTransactions");
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].txid == txid) return true;
    }
    return false;
}

let blockNumber = config.blockNumber;
async function main() {
    try {
        console.log('[processing block]', blockNumber);
        let users = await getAllUsers();

        let block = await rpc.get_block(blockNumber);
        if (block.transactions.length) {

            for (let transaction of block.transactions) {

                let trx = transaction.trx.transaction;
                if (!Object.keys(trx).length) continue;

                let isExist = await isExistInTransactions(transaction.trx.id);
                if (!isExist) {
                    for (let action of trx.actions) {

                        // If someone send EOS to me
                        if (action.name = 'transfer' && users.indexOf(action.data.to) >= 0) {
                            await pool.query('INSERT INTO eosTransactions (txid, blockid, status, toAddress, amount, type, fromAddress) VALUES (?, ?, ?, ?, ?, ?, ?)', [transaction.trx.id, blockNumber, transaction.status, action.data.to, action.data.quantity, 'pending', action.data.from]);
                            console.log('[New Transaction Inserted]');
                        }
                    }
                } else {
                    console.log('[Same transaction is exsit in DB, skipping this...]');
                }
            }
        }
        blockNumber += 1;
        await sleep(2000);
        setImmediate(main);
    } catch (err) {
        console.log(err);
        await sleep(2000);
        setImmediate(main);
    }
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

main().then(console.log);