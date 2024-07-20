// any is required to work around manipulating the AST in weird ways
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import type {
  InferMessageIdsTypeFromRule,
  InferOptionsTypeFromRule,
} from '../util';
import { createRule, isOpeningParenToken, isTypeAssertion } from '../util';
import { getESLintCoreRule } from '../util/getESLintCoreRule';

const baseRule = getESLintCoreRule('no-extra-parens');

type Options = InferOptionsTypeFromRule<typeof baseRule>;
type MessageIds = InferMessageIdsTypeFromRule<typeof baseRule>;

export default createRule<Options, MessageIds>({
  name: 'no-extra-parens',
  meta: {
    deprecated: true,
    replacedBy: ['@stylistic/ts/no-extra-parens'],
    type: 'layout',
    docs: {
      description: 'Disallow unnecessary parentheses',
      extendsBaseRule: true,
    },
    fixable: 'code',
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema: baseRule.meta.schema,
    messages: baseRule.meta.messages,
  },
  defaultOptions: ['all'],
  create(context) {
    const rules = baseRule.create(context);

    function binaryExp(
      node: TSESTree.BinaryExpression | TSESTree.LogicalExpression,
    ): void {
      const rule = rules.BinaryExpression as (n: typeof node) => void;

      // makes the rule think it should skip the left or right
      const isLeftTypeAssertion = isTypeAssertion(node.left);
      const isRightTypeAssertion = isTypeAssertion(node.right);
      if (isLeftTypeAssertion && isRightTypeAssertion) {
        return; // ignore
      }
      if (isLeftTypeAssertion) {
        return rule({
          ...node,
          left: {
            ...node.left,
            type: AST_NODE_TYPES.SequenceExpression as any,
          },
        });
      }
      if (isRightTypeAssertion) {
        return rule({
          ...node,
          right: {
            ...node.right,
            type: AST_NODE_TYPES.SequenceExpression as any,
          },
        });
      }

      return rule(node);
    }
    function callExp(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): void {
      const rule = rules.CallExpression as (n: typeof node) => void;

      if (isTypeAssertion(node.callee)) {
        // reduces the precedence of the node so the rule thinks it needs to be wrapped
        return rule({
          ...node,
          callee: {
            ...node.callee,
            type: AST_NODE_TYPES.SequenceExpression as any,
          },
        });
      }

      if (
        node.arguments.length === 1 &&
        // is there any opening parenthesis in type arguments
        context.sourceCode.getTokenAfter(node.callee, isOpeningParenToken) !==
          context.sourceCode.getTokenBefore(
            node.arguments[0],
            isOpeningParenToken,
          )
      ) {
        return rule({
          ...node,
          arguments: [
            {
              ...node.arguments[0],
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          ],
        });
      }

      return rule(node);
    }
    function unaryUpdateExpression(
      node: TSESTree.UnaryExpression | TSESTree.UpdateExpression,
    ): void {
      const rule = rules.UnaryExpression as (n: typeof node) => void;

      if (isTypeAssertion(node.argument)) {
        // reduces the precedence of the node so the rule thinks it needs to be wrapped
        return rule({
          ...node,
          argument: {
            ...node.argument,
            type: AST_NODE_TYPES.SequenceExpression as any,
          },
        });
      }

      return rule(node);
    }

    const overrides: TSESLint.RuleListener = {
      // ArrayExpression
      ArrowFunctionExpression(node) {
        if (!isTypeAssertion(node.body)) {
          return rules.ArrowFunctionExpression(node);
        }
      },
      // AssignmentExpression
      AwaitExpression(node) {
        if (isTypeAssertion(node.argument)) {
          // reduces the precedence of the node so the rule thinks it needs to be wrapped
          return rules.AwaitExpression({
            ...node,
            argument: {
              ...node.argument,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }
        return rules.AwaitExpression(node);
      },
      BinaryExpression: binaryExp,
      CallExpression: callExp,
      ClassDeclaration(node) {
        if (node.superClass?.type === AST_NODE_TYPES.TSAsExpression) {
          return rules.ClassDeclaration({
            ...node,
            superClass: {
              ...node.superClass,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }
        return rules.ClassDeclaration(node);
      },
      ClassExpression(node) {
        if (node.superClass?.type === AST_NODE_TYPES.TSAsExpression) {
          return rules.ClassExpression({
            ...node,
            superClass: {
              ...node.superClass,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }
        return rules.ClassExpression(node);
      },
      ConditionalExpression(node) {
        // reduces the precedence of the node so the rule thinks it needs to be wrapped
        if (isTypeAssertion(node.test)) {
          return rules.ConditionalExpression({
            ...node,
            test: {
              ...node.test,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }
        if (isTypeAssertion(node.consequent)) {
          return rules.ConditionalExpression({
            ...node,
            consequent: {
              ...node.consequent,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }
        if (isTypeAssertion(node.alternate)) {
          // reduces the precedence of the node so the rule thinks it needs to be wrapped
          return rules.ConditionalExpression({
            ...node,
            alternate: {
              ...node.alternate,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }
        return rules.ConditionalExpression(node);
      },
      ForInStatement(node): void {
        if (isTypeAssertion(node.right)) {
          // as of 7.20.0 there's no way to skip checking the right of the ForIn
          // so just don't validate it at all
          return;
        }

        return rules.ForInStatement(node);
      },
      ForOfStatement(node): void {
        if (isTypeAssertion(node.right)) {
          // makes the rule skip checking of the right
          return rules.ForOfStatement({
            ...node,
            type: AST_NODE_TYPES.ForOfStatement,
            right: {
              ...node.right,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }

        return rules.ForOfStatement(node);
      },
      // DoWhileStatement
      ForStatement(node) {
        // make the rule skip the piece by removing it entirely
        if (node.init && isTypeAssertion(node.init)) {
          return rules.ForStatement({
            ...node,
            init: null,
          });
        }
        if (node.test && isTypeAssertion(node.test)) {
          return rules.ForStatement({
            ...node,
            test: null,
          });
        }
        if (node.update && isTypeAssertion(node.update)) {
          return rules.ForStatement({
            ...node,
            update: null,
          });
        }

        return rules.ForStatement(node);
      },
      'ForStatement > *.init:exit'(node: TSESTree.Node) {
        if (!isTypeAssertion(node)) {
          return rules['ForStatement > *.init:exit'](node);
        }
      },
      // IfStatement
      LogicalExpression: binaryExp,
      MemberExpression(node) {
        if (isTypeAssertion(node.object)) {
          // reduces the precedence of the node so the rule thinks it needs to be wrapped
          return rules.MemberExpression({
            ...node,
            object: {
              ...node.object,
              type: AST_NODE_TYPES.SequenceExpression as any,
            },
          });
        }

        return rules.MemberExpression(node);
      },
      NewExpression: callExp,
      // ObjectExpression
      // ReturnStatement
      // SequenceExpression
      SpreadElement(node) {
        if (!isTypeAssertion(node.argument)) {
          return rules.SpreadElement(node);
        }
      },
      SwitchCase(node) {
        if (node.test && !isTypeAssertion(node.test)) {
          return rules.SwitchCase(node);
        }
      },
      // SwitchStatement
      ThrowStatement(node) {
        if (node.argument && !isTypeAssertion(node.argument)) {
          return rules.ThrowStatement(node);
        }
      },
      UnaryExpression: unaryUpdateExpression,
      UpdateExpression: unaryUpdateExpression,
      // VariableDeclarator
      // WhileStatement
      // WithStatement - i'm not going to even bother implementing this terrible and never used feature
      YieldExpression(node) {
        if (node.argument && !isTypeAssertion(node.argument)) {
          return rules.YieldExpression(node);
        }
      },
    };
    return { ...rules, ...overrides };
  },
});
