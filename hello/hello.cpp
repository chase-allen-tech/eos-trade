#include <eosio/eosio.hpp>

class [[eosio::contract]] hello : public eosio::contract {
public:
	using eosio::contract::contract;

	[[eosio::action]] void hi(eosio::name user) {
		require_auth(user);
		print("Hello, ", user);
	}
};