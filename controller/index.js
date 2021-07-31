const { Api, JsonRpc } = require('eosjs');
const eos = require('@cobo/eos');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');  // development only
const fetch = require('node-fetch');
const { TextDecoder, TextEncoder } = require('util');
const { URL_ENDPOINT, MY_ACCOUNT_NAME, PRIVATE_KEY } = require('../setting');
const { structCreateAccount, structTransfer, structBuyRam } = require('./struct');
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
				result.push({ txId: txId, txStatus: txStatus, blockId: info.last_irreversible_block_num });
			}
		}
	}
	res.json(result);
}

exports.test = async (req, res) => {
	let bb = await rpc.get_currency_balance('eosio.token', 'adminadmin11', 'EOS');
	console.log(bb);
}

const getAccountNameFromId = async id => {
	let [rows, fields] = await pool.query("SELECT name FROM eosAddresses WHERE `userId` = ?", [id]);
	if (rows.length) {
		return rows[0].name;
	} else {
		return null;
	}
}

const getPrivateKeyFromId = async id => {
	let [rows, fields] = await pool.query("SELECT addressHex FROM eosAddresses WHERE `userId` = ?", [id]);
	if (rows.length) {
		return rows[0].addressHex;
	} else {
		return null;
	}
}

const makeRandomName = length => {
	let result = '';
	let characters = 'abcdefghijklmnopqrstuvw12345';
	let len = characters.length;
	for(let i = 0; i < length; i ++) {
		result += characters.charAt(Math.floor(Math.random() * len));
	}
	return result;
}

exports.depositAddress = async (req, res) => {
	const { userId } = req.body;
	// const userId = 100;

	let result = '';
	let rows_tmp = [];
	try {
		let name = await getAccountNameFromId(userId);
		if (!name) {

			// Create new wallet for this account user
			let ww = eos.fromMasterSeed(userId.toString());
			let prk = ww.getPrivateKey(); // 5JNwxtMbvKdpcNTvtERprt25rKC51r25krGX2fVusBgU9W22QkJ
			let puk = ww.getPublicKey();  // EOS6DMCsrk8gppwQ9mS8BsdEKVrvmSDsyqDqH7fnsQm5faQDYMwva

			// Create random account
			const random_user = makeRandomName(12);
			await api.transact(structCreateAccount(MY_ACCOUNT_NAME, random_user, puk), { blocksBehind: 3, expireSeconds: 30, });

			result = await pool.query('INSERT IGNORE INTO eosAddresses (name, address, addressHex, userId) VALUES (?, ?, ?, ?)', [random_user, puk, prk, userId]);
		} else {
			result = name;
		}
		res.send({ status: true, message: result });
	} catch (err) {
		console.log(err);
		res.send({ status: 'false', message: 'Error Occured' });
	}
}

exports.buyRamBytes = async (req, res) => {
	const { payerId, receiverId, quantity } = req.body;

	try {

		let prk = await getPrivateKeyFromId(payerId);
		let payer = await getAccountNameFromId(payerId);
		let receiver = await getAccountNameFromId(receiverId);

		if (!prk || !payer || !receiver) return res.send({ status: 'false', message: 'Payer address not in db' });

		let signatureProvider = new JsSignatureProvider([prk]);
		let rpc = new JsonRpc(URL_ENDPOINT, { fetch }); //required to read blockchain state
		let api1 = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

		console.log('eeeee');

		let result = await api1.transact(structBuyRam(payer, receiver, quantity), { blocksBehind: 3, expireSeconds: 30, });

		res.send({ status: 'true', message: result.transaction_id });
	} catch (err) {
		console.log(err);
		res.send({ status: 'false', message: 'Error Occured' });
	}
}

exports.userSend = async (req, res) => {
	const { senderId, receiverId, quantity } = req.body;

	try {

		let prk = await getPrivateKeyFromId(senderId);
		let sender = await getAccountNameFromId(senderId);
		let receiver = await getAccountNameFromId(receiverId);

		if (!prk || !sender || !receiver) return res.send({ status: 'false', message: 'Sender address not in db' });

		let signatureProvider = new JsSignatureProvider([prk]);
		let rpc = new JsonRpc(URL_ENDPOINT, { fetch }); //required to read blockchain state
		let api1 = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

		let result = await api1.transact(structTransfer(sender, receiver, quantity), { blocksBehind: 3, expireSeconds: 30, });

		res.send({ status: 'true', message: result.transaction_id });
	} catch (err) {
		console.log(err);
		res.send({ status: 'false', message: 'Error Occured' });
	}
}

exports.adminSend = async (req, res) => {
	const { receiverId, quantity } = req.body;

	try {
		let receiverName = await getAccountNameFromId(receiverId);
		if (!receiverName) return res.send({ status: 'false', message: 'There is no data in DB' });

		// Send transaction
		let result = await api.transact(structTransfer(MY_ACCOUNT_NAME, receiverName, quantity), { blocksBehind: 3, expireSeconds: 30, });

		// Save to DB
		await pool.query('INSERT INTO eosTransactions (txid, blockid, status, toAddress, amount, type, fromAddress) VALUES (?, ?, ?, ?, ?, ?, ?)', [result.transaction_id, result.processed.block_num, result.processed.receipt.status, receiverName, quantity, 'pending', MY_ACCOUNT_NAME]);
		res.send({ status: 'true', message: 'Success', transactionId: result.transaction_id, blockId: result.processed.block_num });
	} catch (err) {
		console.log(err);
		res.send({ status: 'false', message: 'Error Occured' });
	}
}

exports.getBalance = async (req, res) => {
	const { userId } = req.body;
	try {
		let name = await getAccountNameFromId(userId);
		let balance = await rpc.get_currency_balance('eosio.token', name, 'EOS');
		if (Array.isArray(balance)) balance = balance[0];
		res.send({ status: 'true', message: balance });
	} catch (err) {
		console.log(err);
		res.send({ status: 'false', message: 'Error Occured' });
	}
}

exports.getAccount = async (req, res) => {
	const { userId } = req.body;

	try {
		let name = await getAccountNameFromId(userId);
		let account = await rpc.get_account(name)
		res.send({ status: 'true', message: account });
	} catch (err) {
		console.log(err);
		res.send({ status: 'false', message: 'Error Occured' });
	}
}

