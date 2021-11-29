import { useEffect, useState } from 'react';

import type Monaco from 'monaco-editor';
import type { LintMessage, WebLinter } from '@typescript-eslint/website-eslint';
import type { RuleDetails } from '../types';
import type {
  createTypeScriptSandbox,
  SandboxConfig,
} from '../../vendor/sandbox';

import { sandboxSingleton } from './loadSandbox';
import { editorEmbedId } from './EditorEmbed';

export interface SandboxServicesProps {
  readonly jsx?: boolean;
  readonly onLoaded: (
    ruleDetails: RuleDetails[],
    tsVersions: readonly string[],
  ) => void;
  readonly ts: string;
}

export type SandboxInstance = ReturnType<typeof createTypeScriptSandbox>;

export interface SandboxServices {
  fixes: Map<string, LintMessage>;
  main: typeof Monaco;
  sandboxInstance: SandboxInstance;
  webLinter: WebLinter;
}

export const useSandboxServices = (
  props: SandboxServicesProps,
): Error | SandboxServices | undefined => {
  const [services, setServices] = useState<Error | SandboxServices>();
  const [loadedTs, setLoadedTs] = useState<string>(props.ts);

  useEffect(() => {
    if (props.ts !== loadedTs) {
      window.location.reload();
    }
  }, [props.ts, loadedTs]);

  useEffect(() => {
    const fixes = new Map<string, LintMessage>();
    let sandboxInstance: SandboxInstance | undefined;
    setLoadedTs(props.ts);

    sandboxSingleton(props.ts)
      .then(({ main, sandboxFactory, ts, linter }) => {
        const sandboxConfig: Partial<SandboxConfig> = {
          text: '',
          monacoSettings: {
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
          },
          compilerOptions: {
            noResolve: true,
            strict: true,
            target: main.languages.typescript.ScriptTarget.ESNext,
            jsx: props.jsx
              ? main.languages.typescript.JsxEmit.React
              : undefined,
            module: main.languages.typescript.ModuleKind.ESNext,
          },
          domID: editorEmbedId,
        };

        sandboxInstance = sandboxFactory.createTypeScriptSandbox(
          sandboxConfig,
          main,
          ts,
        );

        const webLinter = linter.loadLinter();

        props.onLoaded(webLinter.ruleNames, sandboxInstance.supportedVersions);

        setServices({
          fixes,
          main,
          sandboxInstance,
          webLinter,
        });
      })
      .catch(setServices);

    return (): void => {
      if (!sandboxInstance) {
        return;
      }

      const editorModel = sandboxInstance.editor.getModel()!;
      sandboxInstance.monaco.editor.setModelMarkers(
        editorModel,
        sandboxInstance.editor.getId(),
        [],
      );
      sandboxInstance.editor.dispose();
      editorModel.dispose();
      const models = sandboxInstance.monaco.editor.getModels();
      for (const model of models) {
        model.dispose();
      }
    };
  }, [props.ts]);

  return services;
};
