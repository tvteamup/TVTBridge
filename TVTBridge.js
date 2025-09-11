/**
 * @file TVTBridge.js
 * @description A class to manage communication between a child window (client or host)
 * and a TV Team Up parent window, using window.postMessage.
 */

// Define the valid modes for the TVTBridge.
const VALID_MODES = ['host', 'client'];

/**
 * Represents a bridge that handles communication with a parent window on tvteamup.com.
 *
 * This class extends EventTarget to allow for custom events to be dispatched
 * and listened for.
 */
class TVTBridge extends EventTarget {
  /**
   * Constructs the TVTBridge instance.
   * @param {boolean} DEBUG If true, enables debug logging.
   * @throws {Error} If the instance is not running in a child window.
   */
  constructor(DEBUG=false) {
    super(); // Must call super() to properly initialize the EventTarget.

    this.mode = null; /* populated  */
    this.players = [
      /*
      {
        id: '123456789012234567890',
        name: 'Player Name',
        avatarHash: '040103020405002020405065040504',
        score: 0,
        data: {}
      },
      ...
      */
    ];
    this.playerID = null; /* will eventually either match a player id or 'host' */
    this.DEBUG = DEBUG; /* boolean */
    if (window.parent === window) {
      throw new Error('TV Team Up apps must be run in a child window.');
    }

    this.initialized = false;

    // Call the method to set up the event listener.
    this._addListeners();

    // inform the parent that the game is ready to receive initialization data
    this._passDataToParent('READY');
  }

  /**
   * Logs debug messages to the console if DEBUG mode is enabled.
   * @param {string} message The message to log.
   * @param {string} level The log level ('log', 'warn', 'error', 'info', 'debug').
   * @private
   */
  _debuglog(message, level='log') {
    if (!this.DEBUG) return;

    const validLevels = ['log', 'warn', 'error', 'info', 'debug'];
    if (!validLevels.includes(level)) {
      level = 'log';
    }
    console[level](`[TVTBridge]: ${message}`);
  }

  /**
   * Initializes the event listener for messages from the parent window.
   * This method attaches the `_parseDataFromParent` method to the window's
   * 'message' event.
   * @private
   */
  _addListeners() {
    window.addEventListener('message', this._parseDataFromParent.bind(this));
  }

  /**
   * Parses incoming messages from the parent window.
   * This method now dispatches custom events with the payload data from the class instance.
   * @param {MessageEvent} event The message event object.
   * @private
   */
  _parseDataFromParent(event) {
    // Only process messages from the parent window.
    if (event.source !== window.parent) {
      return;
    }

    const { type, payload } = event.data;
    const origin = payload.origin || 'unknown';
    const message = payload.message || '';
    const action = payload.action || {};

    if (!type) {
      this._debuglog('Received message with no type.', 'error');
      return;
    }

    // Dispatch a custom event based on the message type.
    switch (type) {
      case 'INITIALIZE':
        this._initializeGame(payload);
        this._debuglog(`[${this.mode}]: Received initialization message and initialized game data. Dispatching 'initializeGame' event.`);
        this.dispatchEvent(new CustomEvent('initializeGame', { detail: payload }));
        break;
      case 'PAUSE':
        this._debuglog(`[${this.mode}]: Received pause message. Dispatching 'pauseRequested' event.`);
        this.dispatchEvent(new Event('pauseRequested'));
        break;
      case 'RESUME':
        this._debuglog(`[${this.mode}]: Received resume message. Dispatching 'resumeRequested' event.`);
        this.dispatchEvent(new Event('resumeRequested'));
        break;
      case 'MUTE':
        this._debuglog(`[${this.mode}]: Received mute message. Dispatching 'muteRequested' event.`);
        this.dispatchEvent(new Event('muteRequested'));
        break;
      case 'UNMUTE':
        this._debuglog(`[${this.mode}]: Received unmute message. Dispatching 'unmuteRequested' event.`);
        this.dispatchEvent(new Event('unmuteRequested'));
        break;
      case 'GLOBAL_MESSAGE':
        this._debuglog(`[${this.mode}]: Received global message. Dispatching 'globalMessageReceived' event.`);
        this.dispatchEvent(new CustomEvent('globalMessageReceived', { detail: {origin, message} }));
        break;
      case 'DIRECT_MESSAGE':
        this._debuglog(`[${this.mode}]: Received direct message. Dispatching 'directMessageReceived' event.`);
        this.dispatchEvent(new CustomEvent('directMessageReceived', { detail: {origin, message} }));
        break;
      case 'PLAYER_ACTION':
        this._debuglog(`[${this.mode}]: Received player action update. Dispatching 'playerAction' event.`);
        this.dispatchEvent(new CustomEvent('playerAction', { detail: {origin, action} }));
        break;
      case 'GAME_STATE':
        this._debuglog(`[${this.mode}]: Received game state update. Dispatching 'gameState' event.`);
        this.dispatchEvent(new CustomEvent('gameState', { detail: payload }));
        break;
      case 'PLAYER_STATE':
        const {playerID, score, data} = payload;
        this._debuglog(`[${this.mode}]: Received player state update. Dispatching 'playerState' event.`);
        this.dispatchEvent(new CustomEvent('playerState', { detail: {playerID, score, data} }));
        break;
      case 'END':
        this._debuglog(`[${this.mode}]: Received end message. Dispatching 'endGame' event.`);
        this.dispatchEvent(new Event('endGame'));
        break;
      default:
        this._debuglog(`[${this.mode}]: Received unknown message type: ${type}`, 'warn');
        break;
    }
  }

