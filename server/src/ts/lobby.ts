import { CreateLobby } from "./action/initial/create-lobby";
import * as game from "./games/game";
import { Game } from "./games/game";
import * as rules from "./games/rules";
import * as config from "./lobby/config";
import { Config } from "./lobby/config";
import { GameCode } from "./lobby/game-code";
import * as user from "./user";
import { User } from "./user";
import * as util from "./util";
import * as token from "./user/token";

/**
 * A game lobby.
 */
export interface Lobby {
  name: string;
  public: boolean;
  nextUserId: number;
  users: Map<user.Id, User>;
  owner: user.Id;
  config: Config;
  game?: Game;
}

/**
 * A lobby with an active game.
 */
export type WithActiveGame = Lobby & { game: Game };

/**
 * Return if the given lobby has an active game.
 */
export const hasActiveGame = (lobby: Lobby): lobby is WithActiveGame =>
  lobby.game !== undefined;

/**
 * A game lobby containing only state all users can see.
 */
export interface Public {
  name: string;
  public: boolean;
  users: { [id: string]: user.Public };
  owner: user.Id;
  config: config.Public;
  game?: game.Public;
}

/**
 * The state of a lobby.
 */
export type State = "Playing" | "SettingUp";

/**
 * A summary of a lobby.
 */
export interface Summary {
  name: string;
  gameCode: GameCode;
  state: State;
  users: { players: number; spectators: number };
}

/**
 * Create a config with default values.
 */
export const defaultConfig = (): Config => ({
  version: 0,
  rules: rules.create(),
  decks: []
});

/**
 * Create a new lobby.
 * @param creation The details of the lobby to create.
 */
export function create(creation: CreateLobby): Lobby {
  const id = (0).toString();
  return {
    name: creation.name ? creation.name : `${creation.owner.name}'s Game`,
    public: false,
    nextUserId: 1,
    users: new Map([[id, user.create(creation.owner, "Privileged")]]),
    owner: id,
    config: defaultConfig()
  };
}

/**
 * The state of the given lobby.
 */
export const state = (lobby: Lobby): State =>
  lobby.game === null ? "SettingUp" : "Playing";

/**
 * Get a summary of the given lobby.
 * @param gameCode The game code for the lobby.
 * @param lobby The lobby.
 */
export const summary = (gameCode: GameCode, lobby: Lobby): Summary => ({
  name: lobby.name,
  gameCode: gameCode,
  state: state(lobby),
  users: util.counts(Object.values(lobby.users), {
    players: user.isPlaying,
    spectators: user.isSpectating
  })
});

/**
 * If the given lobby has ended.
 */
export const ended = (lobby: Lobby): boolean =>
  lobby.game !== undefined && lobby.game.winner !== undefined;

function usersObj(lobby: Lobby): { [id: string]: user.Public } {
  const obj: { [id: string]: user.Public } = {};
  for (const [id, lobbyUser] of lobby.users.entries()) {
    obj[id] = user.censor(lobbyUser);
  }
  return obj;
}

export const censor = (lobby: Lobby, auth: token.Claims): Public => ({
  name: lobby.name,
  public: lobby.public,
  users: usersObj(lobby),
  owner: lobby.owner,
  config: config.censor(lobby.config, auth),
  ...(lobby.game === undefined ? {} : { game: game.censor(lobby.game) })
});