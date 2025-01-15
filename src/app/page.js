'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://144.126.243.236:3003');

const GameRoom = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gameSessionUuid = searchParams.get('gameSessionUuid');
    const gameStateId = searchParams.get('gameStateId');
    const uuid = searchParams.get('uuid');

    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [status, setStatus] = useState('');
    const [hasStarted, setHasStarted] = useState(false);
    const [mySymbol, setMySymbol] = useState('');
    const [gameRoom, setGameRoom] = useState(null);
    const [playerUUIDs, setPlayerUUIDs] = useState({ player1: '', player2: '' });

    useEffect(() => {
        if (!gameSessionUuid) return;

        fetch(`/api/${gameSessionUuid}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                setGameRoom(data);
                const player = data.players.find(player => player.uuid === uuid);
                if (player) {
                    setMySymbol(player.symbol);
                }
                setPlayerUUIDs({ player1: data.players[0].uuid, player2: data.players[1].uuid });
                socket.emit('joinGame', gameSessionUuid);
            })
            .catch(error => {
                console.error('Error fetching game room:', error);
                setStatus('Error fetching game room');
            });
    }, [gameSessionUuid, gameStateId, uuid]);

    useEffect(() => {
        socket.on('move', ({ index, symbol }) => {
            setBoard(prevBoard => {
                const newBoard = [...prevBoard];
                newBoard[index] = symbol;
                setIsXNext(symbol !== 'X');
                return newBoard;
            });
        });

        socket.on('gameJoined', ({ gameSessionUuid }) => {
            setStatus(`Joined game room ${gameSessionUuid}`);
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
    }, [gameSessionUuid]);

    const handleClick = (index) => {
        if (!hasStarted) {
            setStatus('Please wait for opponent to join');
            return;
        }
        if (board[index] || calculateWinner(board)) return;
        if (mySymbol !== (isXNext ? 'X' : 'O')) {
            setStatus(`It's not your turn`);
            return;
        }
        const symbol = isXNext ? 'X' : 'O';
        socket.emit('move', { gameRoomId: gameSessionUuid, index, symbol });
    };

    const reset = (isUserInitiated = true) => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        if (isUserInitiated) {
            socket.emit('resetGame', gameSessionUuid);
        }
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

    const winner = calculateWinner(board);
    const isBoardFull = board.every(cell => cell !== null);
    const gameStatus = winner ? `Winner: ${winner}` : isBoardFull ? 'Tie Match' : `Next player: ${isXNext ? 'X' : 'O'}`;

    useEffect(() => {
        if (winner || isBoardFull) {
            sendGameResults(winner, isBoardFull);
        }
    }, [winner, isBoardFull]);

    const sendGameResults = async (winner, isTie) => {
        const payload = {
            room: {
                gameSessionUuid: gameSessionUuid,
                gameStatus: "FINISHED",
            },
            players: [
                {
                    uuid: playerUUIDs.player1,
                    points: winner === 'X' ? 100 : isTie ? 50 : 0,
                    userGameSessionStatus: winner === 'X' ? "WON" : isTie ? "TIE" : "DEFEATED",
                },
                {
                    uuid: playerUUIDs.player2,
                    points: winner === 'O' ? 100 : isTie ? 50 : 0,
                    userGameSessionStatus: winner === 'O' ? "WON" : isTie ? "TIE" : "DEFEATED",
                },
            ],
        };
        try {
            const response = await fetch('https://safa-backend.safaesport.com/api/external_game/v1/game_session_finish', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('Response status:', response.status);

            const result = await response.json();
            if (response.ok) {
                setStatus('Game results submitted successfully');
            } else {
                setStatus(`Error submitting game results: ${result.message}`);
            }
        } catch (error) {
            setStatus(`Network error: ${error.message}`);
            console.log(error);
        }
    };

    return (
        <div className="game-container">
            <div className="game-info">
                <div className="game-room-title">
                    {`Game Room: Tic Tac Toe`}
                </div>
                {status && <div className="status">{status}</div>}
            </div>
            <div className="game-board">
                {board.map((cell, index) => (
                    <button
                        key={index}
                        className={`game-cell ${cell === 'X' ? 'x-cell' : cell === 'O' ? 'o-cell' : ''}`}
                        onClick={() => handleClick(index)}
                    >
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
            //UI can only change in this area 
                /* General Container */
.game-container {
    padding: 20px;
    background-color: #e0f7fa; /* Light blue background */
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.5s ease-in-out;
}

/* Game Info Section */
.game-info {
    text-align: center;
    margin-bottom: 24px;
    animation: slideIn 0.5s ease-in-out;
}

.game-room-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1d3557; /* Deep blue for titles */
    text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.1);
}

.status {
    margin-top: 10px;
    font-size: 1rem;
    color: #e63946; /* Bright red for status messages */
    font-weight: bold;
    animation: fadeIn 1s ease-in-out;
}

/* Game Board */
.game-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
    animation: bounceIn 1s ease-in-out;
}

.game-cell {
    width: 80px;
    height: 80px;
    background-color: #f1faee; /* Soft mint green */
    border: 2px solid #a8dadc; /* Light teal border */
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s ease, background-color 0.3s ease;
    border-radius: 6px;
}

.game-cell:hover {
    background-color: #e9c46a; /* Soft yellow hover effect */
    transform: scale(1.1);
}

.x-cell {
    color:rgb(16, 29, 216); /* Muted blue for X */
    font-weight: bold;
}

.o-cell {
    color:rgb(207, 35, 35); /* Warm orange-red for O */
    font-weight: bold;
}   

/* Reset Button */
.reset-button {
    margin-top: 20px;
    padding: 10px 20px;
    background-color: #2a9d8f; /* Rich teal button */
    color: #ffffff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
    transition: background-color 0.3s ease;
}

.reset-button:hover {
    background-color: #21867a; /* Slightly darker teal for hover */
}

/* Animations */
@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes slideIn {
    from {
        transform: translateY(-20px);
    }
    to {
        transform: translateY(0);
    }
}

@keyframes bounceIn {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }
    60% {
        transform: scale(1.1);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Responsive Design */
@media (max-width: 768px) {
    .game-cell {
        width: 60px;
        height: 60px;
        font-size: 1.2rem;
    }

    .game-room-title {
        font-size: 1.2rem;
    }

    .reset-button {
        padding: 8px 16px;
        font-size: 0.9rem;
    }
}

            `}</style>
        </div>
    );
};

export default GameRoom;