  /**
   * Initializes the game instance with data received from the parent window.
   * This method sets the player list, assigns a player ID, and determines the
   * game mode ('host' or 'client') based on that ID.
   * @param {object} payload The initial data sent from the parent window.
   * @param {string} payload.playerID The unique ID of the current player.
   * @param {object} payload.players An object with keys matching the
   * playerIDs in the game and player states as values.
   * @private
   */
  _initializeGame(payload) {
    this.players = payload.players;
    this.playerID = payload.playerID;
    if (this.playerID == 'host') {
      this.mode = 'host';
    } else {
      this.mode = 'client';
    }
    this.initialized = true;
  }

  /**
   * Sends a message to the parent window.
   * @private
   * @param {string} type The type of message to send.
   * @param {object} payload The data payload for the message.
   */
  _passDataToParent(type, payload={}) {
    const message = { type, payload };
    window.parent.postMessage(message, '*'); // Use '*' for development. In production, use a specific origin.
    this._debuglog(`Sent message to parent: ${type}, payload: ${JSON.stringify(payload)}`);
  }

  /**
   * Sends a global message to the parent window to be broadcast to all connected clients.
   * @param {string} message The message to send.
   */
  sendGlobalMessage(message) {
    this._passDataToParent('GLOBAL_MESSAGE', { message });
  }

  /**
   * Sends a direct message to a specific client via the parent window.
   * @param {string} targetID The ID of the recipient client.
   * @param {string} message The message to send.
   */
  sendDirectMessage(targetId, message) {
    this._passDataToParent('DIRECT_MESSAGE', { message, targetID });
  }

  /**
   * [CLIENT MODE ONLY] Sends a player action to the parent window, associated with the current playerID.
   * @param {object} playerAction The action performed by the player (e.g., selected answer).
   */
  sendPlayerAction(playerAction) {
    if (this.mode !== 'client') {
      this._debuglog('Cannot send player action in host mode.', 'warn');
      return;
    }
    this._passDataToParent('PLAYER_ACTION', playerAction);
  }

  /**
   * [HOST MODE ONLY] Sends a game state update to the parent window.
   * @param {string} readable A human readable state summary, such as "Round 1/14"
   * @param {object} state The complete current state of the game.
   */
  sendGameStateUpdate(readable, state) {
    if (this.mode !== 'host') {
      this._debuglog('Cannot send game state update in client mode.', 'warn');
      return;
    }
    this._passDataToParent('GAME_STATE_UPDATE', {readable, state});
  }

  /**
   * [HOST MODE ONLY] Sends a player state update to the parent window.
   * @param {string} playerID the id of the player whose states are being updated.
   * @param {number} score the current player's score.
   * @param {object} state The state of a specific player (e.g., score, health).
   */
  sendPlayerStateUpdate(playerID, score, state) {
    if (this.mode !== 'host') {
      this._debuglog('Cannot send player state update in client mode.', 'warn');
      return;
    }
    this._passDataToParent('PLAYER_STATE_UPDATE', {playerID, score, state});
  }

  /**
   * notifies the parent window that the game has ended.
   */
  sendGameEnded() {
    if (this.mode !== 'host') {
      this._debuglog('Cannot end game in client mode.', 'warn');
      return;
    }
    this._passDataToParent('ENDED');
  }
}
