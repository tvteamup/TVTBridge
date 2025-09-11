# TVTBridge.js
A class to manage communication between a child window (client or host)  and a TV Team Up parent window, using window.postMessage.

TV Team Up games are designed to run within an iframe that is hosted by tvteamup.com.

## Receiving messages from the TV Team Up platform
The TVTBridge object will fire several events to notify your game of communications from the TV Team Up platform.

### initializeGame
Fires when the TV Team Up server has successfully shaken hands with the Bridge,
and passes information about the initial state of the game to your application,
including player info.

#### Example:
```js
const bridge = new TVTBridge();

bridge.addEventListener('gameInitialized', (e)=>{
  const gameInfo = e.detail;
  mode = gameInfo.mode; // either 'host' or 'client'
  players = gameInfo.players;
  /* players = [
    {
      id: '123456789012234567890',
      name: 'Player Name',
      avatarHash: '040103020405002020405065040504',
      score: 0,
      data: {}
    },
    ...
  ];*/
  playerID = gameInfo.playerID; // "12345678901234567890"
  gameState = initialState;
  startGame(mode);
});
```

### endGame
Fires when the game host requests that the game end.

#### Example:
```js
bridge.addEventListener('endGame', (e)=>{
  endGame();
});
```

### pauseRequested
Fires when the game host requests that the game be paused.

#### Example:
```js
bridge.addEventListener('pauseRequested', (e)=>{
  pauseGame();
});
```

### resumeRequested
Fires when the game host requests that the game resume from a paused state.

#### Example:
```js
bridge.addEventListener('resumeRequested', (e)=>{
  resumeGame();
});
```

### muteRequested
Fires when the game host requests that the game be muted.

#### Example:
```js
bridge.addEventListener('muteRequested', (e)=>{
  muteGame();
});
```

### unmuteRequested
Fires when the game host requests that the game be muted.

#### Example:
```js
bridge.addEventListener('unmuteRequested', (e)=>{
  unmuteGame();
});
```

### gameState
Fires when the game host forwards game state from the host to clients.
The game state itself is an arbitrary object that can be defined by your
game as needed.

#### Example:
```js
bridge.addEventListener('gameState', (e)=>{
  state = e.detail;
  processGameState(state);
});
```

### playerState
Fires when the game host forwards a player's state from the host to clients.
The player state itself is an arbitrary object that can be defined by your
game as needed, but this message will also contain playerID and score.

#### Example:
```js
bridge.addEventListener('playerState', (e)=>{
  const details = e.detail;
  const playerID = details.playerID;
  const playerScore = details.score;
  const data = details.data;
  updatePlayerState(playerID, playerScore, data);
});
```

### playerAction
Fires when the game host forwards a player's action from the client to the host.
The player action itself is an arbitrary object that can be defined by your
game as needed. Along with the action, the event detail will also include the
origin's playerID.

#### Example:
```js
bridge.addEventListener('playerAction', (e)=>{
  const detail = e.detail;
  const playerID = details.origin;
  const action = details.action;
  processPlayerAction(playerID, action);
});
```

### globalMessageReceived
Fires when the game host forwards a global message from any player or host to all
other clients. the event details will contain the origin (playerID or `HOST`) of
the message, as well as the message itself, which is expected to be a string.

Global messages have no explicit intended use in the game platform at the moment,
but along with direct messages, they can be used to add any necessary
custom communications.

#### Example:
```js
bridge.addEventListener('globalMessageReceived', (e)=>{
  const detail = e.detail;
  const sender = details.origin;
  const message = details.action;
  processGlobalMessage(sender, message);
});
```

### directMessageReceived
Fires when the game host forwards a direct message from a specific player or host
to another specific client. the event details will contain the origin
(playerID or 'host') of the message, as well as the message itself, which is
expected to be a string.

Direct messages have no explicit intended use in the game platform at the moment,
but along with global messages, they can be used to add any necessary
custom communications.

#### Example:
```js
bridge.addEventListener('directMessageReceived', (e)=>{
  const detail = e.detail;
  const sender = details.origin;
  const message = details.action;
  processDirectMessage(sender, message);
});
```

## Sending Messages
The TVTBridge object contains several methods designed to send messages from the client players and host to the game platform.

### sendGlobalMessage(message)
Passes an arbitrary string to the game platform, to be distributed to all clients.

#### Example:
```js
bridge.sendGlobalMessage('Hello World!');
```

### sendDirectMessage(message, target)
Passes an arbitrary string to the game platform, to be distributed to a specific client, identified by either player ID or the identifier `HOST`.

#### Example:
```js
bridge.sendGlobalMessage('Hello World!', 'HOST');
```

### [CLIENT ONLY] sendPlayerAction(action)
Passes a player action object to the game platform, to be forwarded to the host.
The player action may be any arbitrary object.

#### Example:
```js
bridge.sendPlayerAction({ ID: 'Q12', response: 'B' });
```

### [HOST ONLY] sendGameStateUpdate(readable, state)
Passes a game state update from the host to the game platform, to be forwarded to the players. A short human-readable state is also included, for the platform to display to users as needed.

#### Example:
```js
bridge.sendGameStateUpdate("Question 12", {
  question: 12,
  state: 'AWAITING_INPUT',
  expires: 1757554791,
});
```

### [HOST ONLY] sendPlayerStateUpdate(playerID, score, state)
Passes a player state update from the host to the game platform, to be forwarded to 
the players. Along with the playerID, also include a simple numberic score.
For games using non-traditional scoring, such as golf, the `score` parameter should
contain a ranking of the players. If partial scoring is impossible, all scores should be set to `null` until the game is over.

#### Example:
```js
bridge.sendPlayerStateUpdate("12345678901234567890", 500, {
  question: 12,
  state: 'ANSWERED',
  answer: 'B'
});
```

### [HOST ONLY] sendGameEnded()
Notifies the game platform that the game has ended, and all clients should be returned to the game selection lobby.

#### Example:
```js
bridge.sendGameEnded();
```
