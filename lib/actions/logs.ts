/*
Copyright 2016-2017 Resin.io

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { CommandDefinition } from 'capitano';

const logsCmd: CommandDefinition<
	{
		uuid: string;
	},
	{
		tail: boolean;
	}
> = {
	signature: 'logs <uuid>',
	description: 'show device logs',
	help: `\
Use this command to show logs for a specific device.

By default, the command prints all log messages and exit.

To continuously stream output, and see new logs in real time, use the \`--tail\` option.

Note that for now you need to provide the whole UUID for this command to work correctly.

This is due to some technical limitations that we plan to address soon.

Examples:

	$ resin logs 23c73a1
	$ resin logs 23c73a1\
`,
	options: [
		{
			signature: 'tail',
			description: 'continuously stream output',
			boolean: true,
			alias: 't',
		},
	],
	permission: 'user',
	primary: true,
	async action(params, options, done) {
		const { resin } = await import('../sdk');
		const moment = await import('moment');

		const printLine = (line: { timestamp: string; message: string }) => {
			const timestamp = moment(line.timestamp).format('DD.MM.YY HH:mm:ss (ZZ)');
			return console.log(`${timestamp} ${line.message}`);
		};

		const promise = resin.logs.history(params.uuid).each(printLine);

		if (!options.tail) {
			// PubNub keeps the process alive after a history query.
			// Until this is fixed, we force the process to exit.
			// This of course prevents this command to be used programatically
			return promise.catch(done).finally(() => process.exit(0));
		}

		promise
			.then(() =>
				resin.logs.subscribe(params.uuid).then(function(logs) {
					logs.on('line', printLine);
					logs.on('error', done);
				}),
			)
			.catch(done);
	},
};

// Needs to be a separate statement - single expression export
// stops the async function compiling correctly? Very odd.
export = logsCmd;
