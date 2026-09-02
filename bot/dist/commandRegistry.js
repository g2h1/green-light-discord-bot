import * as ping from './commands/ping.js';
import * as server from './commands/server.js';
import * as support from './commands/support.js';
import * as ticketpanel from './commands/ticketpanel.js';
export const commands = [ping, server, support, ticketpanel];
export const commandsByName = new Map(commands.map((c) => [c.data.name, c]));
