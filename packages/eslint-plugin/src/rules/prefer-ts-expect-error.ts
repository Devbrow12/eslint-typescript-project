import type { TSESTree } from '@typescript-eslint/utils';
import { AST_TOKEN_TYPES } from '@typescript-eslint/utils';
import type { RuleFix, RuleFixer } from '@typescript-eslint/utils/ts-eslint';

import { createRule } from '../util';

type MessageIds = 'preferExpectErrorComment';

export default createRule<[], MessageIds>({
  name: 'prefer-ts-expect-error',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce using `@ts-expect-error` over `@ts-ignore`',
      recommended: 'strict',
    },
    fixable: 'code',
    messages: {
      preferExpectErrorComment:
        'Use "@ts-expect-error" to ensure an error is actually being suppressed.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const tsIgnoreRegExpSingleLine = /^\s*\/?\s*@ts-ignore/;
    const tsIgnoreRegExpMultiLine = /^\s*(?:\/|\*)*\s*@ts-ignore/;

    function isLineComment(comment: TSESTree.Comment): boolean {
      return comment.type === AST_TOKEN_TYPES.Line;
    }

    function getLastCommentLine(comment: TSESTree.Comment): string {
      if (isLineComment(comment)) {
        return comment.value;
      }

      // For multiline comments - we look at only the last line.
      const commentlines = comment.value.split('\n');
      return commentlines[commentlines.length - 1];
    }

    function isValidTsIgnorePresent(comment: TSESTree.Comment): boolean {
      const line = getLastCommentLine(comment);
      return isLineComment(comment)
        ? tsIgnoreRegExpSingleLine.test(line)
        : tsIgnoreRegExpMultiLine.test(line);
    }

    return {
      Program(): void {
        const comments = context.sourceCode.getAllComments();
        comments.forEach(comment => {
          if (isValidTsIgnorePresent(comment)) {
            const lineCommentRuleFixer = (fixer: RuleFixer): RuleFix =>
              fixer.replaceText(
                comment,
                `//${comment.value.replace('@ts-ignore', '@ts-expect-error')}`,
              );

            const blockCommentRuleFixer = (fixer: RuleFixer): RuleFix =>
              fixer.replaceText(
                comment,
                `/*${comment.value.replace(
                  '@ts-ignore',
                  '@ts-expect-error',
                )}*/`,
              );

            context.report({
              node: comment,
              messageId: 'preferExpectErrorComment',
              fix: isLineComment(comment)
                ? lineCommentRuleFixer
                : blockCommentRuleFixer,
            });
          }
        });
      },
    };
  },
});
