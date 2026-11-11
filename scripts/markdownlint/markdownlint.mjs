#!/usr/bin/env node
/**
 * Runs markdownlint-cli2, the engine behind DavidAnson/markdownlint-cli2-action,
 * and reports each issue as a GitHub annotation through ../annotate.mjs: a
 * warning by default, an error with --fail-on-error. The action itself always
 * reports errors, which wouldn't match the other MDG checks.
 *
 * Usage, from the repository root:
 *   node markdownlint.mjs [--fail-on-error] [--config <file>] <file>...
 *
 * Exit code: 0; 1 when --fail-on-error is set and an issue was found; 2 when
 * markdownlint-cli2 itself failed (e.g. an invalid config).
 */
import { main } from 'markdownlint-cli2';
import { annotate } from '../annotate.mjs';

const args = process.argv.slice( 2 );
let failOnError = false;
let config = '';
const files = [];
for ( let i = 0; i < args.length; i++ ) {
	if ( args[ i ] === '--fail-on-error' ) {
		failOnError = true;
	} else if ( args[ i ] === '--config' ) {
		config = args[ ++i ];
	} else {
		files.push( args[ i ] );
	}
}

const issues = [];
const outputFormatter = ( { results } ) => {
	for ( const result of results ) {
		const detail = result.errorDetail ? ` [${ result.errorDetail }]` : '';
		const context = result.errorContext ? ` [Context: "${ result.errorContext }"]` : '';
		const information = result.ruleInformation ? ` ${ result.ruleInformation }` : '';
		issues.push( {
			file: result.fileName,
			line: result.lineNumber,
			endLine: result.lineNumber,
			column: result.errorRange?.[ 0 ],
			endColumn: result.errorRange ? result.errorRange[ 0 ] + result.errorRange[ 1 ] - 1 : undefined,
			rule: result.ruleNames.join( '/' ),
			severity: result.severity ?? 'error',
			message: `${ result.ruleDescription }${ detail }${ context }${ information }`,
		} );
	}
};

// A leading ':' makes markdownlint-cli2 treat each path literally, not as a glob.
const argv = files.map( ( file ) => `:${ file }` );
if ( config ) {
	argv.push( '--config', config );
}

let code;
try {
	code = await main( {
		argv,
		logMessage: console.log,
		logError: console.error,
		optionsOverride: { outputFormatters: [ [ outputFormatter ] ] },
	} );
} catch ( error ) {
	console.error( error );
	code = 2;
}

if ( code > 1 ) {
	console.log( '::warning title=markdownlint::markdownlint failed to run. See the step log.' );
	process.exitCode = 2;
} else {
	process.exitCode = annotate( issues, { tool: 'markdownlint', failOnError } );
}
