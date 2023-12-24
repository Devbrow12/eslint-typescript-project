import { AST_TOKEN_TYPES, TSESTree } from '@typescript-eslint/utils';
import { getSourceCode } from '@typescript-eslint/utils/eslint-utils';

import type {
  InferMessageIdsTypeFromRule,
  InferOptionsTypeFromRule,
} from '../util';
import { createRule, isNotOpeningParenToken } from '../util';
import { getESLintCoreRule } from '../util/getESLintCoreRule';

const baseRule = getESLintCoreRule('space-infix-ops');

export type Options = InferOptionsTypeFromRule<typeof baseRule>;
export type MessageIds = InferMessageIdsTypeFromRule<typeof baseRule>;

const UNIONS = ['|', '&'];

export default createRule<Options, MessageIds>({
  name: 'space-infix-ops',
  meta: {
    deprecated: true,
    replacedBy: ['@stylistic/space-infix-ops'],
    type: 'layout',
    docs: {
      description: 'Require spacing around infix operators',
      extendsBaseRule: true,
    },
    fixable: baseRule.meta.fixable,
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema: baseRule.meta.schema,
    messages: {
      // @ts-expect-error -- we report on this messageId so we need to ensure it's there in case ESLint changes in future
      missingSpace: "Operator '{{operator}}' must be spaced.",
      ...baseRule.meta.messages,
    },
  },
  defaultOptions: [
    {
      int32Hint: false,
    },
  ],
  create(context) {
    const rules = baseRule.create(context);
    const sourceCode = getSourceCode(context);

    function report(operator: TSESTree.Token): void {
      context.report({
        node: operator,
        messageId: 'missingSpace',
        data: {
          operator: operator.value,
        },
        fix(fixer) {
          const previousToken = sourceCode.getTokenBefore(operator);
          const afterToken = sourceCode.getTokenAfter(operator);
          let fixString = '';

          if (operator.range[0] - previousToken!.range[1] === 0) {
            fixString = ' ';
          }

          fixString += operator.value;

          if (afterToken!.range[0] - operator.range[1] === 0) {
            fixString += ' ';
          }

          return fixer.replaceText(operator, fixString);
        },
      });
    }

    function isSpaceChar(token: TSESTree.Token): boolean {
      return (
        token.type === AST_TOKEN_TYPES.Punctuator && /^[=?:]$/.test(token.value)
      );
    }

    function checkAndReportAssignmentSpace(
      leftNode: TSESTree.Node | TSESTree.Token | null,
      rightNode?: TSESTree.Node | TSESTree.Token | null,
    ): void {
      if (!rightNode || !leftNode) {
        return;
      }

      const operator = sourceCode.getFirstTokenBetween(
        leftNode,
        rightNode,
        isSpaceChar,
      )!;

      const prev = sourceCode.getTokenBefore(operator)!;
      const next = sourceCode.getTokenAfter(operator)!;

      if (
        !sourceCode.isSpaceBetween!(prev, operator) ||
        !sourceCode.isSpaceBetween!(operator, next)
      ) {
        report(operator);
      }
    }

    /**
     * Check if it has an assignment char and report if it's faulty
     * @param node The node to report
     */
    function checkForEnumAssignmentSpace(node: TSESTree.TSEnumMember): void {
      checkAndReportAssignmentSpace(node.id, node.initializer);
    }

    /**
     * Check if it has an assignment char and report if it's faulty
     * @param node The node to report
     */
    function checkForPropertyDefinitionAssignmentSpace(
      node: TSESTree.PropertyDefinition,
    ): void {
      const leftNode =
        node.optional && !node.typeAnnotation
          ? sourceCode.getTokenAfter(node.key)
          : node.typeAnnotation ?? node.key;

      checkAndReportAssignmentSpace(leftNode, node.value);
    }

    /**
     * Check if it is missing spaces between type annotations chaining
     * @param typeAnnotation TypeAnnotations list
     */
    function checkForTypeAnnotationSpace(
      typeAnnotation: TSESTree.TSIntersectionType | TSESTree.TSUnionType,
    ): void {
      const types = typeAnnotation.types;

      types.forEach(type => {
        const skipFunctionParenthesis =
          type.type === TSESTree.AST_NODE_TYPES.TSFunctionType
            ? isNotOpeningParenToken
            : 0;
        const operator = sourceCode.getTokenBefore(
          type,
          skipFunctionParenthesis,
        );

        if (operator != null && UNIONS.includes(operator.value)) {
          const prev = sourceCode.getTokenBefore(operator);
          const next = sourceCode.getTokenAfter(operator);

          if (
            !sourceCode.isSpaceBetween!(prev!, operator) ||
            !sourceCode.isSpaceBetween!(operator, next!)
          ) {
            report(operator);
          }
        }
      });
    }

    /**
     * Check if it has an assignment char and report if it's faulty
     * @param node The node to report
     */
    function checkForTypeAliasAssignment(
      node: TSESTree.TSTypeAliasDeclaration,
    ): void {
      checkAndReportAssignmentSpace(
        node.typeParameters ?? node.id,
        node.typeAnnotation,
      );
    }

    function checkForTypeConditional(node: TSESTree.TSConditionalType): void {
      checkAndReportAssignmentSpace(node.extendsType, node.trueType);
      checkAndReportAssignmentSpace(node.trueType, node.falseType);
    }

    return {
      ...rules,
      TSEnumMember: checkForEnumAssignmentSpace,
      PropertyDefinition: checkForPropertyDefinitionAssignmentSpace,
      TSTypeAliasDeclaration: checkForTypeAliasAssignment,
      TSUnionType: checkForTypeAnnotationSpace,
      TSIntersectionType: checkForTypeAnnotationSpace,
      TSConditionalType: checkForTypeConditional,
    };
  },
});
