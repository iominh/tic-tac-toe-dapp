module tic_tac_toe::game {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
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
    const EInvalidBetAmount: u64 = 103;

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
        status: u8,
        bet_amount: u64,  // Amount in SUI
        player_x_bet: Coin<SUI>,
        player_o_bet: option::Option<Coin<SUI>>
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
        player_x: address,
        bet_amount: u64
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

    // Add new debug event
    public struct WinnerDebug has copy, drop {
        game_id: address,
        sender: address,
        player_piece: u8,
        is_winner: bool,
        board: vector<u8>
    }

    public fun create_game(bet: Coin<SUI>, ctx: &mut TxContext) {
        let creator = tx_context::sender(ctx);
        let game_id = object::new(ctx);
        let game_addr = object::uid_to_address(&game_id);
        let bet_amount = coin::value(&bet);

        let game = Game {
            id: game_id,
            board: vector[0, 0, 0, 0, 0, 0, 0, 0, 0],
            player_x: creator,
            player_o: @0x0,
            current_turn: creator,
            status: GAME_ACTIVE,
            bet_amount,
            player_x_bet: bet,
            player_o_bet: option::none()
        };

        // Debug assertion
        assert!(creator != @0x0, 0);
        
        event::emit(GameCreated {
            game_id: game_addr,
            player_x: creator,
            bet_amount
        });

        transfer::share_object(game);
    }

    public fun join_game(game: &mut Game, bet: Coin<SUI>, ctx: &TxContext) {
        let joiner = tx_context::sender(ctx);
        assert!(game.player_o == @0x0, EGameNotFull);
        assert!(joiner != game.player_x, EInvalidPlayer);
        assert!(coin::value(&bet) == game.bet_amount, EInvalidBetAmount);
        
        game.player_o = joiner;
        game.current_turn = game.player_o;
        option::fill(&mut game.player_o_bet, bet);

        event::emit(PlayerJoined {
            game_id: object::uid_to_address(&game.id),
            player_o: joiner
        });
    }

    public fun make_move(game: &mut Game, position: u8, ctx: &mut TxContext) {
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

        let is_winner = check_winner(&game.board, player_piece);

        // Debug event to verify winner check
        event::emit(WinnerDebug {
            game_id,
            sender,
            player_piece,
            is_winner,
            board: game.board
        });

        if (is_winner) {
            game.status = GAME_WON;
            handle_game_end(game, ctx);
            event::emit(GameResult {
                game_id,
                player_x: game.player_x,
                player_o: game.player_o,
                winner: option::some(sender),
                status: GAME_WON
            });
            return
        };

        // Then check draw
        if (is_board_full(&game.board)) {
            game.status = GAME_DRAW;
            handle_game_end(game, ctx);
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
        // Check rows
        let mut i = 0;
        while (i < 3) {
            let row_start = i * 3;
            if (*vector::borrow(board, row_start) == player &&
                *vector::borrow(board, row_start + 1) == player &&
                *vector::borrow(board, row_start + 2) == player) {
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

    // Update game end logic to handle bets
    fun handle_game_end(game: &mut Game, ctx: &mut TxContext) {
        if (game.status == GAME_WON) {
            let winner = if (game.current_turn == game.player_x) {
                game.player_x
            } else {
                game.player_o
            };
            
            // Create new coin for total
            let mut total_bet = coin::zero<SUI>(ctx);
            
            // Take ownership of X's bet
            let x_bet_value = coin::value(&game.player_x_bet);
            coin::join(&mut total_bet, coin::split(&mut game.player_x_bet, x_bet_value, ctx));
            
            // Take ownership of O's bet
            if (option::is_some(&game.player_o_bet)) {
                let o_bet = option::extract(&mut game.player_o_bet);
                coin::join(&mut total_bet, o_bet);
            };
            
            // Transfer total to winner
            transfer::public_transfer(total_bet, winner);
        } else if (game.status == GAME_DRAW) {
            // Return bets to players
            let x_bet_value = coin::value(&game.player_x_bet);
            transfer::public_transfer(
                coin::split(&mut game.player_x_bet, x_bet_value, ctx),
                game.player_x
            );
            
            if (option::is_some(&game.player_o_bet)) {
                transfer::public_transfer(
                    option::extract(&mut game.player_o_bet),
                    game.player_o
                );
            };
        };
    }
} 