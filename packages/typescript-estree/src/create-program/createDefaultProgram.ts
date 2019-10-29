import debug from 'debug';
import path from 'path';
import * as ts from 'typescript'; // leave this as * as ts so people using util package don't need syntheticDefaultImports
import { Extra } from '../parser-options';
import {
  getTsconfigPath,
  DEFAULT_COMPILER_OPTIONS,
  ASTAndProgram,
} from './shared';

const log = debug('typescript-eslint:typescript-estree:createDefaultProgram');

/**
 * @param code The code of the file being linted
 * @param options The config object
 * @param extra.tsconfigRootDir The root directory for relative tsconfig paths
 * @param extra.projects Provided tsconfig paths
 * @returns If found, returns the source file corresponding to the code and the containing program
 */
function createDefaultProgram(
  code: string,
  extra: Extra,
): ASTAndProgram | undefined {
  log('Getting default program for: %s', extra.filePath || 'unnamed file');

  if (!extra.projects || extra.projects.length !== 1) {
    return undefined;
  }

  const tsconfigPath = getTsconfigPath(extra.projects[0], extra);

  const commandLine = ts.getParsedCommandLineOfConfigFile(
    tsconfigPath,
    DEFAULT_COMPILER_OPTIONS,
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
  );

  if (!commandLine) {
    return undefined;
  }

  const compilerHost = ts.createCompilerHost(commandLine.options, true);
  const oldReadFile = compilerHost.readFile;
  compilerHost.readFile = (fileName: string): string | undefined =>
    path.normalize(fileName) === path.normalize(extra.filePath)
      ? code
      : oldReadFile(fileName);

  const program = ts.createProgram(
    [extra.filePath],
    commandLine.options,
    compilerHost,
  );
  const ast = program.getSourceFile(extra.filePath);

  return ast && { ast, program };
}

export { createDefaultProgram };
