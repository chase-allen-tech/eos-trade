To use wallet in your local machine, run the following commands.

cleos wallet create --to-console

This will show you the unlock public key. Keep that key.
Now unlock the wallet using the commands.

cleos wallet unlock
(Enter the public key)

Now you can run your project.

In setting.js file, replace the PUBLIC_KEY, PRIVATE_KEY, MY_ACCOUNT_NAME to your own account in the network.

To run nodeos in your local machine, run the following 2 commands.

pkill keosd

keosd &

nodeos -e -p eosio \
--plugin eosio::producer_plugin \
--plugin eosio::producer_api_plugin \
--plugin eosio::chain_api_plugin \
--plugin eosio::http_plugin \
--plugin eosio::history_plugin \
--plugin eosio::history_api_plugin \
--filter-on="*" \
--access-control-allow-origin='*' \
--contracts-console \
--http-validate-host=false \
--verbose-http-errors >> nodeos.log 2>&1 &

To increase the CPU/RAM bandwidth type the following.
cleos wallet unlock
cleos wallet import
(key)
cleos --url https://api.jungle3.alohaeos.com  system buyram adminadmin11 lioninjungle -k 2000
cleos --url https://api.jungle3.alohaeos.com system delegatebw adminadmin11 lioninjungle "1 EOS" "1 EOS"