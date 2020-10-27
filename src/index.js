// @ts-check

'use strict';

const marked = require('marked');
const readPkgUp = require('read-pkg-up');
const {promises: fs} = require('fs');
const path = require('path');
const debug = require('debug')('whatsnu');
const TerminalRenderer = require('marked-terminal');
const escapeStringRegexp = require('escape-string-regexp');

module.exports = whatsnu;

/**
 * Default object shape to match for a `Token` containing the version
 */
const DEFAULT_BASE_PATTERN = {
  type: 'heading',
  depth: 2,
};

/**
 * Default opts to `TerminalRenderer`
 */
const DEFAULT_RENDERER_OPTS = {
  tab: 2,
};

/**
 * Parse the text of a CHANGELOG for changes pertaining to version `version`
 * @param {string} text - Text of CHANGELOG
 * @param {string} version - (Latest) version of package
 * @param {TerminalRenderer} renderer - TerminalRenderer
 * @param {WhatsnuOptions} [opts] - Options
 * @returns {string} Markdown formatted for terminal
 */
function parse(
  text,
  version,
  renderer,
  {pattern = DEFAULT_BASE_PATTERN, versionProp = 'text', header, footer} = {}
) {
  const tokens = marked.lexer(text);
  const versionRegex = new RegExp(
    `\\b${escapeStringRegexp(version)}(?:$|[^.])`
  );

  const startIdx = tokens.findIndex((token) => {
    let found = null;
    if (!(versionProp in token)) {
      return false;
    }
    for (const [key, value] of Object.entries(pattern)) {
      if (found === false) {
        return found;
      }
      if (key in token) {
        found = token[key] === value;
        if (found) {
          debug('found matching %s: %s', key, token[key]);
        }
      }
    }
    if (found) {
      found = versionRegex.test(token[versionProp]);
      if (found) {
        debug(
          'found version matching %s in %s',
          versionRegex,
          token[versionProp]
        );
      }
    }
    return found;
  });

  if (startIdx === -1) {
    return `What's new for version ${version}?  Who knows?!\n\nSomebody should fix this.`;
  }

  debug('found version %s at index %d', version, startIdx);

  // this is the same as the previous findIndex except that we assert
  // the version _does not match_.  this gives us all tokens up until the next-oldest version in the changelog
  let endIdx = tokens.slice(startIdx + 1).findIndex((token) => {
    let found = null;
    if (!(versionProp in token)) {
      return false;
    }
    for (const [key, value] of Object.entries(pattern)) {
      if (found === false) {
        return found;
      }
      if (key in token) {
        found = token[key] === value;
        debug('found matching %s: %s', key, token[key]);
      }
    }
    if (found) {
      found = !versionRegex.test(token[versionProp]);
      if (found) {
        debug(
          'found version NOT matching %s in %s',
          versionRegex,
          token[versionProp]
        );
      }
    }
    return found;
  });

  // this would be a changelog with a single version in it, probably.
  if (endIdx === -1) {
    endIdx = Infinity;
  }

  // since we sliced, we are operating from an offset
  endIdx += startIdx;

  debug('taking tokens from %d to %d', startIdx, startIdx + endIdx);
  let changesTokens = /** @type {marked.TokensList} */ (tokens.slice(
    startIdx,
    startIdx + endIdx
  ));

  let links = tokens.links;
  if (header) {
    const headerTokens = marked.lexer(header);
    changesTokens = /** @type {marked.TokensList} */ ([
      ...headerTokens,
      ...changesTokens,
    ]);
    links = /** @type {TokensListLinks} */ ({...headerTokens.links, ...links});
  }
  if (footer) {
    const footerTokens = marked.lexer(footer);
    changesTokens = /** @type {marked.TokensList} */ ([
      ...changesTokens,
      ...footerTokens,
    ]);
    links = /** @type {TokensListLinks} */ ({...links, ...footerTokens.links});
  }
  changesTokens.links = links;
  return marked.parser(changesTokens, {
    renderer,
  });
}

/**
 * Returns the relevant portion of a `CHANGELOG` for a particular version
 * @param {string} pkg - Path to `package.json` or containing directory
 * @param {WhatsnuOptions} [opts] - Options
 * @returns {Promise<WhatsnuResult>}
 */
async function whatsnu(pkg, opts = {}) {
  /** @type {string} */
  let version;
  let pkgPath;

  try {
    const result = await readPkgUp({cwd: pkg});
    version = result.packageJson.version;
    pkgPath = result.path;
  } catch (err) {
    return {error: err};
  }

  const changelogPath = path.resolve(
    path.dirname(pkgPath),
    opts.changelog || 'CHANGELOG.md'
  );

  let text;
  try {
    text = await fs.readFile(changelogPath, 'utf8');
  } catch (err) {
    return {error: err};
  }

  const changes = parse(
    text,
    version,
    new TerminalRenderer({...DEFAULT_RENDERER_OPTS, ...opts.rendererOpts}),
    opts
  );

  return {changes};
}

/**
 * @typedef {Object} WhatsnuOptions
 * @property {string} [changelog=CHANGELOG.md] - Path to changelog
 * @property {{[key: string]: number|boolean|string}} [pattern] - Object containing key/value pairs to match against the Token type
 * @property {string} [versionProp=text] - The object property to find the version within
 * @property {TerminalRenderer.TerminalRendererOptions} [rendererOpts]
 * @property {string} [header] - Markdown header for output, if any
 * @property {string} [footer] - Markdown footer for output, if any
 */

/**
 * @typedef {Object} WhatsnuResult
 * @property {string} [changes] - Requested changes from CHANGELOG rendered in terminal-friendly markdown
 * @property {Error} [error] - If an exception was caught, this is it
 */

/**
 * @typedef {{[key: string]: { href: string | null; title: string | null}}} TokensListLinks
 */
