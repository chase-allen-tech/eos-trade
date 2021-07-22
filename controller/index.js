const { Api, JsonRpc } = require('eosjs');
const Eos = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');  // development only
const { WebAuthnSignatureProvider } = require('eosjs/dist/eosjs-webauthn-sig');
const fetch = require('node-fetch');
const { TextDecoder, TextEncoder } = require('util');

// Wallet Unlock PWD
// const defaultPrivateKey = 'PW5JTPKJspgf82v8QYma4XMKXRq2yKwiUCtWTuaPLuNVrVBmM8H6k'	

const PUBLIC_KEY = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'

const URL_ENDPOINT = 'http://localhost:8888';
const defaultPrivateKey = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'

const privateKeys = [defaultPrivateKey];
const signatureProvider = new JsSignatureProvider(privateKeys);
const rpc = new JsonRpc(URL_ENDPOINT, { fetch }); //required to read blockchain state
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() }); //required to submit transactions

exports.listenTransaction = (req, res) => {
	const { address } = req.body;
	(async () => {
		await rpc.history_get_transaction(address);
	})();
}

exports.transfer = (req, res) => {
	// const { account_from='bob', account_to='alice', quantity='1.000 EOS' } = req.body;
	const account_from = 'bob';
	const account_to = 'alice';
	const quantity = '1.000 EOS';

	(async () => {
	  await api.transact({
	    actions: [{
	      account: 'eosio.token',
	      name: 'transfer',
	      authorization: [{
	        actor: account_from,
	        permission: 'active',
	      }],
	      data: {
	        from: account_from,
	        to: account_to,
	        quantity: quantity,
	        memo: 'some memo'
	      }
	    }]
	  }, {
	    blocksBehind: 3,
	    expireSeconds: 30,
	  }).then(res => {
	  	console.log('Success', res);
	  }).catch(err => {
	  	console.log('err', err);
	  });
	})();
}

exports.createAccount = (req, res) => {

	let existingaccount = 'bob';
	let mynewaccount = 'alice1'; // req.body.new_account_name;
	// let pubkey =  'PUB_R1_6FPFZqw5ahYrR9jD96yDbbDNTdKtNqRbze6oTDLntrsANgQKZu'; // req.body.publickey;
	let pubkey = PUBLIC_KEY;

	console.log('[is it working]');
	console.log(pubkey);
	console.log(mynewaccount);

	// Create Account
	(async () => {
		console.log('[executing]');
		let re = await api.transact({
			actions: [
				{
				    account: 'eosio',
				    name: 'newaccount',
				    authorization: [{
				      actor: existingaccount,
				      permission: 'active',
				    }],
				    data: {
				      creator: existingaccount,
				      name: mynewaccount,
				      owner: {
				        threshold: 1,
				        keys: [{
				          key: pubkey,
				          weight: 1
				        }],
				        accounts: [],
				        waits: []
				      },
				      active: {
				        threshold: 1,
				        keys: [{
				          key: pubkey,
				          weight: 1
				        }],
				        accounts: [],
				        waits: []
				      },
				    },
				},
				// {
				//     account: 'eosio',
				//     name: 'buyrambytes',
				//     authorization: [{
				//       actor: existingaccount,
				//       permission: 'active',
				//     }],
				//     data: {
				//       payer: existingaccount,
				//       receiver: mynewaccount,
				//       bytes: 8192,
				//     },
				// },
				// {
				//     account: 'eosio',
				//     name: 'delegatebw',
				//     authorization: [{
				//       actor: existingaccount,
				//       permission: 'active',
				//     }],
				//     data: {
				//       from: existingaccount,
				//       receiver: mynewaccount,
				//       stake_net_quantity: '1.0000 SYS',
				//       stake_cpu_quantity: '1.0000 SYS',
				//       transfer: false,
				//     }
			 //  	}
			  	]
			}, {
				blocksBehind: 3,
				expireSeconds: 30,
			}).then(res => {
				console.log('[here]', res);
			}).catch(err => {
				console.log(['err'], err);
			});
	})();


  res.json({ success: 'okay'});
}

