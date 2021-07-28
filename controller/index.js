const { Api, JsonRpc } = require('eosjs');
const Eos = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');  // development only
const fetch = require('node-fetch');
const { TextDecoder, TextEncoder } = require('util');
const { URL_ENDPOINT, MY_ACCOUNT_NAME, ACTIVE_PUBLIC_KEY, PRIVATE_KEY } = require('../setting');
const { structCreateAccount, structTransfer } = require('./struct');
const mysqlPromise = require('mysql2/promise');
const config = require('../config');

const signatureProvider = new JsSignatureProvider([PRIVATE_KEY]);
const rpc = new JsonRpc(URL_ENDPOINT, { fetch }); //required to read blockchain state
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() }); //required to submit transactions

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

// This will return received transactions from other accounts to my account
exports.watchMyAccount = async (req, res) => {
	// const txId = '821458dba3e8d75253d43b8b4f95804d9de766250ec7d815d15492dc62cf6910';
	// const blockId = '90594660';

	let info = await rpc.get_info();
	let block = await rpc.get_block(info.last_irreversible_block_num);
	transactions = block.transactions[0].trx.transaction.actions;

	let result = [];
	for (let transaction of block.transactions) {
		let trx = transaction.trx.transaction;
		if (!Object.keys(trx).length) continue;
		for (let action of trx.actions) {
			console.log(action, transaction.status, transaction.trx.id);

			// If someone send EOS to me
			if (action.name = 'transfer' && action.data.to == MY_ACCOUNT_NAME) {
				let txStatus = transaction.status;
				let txId = transaction.trx.id;
				result.push({txId: txId, txStatus: txStatus, blockId: info.last_irreversible_block_num });
			}
		}
	}
	res.json(result);
}

exports.test = async (req, res) => {
	const txId = '821458dba3e8d75253d43b8b4f95804d9de766250ec7d815d15492dc62cf6910';
	const blockId = '90594660';
	let result = await rpc.history_get_transaction(txId, blockId);

	console.log('[blockId]', result);
	res.json(result);
}

exports.depositAddress = async (req, res) => {
	const { accountName } = req.body;

	let result = '';
	let rows_tmp = [];
	try {
		let [rows, fields] = await pool.query("SELECT * FROM eosAddresses WHERE `address` = ?", [accountName]);
		rows_tmp = rows;
	} catch (err) {
		console.log(err);
	}
	console.log('[rows]', rows_tmp);
	if (rows_tmp.length == 0) {
		try {
			await pool.query('INSERT IGNORE INTO eosAddresses (address, userId) VALUES (?, ?, ?)', [accountName, accountName]);
		} catch (err) {
			console.log(err);
		}
		result = accountName;
	} else {
		result = rows_tmp[0];
	}

	res.send({
		status: true,
		address: result
	});
}

exports.userSend = async (req, res) => {
	const { sender, receiver, quantity } = req.body;

	// const sender = 'admin1234512';
	// const receiver = 'bob123451234';
	// const quantity = '1.0000 EOS';

	try {
		let [rows, fields] = await pool.query("SELECT userId from eosAddresses WHERE `address` = ?", [sender]);
		if(!rows.length) {
			res.send({ status: 'false', message: 'Sender address not in db' });
		} else {
			await api.transact(structTransfer(sender, receiver, quantity), { blocksBehind: 3, expireSeconds: 30, });
			res.send({ status: 'true', message: 'Success'});
		}
	} catch (err) {
		console.log(err);
		res.send({status: 'false', message: 'Error Occured'});
	}
}

exports.adminSend = async (req, res) => {
	const { receiver, quantity } = req.body;

	// const receiver = 'bob123451234';
	// const quantity = '1.0000 EOS';

	try {
		let result = await api.transact(structTransfer(MY_ACCOUNT_NAME, receiver, quantity), { blocksBehind: 3, expireSeconds: 30, });
		console.log('[res]', result.transaction_id, result.processed.block_num);

		// Save to DB
		await pool.query('INSERT INTO eosTransactions (txId, blockId, status, receiver, amount, type, sender) VALUES (?, ?, ?, ?, ?, ?, ?', [result.transaction_id, result.processed.block_num, result.processed.receipt.status, receiver, quantity, MY_ACCOUNT_NAME]);
		res.send({status: 'true', message: 'Success', transactionId: result.transaction_id, blockId: result.processed.block_num });
	} catch(err) {
		console.log(err);
		res.send({status: 'false', message: 'Error Occured'});
	}
}

exports.getBalance = async (req, res) => {
	const { accountName } = req.body;
	// const accountName = 'lioninjungle';
	try {
		let balance = await rpc.get_currency_balance('eosio.token', accountName, 'EOS');
		if (Array.isArray(balance)) balance = balance[0];
		res.send({ status: 'true', message: balance });
	} catch (err) {
		console.log(err);
		res.send({status: 'false', message: 'Error Occured'});
	}
	
}

exports.getAccount = async (req, res) => {
	const { accountName } = req.body;
	// const accountName = 'bob123451234'; // Test account 

	try {
		let account = await rpc.get_account(accountName)
		res.send({ status: 'true', message: account });
	} catch (err) {
		console.log(err);
		res.send({status: 'false', message: 'Error Occured'});
	}
}

exports.createAccount = async (req, res) => {
	const { newAccount } = req.body;
	// let newAccount = 'bob123451235';

	try {
		let result = await api.transact(structCreateAccount(MY_ACCOUNT_NAME, newAccount, ACTIVE_PUBLIC_KEY), { blocksBehind: 3, expireSeconds: 30, });
		res.send({ status: 'true', message: result });
	} catch (err) {
		console.log(err);
		res.send({status: 'false', message: 'Error Occured'});
	}
}

