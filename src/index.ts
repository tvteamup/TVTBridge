/**
 * @file TVTBridge.ts
 * @description A class to manage communication between a child window (client or host)
 * and a TV Team Up parent window, using window.postMessage.
 */

// Define interfaces for player and message data to ensure type safety.
export interface Player {
  id: string;
  name: string;
  avatarHash: string;
  score: number;
  data: Record<string, any>;
}

interface InitializePayload {
  playerID: string;
  players: Array<Player>;
  settings: Record<string, any>;
}

// Define the valid modes for the TVTBridge.
type Mode = 'host' | 'client' | null;

/**
 * Represents a bridge that handles communication with a parent window on tvteamup.com.
 *
 * This class extends EventTarget to allow for custom events to be dispatched
 * and listened for.
 */
export class TVTBridge extends EventTarget {
  private mode: Mode;
  private players: Array<Player> = [];
  private playerID: string | null = null;
  private settings: Record<string, any> = {};
  private DEBUG: boolean;
  private initialized: boolean = false;

  /**
   * Constructs the TVTBridge instance.
   * @param {boolean} [DEBUG=false] If true, enables debug logging.
   * @throws {Error} If the instance is not running in a child window.
   */
  constructor(DEBUG: boolean = false) {
    super(); // Must call super() to properly initialize the EventTarget.

    this.DEBUG = DEBUG;
    this.mode = null;
    this.playerID = null;
    this.initialized = false;
    
    // Check if the script is running in a child window.
    if (window.parent === window) {
      throw new Error('TV Team Up apps must be run in a child window.');
    }

    this._addListeners();

    // Inform the parent that the game is ready to receive initialization data.
    this._passDataToParent('READY');
  }

  /**
   * Logs debug messages to the console if DEBUG mode is enabled.
   * @private
   * @param {string} message The message to log.
   * @param {string} [level='log'] The log level ('log', 'warn', 'error', 'info', 'debug').
   */
  private _debuglog(message: string, level: 'log' | 'warn' | 'error' | 'info' | 'debug' = 'log'): void {
    if (!this.DEBUG) {
      return;
    }

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
  private _addListeners(): void {
    window.addEventListener('message', this._parseDataFromParent.bind(this));
  }

  /**
   * Parses incoming messages from the parent window.
   * This method dispatches custom events with the payload data from the class instance.
   * @private
   * @param {MessageEvent} event The message event object.
   */
  private _parseDataFromParent(event: MessageEvent): void {
    // Only process messages from the parent window.
    if (event.source !== window.parent) {
      return;
    }

    const { type, payload } = event.data;

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
      case 'UPDATE_SETTINGS':
        let newSettings = payload.settings || {};
        this.settings = Object.assign({}, this.settings, newSettings);
        this._debuglog(`[${this.mode}]: Received settings update. Dispatching 'settingsUpdated' event.`);
        this.dispatchEvent(new CustomEvent('settingsUpdated', { detail: newSettings }));
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
        this.dispatchEvent(new CustomEvent('globalMessageReceived', { detail: { origin: payload.origin, message: payload.message } }));
        break;
      case 'DIRECT_MESSAGE':
        this._debuglog(`[${this.mode}]: Received direct message. Dispatching 'directMessageReceived' event.`);
        this.dispatchEvent(new CustomEvent('directMessageReceived', { detail: { origin: payload.origin, message: payload.message } }));
        break;
      case 'PLAYER_ACTION':
        this._debuglog(`[${this.mode}]: Received player action update. Dispatching 'playerAction' event.`);
        this.dispatchEvent(new CustomEvent('playerAction', { detail: { origin: payload.origin, action: payload.action } }));
        break;
      case 'GAME_STATE':
        this._debuglog(`[${this.mode}]: Received game state update. Dispatching 'gameState' event.`);
        this.dispatchEvent(new CustomEvent('gameState', { detail: payload }));
        break;
      case 'PLAYER_STATE':
        this._debuglog(`[${this.mode}]: Received player state update. Dispatching 'playerState' event.`);
        this.dispatchEvent(new CustomEvent('playerState', { detail: { playerID: payload.playerID, score: payload.score, data: payload.data } }));
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
   * @private
   * @param {InitializePayload} payload The initial data sent from the parent window.
   */
  private _initializeGame(payload: InitializePayload): void {
    this.settings = payload.settings;
    this.players = payload.players;
    this.playerID = payload.playerID;
    if (this.playerID === 'host') {
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
   * @param {any} [payload={}] The data payload for the message.
   */
  private _passDataToParent(type: string, payload: any = {}): void {
    const message = { type, payload };
    // Use '*' for development. In production, use a specific origin.
    window.parent.postMessage(message, '*');
    this._debuglog(`Sent message to parent: ${type}, payload: ${JSON.stringify(payload)}`);
  }

  /**
   * Sends a global message to the parent window to be broadcast to all connected clients.
   * @param {string} message The message to send.
   */
  public sendGlobalMessage(message: string): void {
    this._passDataToParent('GLOBAL_MESSAGE', { message });
  }

  /**
   * Sends a direct message to a specific client via the parent window.
   * @param {string} targetId The ID of the recipient client.
   * @param {string} message The message to send.
   */
  public sendDirectMessage(targetId: string, message: string): void {
    this._passDataToParent('DIRECT_MESSAGE', { message, targetID: targetId });
  }

  /**
   * Sends updated settings to the parent window.
   * @param {Record<string, any>} settings The settings object to send.
   */
  public sendSettingsUpdate(settings: Record<string, any>): void {
    this._passDataToParent('UPDATE_SETTINGS', { settings });
  }

  /**
   * [CLIENT MODE ONLY] Sends a player action to the parent window, associated with the current playerID.
   * @param {Record<string, any>} playerAction The action performed by the player (e.g., selected answer).
   */
  public sendPlayerAction(playerAction: Record<string, any>): void {
    if (this.mode !== 'client') {
      this._debuglog('Cannot send player action in host mode.', 'warn');
      return;
    }
    this._passDataToParent('PLAYER_ACTION', playerAction);
  }

  /**
   * [HOST MODE ONLY] Sends a game state update to the parent window.
   * @param {string} readable A human readable state summary, such as "Round 1/14".
   * @param {Record<string, any>} state The complete current state of the game.
   */
  public sendGameStateUpdate(readable: string, state: Record<string, any>): void {
    if (this.mode !== 'host') {
      this._debuglog('Cannot send game state update in client mode.', 'warn');
      return;
    }
    this._passDataToParent('GAME_STATE_UPDATE', { readable, state });
  }

  /**
   * [HOST MODE ONLY] Sends a player state update to the parent window.
   * @param {string} playerID the id of the player whose states are being updated.
   * @param {number} score the current player's score.
   * @param {Record<string, any>} state The state of a specific player (e.g., score, health).
   */
  public sendPlayerStateUpdate(playerID: string, score: number, state: Record<string, any>): void {
    if (this.mode !== 'host') {
      this._debuglog('Cannot send player state update in client mode.', 'warn');
      return;
    }
    this._passDataToParent('PLAYER_STATE_UPDATE', { playerID, score, state });
  }



  /**
   * notifies the parent window that the game has ended.
   */
  public sendGameEnded(): void {
    if (this.mode !== 'host') {
      this._debuglog('Cannot end game in client mode.', 'warn');
      return;
    }
    this._passDataToParent('ENDED');
  }
}
