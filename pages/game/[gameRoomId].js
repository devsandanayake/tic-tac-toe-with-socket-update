import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3003');

const GameRoom = () => {
    const router = useRouter();
    const { gameRoomId } = router.query; // Extract gameRoomId from the URL path
    const { gameStateId, uuid } = router.query; // Extract gameStateId and uuid from the query parameters
                                  
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [status, setStatus] = useState('');
    const [hasStarted, setHasStarted] = useState(false);
    const [mySymbol, setMySymbol] = useState('');
  
     
    useEffect(() => {
        if (gameRoomId) {
            socket.emit('joinGame', gameRoomId);
        }

        socket.on('move', ({ index, symbol }) => {
            setBoard(prevBoard => {
                const newBoard = [...prevBoard];
                newBoard[index] = symbol;
                setIsXNext(symbol !== 'X');
                return newBoard;
            });
        });

        socket.on('gameJoined', ({ gameRoomId }) => {
            setStatus(`Joined game room ${gameRoomId}`);
        });

        socket.on('userJoined', ({ userId }) => {
            setHasStarted(true);
            setStatus(`User ${userId} joined the game`);
        });

        socket.on('resetGame', () => {
            reset(false);
        });

        socket.on('error', (error) => {
            setStatus(`Error: ${error}`);
        });

        return () => {
            socket.off('move');
            socket.off('gameJoined');
            socket.off('userJoined');
            socket.off('resetGame');
            socket.off('error');
        };
    }, [gameRoomId]);

    const handleClick = (index) => {
        if (!hasStarted) {
            setStatus('Please wait for opponent to join');
            return;
        }
        if (board[index] || calculateWinner(board)) return;
        const symbol = isXNext ? 'X' : 'O';
        socket.emit('move', { gameRoomId, index, symbol });
    };

    const reset = (isUserInitiated = true) => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        if (isUserInitiated) {
            socket.emit('resetGame', gameRoomId);
        }
    };

    const sendGameResults = async (winner, isTie) => {
        const payload = {
            room: {
                gameSessionUuid: gameRoomId,
                gameStatus: "FINISHED",
            },
            players: [
                {
                    uuid: "uuid_id_1", // Replace with the actual user UUID
                    points: winner === 'X' ? 100 : isTie ? 50 : 0,
                    userGameSessionStatus: winner === 'X' ? "WON" : isTie ? "TIE" : "DEFEATED",
                },
                {
                    uuid: "uuid_id_2", // Replace with the actual user UUID
                    points: winner === 'O' ? 100 : isTie ? 50 : 0,
                    userGameSessionStatus: winner === 'O' ? "WON" : isTie ? "TIE" : "DEFEATED",
                },
            ],
        };
        try {
            const response = await fetch('<game-base-url>/api/external_game/v1/game_session_finish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (response.ok) {
                setStatus('Game results submitted successfully');
            } else {
                setStatus(`Error submitting game results: ${result.message}`);
            }
        } catch (error) {
            setStatus(`Network error: ${error.message}`);
        }
    };

    const winner = calculateWinner(board);
    const isBoardFull = board.every(cell => cell !== null);
    const gameStatus = winner ? `Winner: ${winner}` : isBoardFull ? 'Tie Match' : `Next player: ${isXNext ? 'X' : 'O'}`;

    useEffect(() => {
        if (winner || isBoardFull) {
            sendGameResults(winner, isBoardFull);
        }
    }, [winner, isBoardFull]);

    return (
        <div className="game-container">
            <div className="game-info">
                <div className="game-room-title">
                    {`Game Room: ${gameRoomId}`}
                </div>
                {status && <div className="status">{status}</div>}
            </div>
            <div className="game-board">
                {board.map((cell, index) => (
                    <button key={index} className="game-cell" onClick={() => handleClick(index)}>
                        {cell}
                    </button>
                ))}
            </div>
            {(gameStatus.includes("Winner") || gameStatus.includes('Tie')) && (
                <button
                    type="button"
                    className="reset-button"
                    onClick={() => reset(true)}
                >
                    Reset
                </button>
            )}
            <style jsx>{`
                .game-container {
                    padding: 16px;
                    background-color: #f7fafc;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .game-info {
                    text-align: center;
                    margin-bottom: 24px;
                }

                .game-room-title {
                    margin-top: 8px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #4a5568;
                }

                .status {
                    margin-top: 8px;
                    color: #f56565;
                }

                .game-board {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }

                .game-cell {
                    width: 80px;
                    height: 80px;
                    background-color: #fff;
                    border: 1px solid #e2e8f0;
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .game-cell:hover {
                    background-color: #edf2f7;
                }

                .reset-button {
                    margin-top: 16px;
                    padding: 8px 16px;
                    background-color: #f56565;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .reset-button:hover {
                    background-color: #e53e3e;
                }
            `}</style>
        </div>
    );
};

const calculateWinner = (board) => {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
};

export default GameRoom;