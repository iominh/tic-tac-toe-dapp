module tic_tac_toe::game {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::vector;
    use std::option::{Self, Option};

    // Error codes
    const EInvalidMove: u64 = 0;
    const EGameOver: u64 = 1;
    const ENotYourTurn: u64 = 2;
    const EGameNotFull: u64 = 3;
    const ESpotTaken: u64 = 4;
    const EInvalidPlayer: u64 = 5;

    // Game status
    const GAME_ACTIVE: u8 = 0;
    const GAME_DRAW: u8 = 1;
    const GAME_WON: u8 = 2;

    public struct Game has key {
        id: UID,
        board: vector<u8>,
        player_x: address,
        player_o: address,
        current_turn: address,
        status: u8
    }

    public struct GameResult has copy, drop {
        game_id: address,
        player_x: address,
        player_o: address,
        winner: Option<address>,
        status: u8
    }

    public fun create_game(ctx: &mut TxContext) {
        let game = Game {
            id: object::new(ctx),
            board: vector[0, 0, 0, 0, 0, 0, 0, 0, 0],
            player_x: tx_context::sender(ctx),
            player_o: @0x0,
            current_turn: tx_context::sender(ctx),
            status: GAME_ACTIVE
        };
        transfer::share_object(game);
    }

    public fun join_game(game: &mut Game, ctx: &TxContext) {
        assert!(game.player_o == @0x0, EGameNotFull);
        assert!(tx_context::sender(ctx) != game.player_x, EInvalidPlayer);
        game.player_o = tx_context::sender(ctx);
    }

    public fun make_move(game: &mut Game, position: u8, ctx: &TxContext) {
        // Validate move
        assert!(game.status == GAME_ACTIVE, EGameOver);
        assert!(position < 9, EInvalidMove);
        assert!(vector::borrow(&game.board, (position as u64)) == &0, ESpotTaken);
        assert!(tx_context::sender(ctx) == game.current_turn, ENotYourTurn);
        
        // Make move
        let player_piece = if (tx_context::sender(ctx) == game.player_x) 1 else 2;
        *vector::borrow_mut(&mut game.board, (position as u64)) = player_piece;

        // Update turn
        game.current_turn = if (tx_context::sender(ctx) == game.player_x) {
            game.player_o
        } else {
            game.player_x
        };

        // Check win condition
        if (check_winner(&game.board, player_piece)) {
            game.status = GAME_WON;
            event::emit(GameResult {
                game_id: object::uid_to_address(&game.id),
                player_x: game.player_x,
                player_o: game.player_o,
                winner: option::some(tx_context::sender(ctx)),
                status: GAME_WON
            });
        } else if (is_board_full(&game.board)) {
            game.status = GAME_DRAW;
            event::emit(GameResult {
                game_id: object::uid_to_address(&game.id),
                player_x: game.player_x,
                player_o: game.player_o,
                winner: option::none(),
                status: GAME_DRAW
            });
        };
    }

    fun check_winner(board: &vector<u8>, player: u8): bool {
        // Check rows
        let mut i = 0;
        while (i < 3) {
            if (*vector::borrow(board, i * 3) == player &&
                *vector::borrow(board, i * 3 + 1) == player &&
                *vector::borrow(board, i * 3 + 2) == player) {
                return true
            };
            i = i + 1;
        };

        // Check columns
        i = 0;
        while (i < 3) {
            if (*vector::borrow(board, i) == player &&
                *vector::borrow(board, i + 3) == player &&
                *vector::borrow(board, i + 6) == player) {
                return true
            };
            i = i + 1;
        };

        // Check diagonals
        if (*vector::borrow(board, 0) == player &&
            *vector::borrow(board, 4) == player &&
            *vector::borrow(board, 8) == player) {
            return true
        };

        if (*vector::borrow(board, 2) == player &&
            *vector::borrow(board, 4) == player &&
            *vector::borrow(board, 6) == player) {
            return true
        };

        false
    }

    fun is_board_full(board: &vector<u8>): bool {
        let mut i = 0;
        while (i < 9) {
            if (*vector::borrow(board, i) == 0) {
                return false
            };
            i = i + 1;
        };
        true
    }

    // View functions
    public fun get_board(game: &Game): vector<u8> {
        game.board
    }

    public fun get_current_turn(game: &Game): address {
        game.current_turn
    }

    public fun get_status(game: &Game): u8 {
        game.status
    }

    public fun get_players(game: &Game): (address, address) {
        (game.player_x, game.player_o)
    }
} 