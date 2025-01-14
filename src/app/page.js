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
        if (!gameSessionUuid) return; // Ensure the gameSessionUuid is available

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
                    uuid: playerUUIDs.player1, // Use the actual user UUID from state
                    points: winner === 'X' ? 100 : isTie ? 50 : 0,
                    userGameSessionStatus: winner === 'X' ? "WON" : isTie ? "TIE" : "DEFEATED",
                },
                {
                    uuid: playerUUIDs.player2, // Use the actual user UUID from state
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
                body: payload,
            });

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
                    {`Game Room: ${gameSessionUuid}`}
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

export default GameRoom;