#!/usr/bin/env node
'use strict';

require('yargs')
  .scriptName('example-cli')
  .command({
    command: 'whats-new',
    description: 'Print recent changes to terminal',
    handler: async () => {
      const whatsnu = require('..');
      const {error, changes} = await whatsnu(__dirname, {
        header: "# What's new in example-cli"
      });
      if (error) {
        console.error(error);
        process.exitCode = 1;
      } else {
        console.log(changes);
      }
    },
  })
  .help().argv;
