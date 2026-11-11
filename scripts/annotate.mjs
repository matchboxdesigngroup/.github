#!/usr/bin/env node
/**
 * Reports linter results as GitHub annotations, so every MDG check shows up the
 * same way on a pull request: as warnings by default, or as errors for
 * error-level issues when fail-on-error is set (the same rule cs2pr follows for PHPCS).
 *
 * Usage: node annotate.mjs <eslint|stylelint|actionlint> <report.json> [--fail-on-error]
 *
 * Reads the linter's JSON report:
 *   eslint      eslint --format json
 *   stylelint   stylelint --formatter json
 *   actionlint  actionlint -format '{{json .}}'
 *
 * Exit code: 0; 1 when --fail-on-error is set and an error-level issue was
 * found; 2 when the report is missing or unreadable (the linter itself failed).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = process.env.GITHUB_WORKSPACE || process.cwd();

// https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts
const escapeData = ( value ) =>
	String( value ).replace( /%/g, '%25' ).replace( /\r/g, '%0D' ).replace( /\n/g, '%0A' );
const escapeProperty = ( value ) =>
	escapeData( value ).replace( /:/g, '%3A' ).replace( /,/g, '%2C' );

/**
 * Prints one annotation per issue and returns the exit code.
 *
 * @param {Array<{file: string, line?: number, column?: number, endLine?: number, endColumn?: number, rule?: string, severity: string, message: string}>} issues
 * @param {{tool: string, failOnError?: boolean}} options
 * @return {number} 1 when failOnError is set and an issue is error-level, else 0.
 */
export function annotate( issues, { tool, failOnError = false } ) {
	let errors = 0;
	for ( const issue of issues ) {
		const isError = issue.severity === 'error';
		if ( isError ) {
			errors++;
		}
		const properties = {
			file: issue.file && path.isAbsolute( issue.file ) ? path.relative( workspace, issue.file ) : issue.file,
			line: issue.line,
			endLine: issue.endLine,
			col: issue.column,
			endColumn: issue.endColumn,
			title: issue.rule ? `${ tool }: ${ issue.rule }` : tool,
		};
		const props = Object.entries( properties )
			.filter( ( [ , value ] ) => value !== undefined && value !== null && value !== '' )
			.map( ( [ key, value ] ) => `${ key }=${ escapeProperty( value ) }` )
			.join( ',' );
		const command = failOnError && isError ? 'error' : 'warning';
		console.log( `::${ command } ${ props }::${ escapeData( issue.message ) }` );
	}
	console.log( `${ tool }: ${ issues.length } issue(s), ${ errors } of them error-level.` );
	return failOnError && errors > 0 ? 1 : 0;
}

const parsers = {
	eslint: ( report ) =>
		report.flatMap( ( file ) =>
			file.messages.map( ( message ) => ( {
				file: file.filePath,
				line: message.line,
				column: message.column,
				endLine: message.endLine,
				endColumn: message.endColumn,
				rule: message.ruleId,
				severity: message.severity === 2 ? 'error' : 'warning',
				message: message.message,
			} ) )
		),
	stylelint: ( report ) =>
		report.flatMap( ( file ) =>
			file.warnings.map( ( warning ) => ( {
				file: file.source,
				line: warning.line,
				column: warning.column,
				endLine: warning.endLine,
				endColumn: warning.endColumn,
				rule: warning.rule,
				severity: warning.severity,
				message: warning.text,
			} ) )
		),
	actionlint: ( report ) =>
		report.map( ( error ) => ( {
			file: error.filepath,
			line: error.line,
			column: error.column,
			rule: error.kind,
			severity: 'error',
			message: error.message,
		} ) ),
};

if ( process.argv[ 1 ] === fileURLToPath( import.meta.url ) ) {
	const [ tool, reportFile, ...flags ] = process.argv.slice( 2 );
	if ( ! parsers[ tool ] || ! reportFile ) {
		console.error( 'Usage: node annotate.mjs <eslint|stylelint|actionlint> <report.json> [--fail-on-error]' );
		process.exit( 2 );
	}

	let report;
	try {
		// actionlint prints nothing (or null) when there are no issues.
		const text = readFileSync( reportFile, 'utf8' ).trim();
		report = ( text ? JSON.parse( text ) : null ) ?? [];
	} catch ( error ) {
		console.log( `::warning title=${ escapeProperty( tool ) }::${ escapeData( `${ tool } didn't produce a report, so it may not have run. See the step log. (${ error.message })` ) }` );
		process.exit( 2 );
	}

	process.exitCode = annotate( parsers[ tool ]( report ), {
		tool,
		failOnError: flags.includes( '--fail-on-error' ),
	} );
}
