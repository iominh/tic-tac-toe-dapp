#[test_only]
module tic_tac_toe::game_tests {
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use tic_tac_toe::game::{Self, Game};

    const PLAYER_X: address = @0xA;
    const PLAYER_O: address = @0xB;
    const INVALID_PLAYER: address = @0xC;

    #[test]
    fun test_create_game() {
        let mut scenario = test::begin(PLAYER_X);
        
        // Create game as player X
        next_tx(&mut scenario, PLAYER_X);
        {
            game::create_game(ctx(&mut scenario));
        };

        // Verify initial game state
        next_tx(&mut scenario, PLAYER_X);
        {
            let game = test::take_shared<Game>(&scenario);
            assert!(game::get_current_turn(&game) == PLAYER_X, 0);
            assert!(game::get_status(&game) == 0, 0); // GAME_ACTIVE
            let (player_x, player_o) = game::get_players(&game);
            assert!(player_x == PLAYER_X, 0);
            assert!(player_o == @0x0, 0);
            test::return_shared(game);
        };
        test::end(scenario);
    }

    #[test]
    fun test_join_game() {
        let mut scenario = test::begin(PLAYER_X);
        
        // Create and join game
        next_tx(&mut scenario, PLAYER_X);
        {
            game::create_game(ctx(&mut scenario));
        };

        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::join_game(&mut game, ctx(&mut scenario));
            test::return_shared(game);
        };

        // Verify game state after join
        next_tx(&mut scenario, PLAYER_X);
        {
            let game = test::take_shared<Game>(&scenario);
            let (player_x, player_o) = game::get_players(&game);
            assert!(player_x == PLAYER_X, 0);
            assert!(player_o == PLAYER_O, 0);
            assert!(game::get_current_turn(&game) == PLAYER_O, 0);
            test::return_shared(game);
        };
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 5)] // EInvalidPlayer
    fun test_join_game_as_x() {
        let mut scenario = test::begin(PLAYER_X);
        
        next_tx(&mut scenario, PLAYER_X);
        {
            game::create_game(ctx(&mut scenario));
        };

        // Try to join as player X (should fail)
        next_tx(&mut scenario, PLAYER_X);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::join_game(&mut game, ctx(&mut scenario));
            test::return_shared(game);
        };
        test::end(scenario);
    }

    #[test]
    fun test_make_move() {
        let mut scenario = test::begin(PLAYER_X);
        
        // Setup game with both players
        next_tx(&mut scenario, PLAYER_X);
        {
            game::create_game(ctx(&mut scenario));
        };

        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::join_game(&mut game, ctx(&mut scenario));
            test::return_shared(game);
        };

        // Make moves
        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 4, ctx(&mut scenario)); // O plays center
            assert!(game::get_current_turn(&game) == PLAYER_X, 0);
            test::return_shared(game);
        };

        next_tx(&mut scenario, PLAYER_X);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 0, ctx(&mut scenario)); // X plays top-left
            assert!(game::get_current_turn(&game) == PLAYER_O, 0);
            test::return_shared(game);
        };
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2)] // ENotYourTurn
    fun test_wrong_turn() {
        let mut scenario = test::begin(PLAYER_X);
        
        next_tx(&mut scenario, PLAYER_X);
        {
            game::create_game(ctx(&mut scenario));
        };

        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::join_game(&mut game, ctx(&mut scenario));
            test::return_shared(game);
        };

        // Try to move as X when it's O's turn
        next_tx(&mut scenario, PLAYER_X);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 0, ctx(&mut scenario));
            test::return_shared(game);
        };
        test::end(scenario);
    }

    #[test]
    fun test_win_condition() {
        let mut scenario = test::begin(PLAYER_X);
        
        // Setup winning game for X
        next_tx(&mut scenario, PLAYER_X);
        {
            game::create_game(ctx(&mut scenario));
        };

        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::join_game(&mut game, ctx(&mut scenario));
            test::return_shared(game);
        };

        // Play winning sequence for X: [0,1,2]
        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 4, ctx(&mut scenario));
            test::return_shared(game);
        };

        next_tx(&mut scenario, PLAYER_X);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 0, ctx(&mut scenario));
            test::return_shared(game);
        };

        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 3, ctx(&mut scenario));
            test::return_shared(game);
        };

        next_tx(&mut scenario, PLAYER_X);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 1, ctx(&mut scenario));
            test::return_shared(game);
        };

        next_tx(&mut scenario, PLAYER_O);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 6, ctx(&mut scenario));
            test::return_shared(game);
        };

        next_tx(&mut scenario, PLAYER_X);
        {
            let mut game = test::take_shared<Game>(&scenario);
            game::make_move(&mut game, 2, ctx(&mut scenario));
            assert!(game::get_status(&game) == 2, 0); // GAME_WON
            test::return_shared(game);
        };
        test::end(scenario);
    }
} 