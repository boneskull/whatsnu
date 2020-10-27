# whatsnu

> Provide a "What's New" subcommand to your users -- a library for CLI apps

## Install

```shell
$ npm install whatsnu
```

## Example

```js
#!/usr/bin/env node
'use strict';

require('yargs')
  .scriptName('example-cli')
  .command({
    command: 'whats-new',
    description: 'Print recent changes to terminal',
    handler: async () => {
      const whatsnu = require('whatsnu');
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
```

## API

### `whatsnu(pkg [,opts])`

Returns markdown from your `CHANGELOG` file, rendered appropriately for a terminal.

`{string} pkg`: Path to your package's `package.json`, or a close directory (parent dirs will be searched). `__dirname` usually works.

Options (all are _optional_):
- `{string} changelog`: Path to `CHANGELOG`; defaults to `CHANGELOG.md` in same dir as the found `package.json`
- `{Object} pattern`: Key/value pairs to match a [`marked`](https://npm.im/marked) `Token` (as returned by its lexer) for `version`. Default is `{type: 'header', depth: 2}` which looks for your `package.json`'s `version` in second-level headings.  If your version number is found in top-level headings, use `{type: 'header', depth: 1}`.
- `{string} versionProp`: `Token` property in which to find the version; defaults to `text` and probably needn't be changed
- `{TerminalRendererOptions} rendererOpts`: Options for [`marked-terminal`](https://npm.im/marked-terminal) 
- `{string} header`: Markdown header to prepend to the output
- `{string} footer`: Markdown footer to append to the output

Returns:
- `{Promise<{changes, error>}`: If `error` is present, `changes` won't be, and vice-versa.
    - `{string} changes`: The notes for the version, rendered in terminal-appropriate Markdown. You'll probably `console.log()` this.  
    - `{Error} error`: If an exception was thrown, this is it.  Do with it what you will.

## License

Copyright © 2020 Christopher Hiller. Licensed Apache-2.0
