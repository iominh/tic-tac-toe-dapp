module tic_tac_toe::game {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use std::vector;
    use std::option;

    // Error codes
    const EInvalidMove: u64 = 0;
    const EGameOver: u64 = 1;
    const ENotYourTurn: u64 = 2;
    const EGameNotFull: u64 = 3;
    const ESpotTaken: u64 = 4;
    const EInvalidPlayer: u64 = 5;
    const EPiecePlacementFailed: u64 = 100;
    const EGameNotActive: u64 = 101;
    const EWinCheckFailed: u64 = 102;

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

    // Events
    public struct GameResult has copy, drop {
        game_id: address,
        player_x: address,
        player_o: address,
        winner: option::Option<address>,
        status: u8
    }

    public struct GameCreated has copy, drop {
        game_id: address,
        player_x: address
    }

    public struct PlayerJoined has copy, drop {
        game_id: address,
        player_o: address
    }

    public struct MoveMade has copy, drop {
        game_id: address,
        player: address,
        position: u8,
        board: vector<u8>
    }

    // Add new debug event types
    public struct DebugState has copy, drop {
        game_id: address,
        is_winner: bool,
        is_draw: bool,
        board: vector<u8>,
        player_piece: u8
    }

    // Add a debug event for win checks
    public struct WinCheck has copy, drop {
        game_id: address,
        board: vector<u8>,
        player_piece: u8,
        win_detected: bool
    }

    public fun create_game(ctx: &mut TxContext) {
        let creator = tx_context::sender(ctx);
        let game_id = object::new(ctx);
        let game_addr = object::uid_to_address(&game_id);

        let game = Game {
            id: game_id,
            board: vector[0, 0, 0, 0, 0, 0, 0, 0, 0],
            player_x: creator,
            player_o: @0x0,
            current_turn: creator,
            status: GAME_ACTIVE
        };

        // Debug assertion
        assert!(creator != @0x0, 0);
        
        event::emit(GameCreated {
            game_id: game_addr,
            player_x: creator
        });

        transfer::share_object(game);
    }

    public fun join_game(game: &mut Game, ctx: &TxContext) {
        let joiner = tx_context::sender(ctx);
        assert!(game.player_o == @0x0, EGameNotFull);
        assert!(joiner != game.player_x, EInvalidPlayer);
        
        game.player_o = joiner;
        game.current_turn = game.player_o;

        event::emit(PlayerJoined {
            game_id: object::uid_to_address(&game.id),
            player_o: joiner
        });
    }

    public fun make_move(game: &mut Game, position: u8, ctx: &TxContext) {
        let sender = tx_context::sender(ctx);
        let game_id = object::uid_to_address(&game.id);
        
        // Validate move
        assert!(game.status == GAME_ACTIVE, EGameOver);
        assert!(position < 9, EInvalidMove);
        assert!(vector::borrow(&game.board, (position as u64)) == &0, ESpotTaken);
        assert!(sender == game.current_turn, ENotYourTurn);

        // If O hasn't joined, X can only make one move
        if (game.player_o == @0x0) {
            assert!(sender == game.player_x, EInvalidPlayer);
            game.current_turn = @0x0;
            let player_piece = 1;
            *vector::borrow_mut(&mut game.board, (position as u64)) = player_piece;

            event::emit(MoveMade {
                game_id,
                player: sender,
                position,
                board: game.board
            });
            return
        };
        
        // Normal gameplay after O has joined
        let player_piece = if (sender == game.player_x) 1 else 2;
        *vector::borrow_mut(&mut game.board, (position as u64)) = player_piece;

        // Always emit move event
        event::emit(MoveMade {
            game_id,
            player: sender,
            position,
            board: game.board
        });

        // Verify piece was placed correctly
        assert!(*vector::borrow(&game.board, (position as u64)) == player_piece, EPiecePlacementFailed);

        // Check for win and emit win check event
        let is_winner = check_winner(&game.board, player_piece);

        // Print board state for debugging
        let board_str = std::string::utf8(b"Board state: ");
        std::debug::print(&board_str);
        std::debug::print(&game.board);

        // Verify game is still active
        assert!(game.status == GAME_ACTIVE, EGameNotActive);

        if (is_winner) {
            // Double check win condition
            assert!(check_winner(&game.board, player_piece), EWinCheckFailed);
            
            game.status = GAME_WON;
            // Emit game result for win
            event::emit(GameResult {
                game_id,
                player_x: game.player_x,
                player_o: game.player_o,
                winner: option::some(sender),
                status: GAME_WON
            });
            return
        };

        // Check for draw
        let is_draw = is_board_full(&game.board);
        if (is_draw) {
            game.status = GAME_DRAW;
            // Emit game result for draw
            event::emit(GameResult {
                game_id,
                player_x: game.player_x,
                player_o: game.player_o,
                winner: option::none(),
                status: GAME_DRAW
            });
            return
        };

        // Switch turns if game continues
        game.current_turn = if (sender == game.player_x) {
            game.player_o
        } else {
            game.player_x
        };
    }

    // Update check_winner to be more explicit
    public fun check_winner(board: &vector<u8>, player: u8): bool {
        let mut has_win = false;

        // Check rows
        let mut i = 0;
        while (i < 3) {
            if (*vector::borrow(board, i * 3) == player &&
                *vector::borrow(board, i * 3 + 1) == player &&
                *vector::borrow(board, i * 3 + 2) == player) {
                has_win = true;
                break
            };
            i = i + 1;
        };

        // Check columns if no row win
        if (!has_win) {
            i = 0;
            while (i < 3) {
                if (*vector::borrow(board, i) == player &&
                    *vector::borrow(board, i + 3) == player &&
                    *vector::borrow(board, i + 6) == player) {
                    has_win = true;
                    break
                };
                i = i + 1;
            };
        };

        // Check diagonals if still no win
        if (!has_win) {
            if ((*vector::borrow(board, 0) == player &&
                 *vector::borrow(board, 4) == player &&
                 *vector::borrow(board, 8) == player) ||
                (*vector::borrow(board, 2) == player &&
                 *vector::borrow(board, 4) == player &&
                 *vector::borrow(board, 6) == player)) {
                has_win = true;
            };
        };

        has_win
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