/**
 * @fileoverview Enforces naming of generic type variables.
 */
'use strict';

const util = require('../util');

/**
 *
 * @param {any} context ESLint context
 * @param {string} rule Option
 * @returns {Function} Node's visitor function
 */
function createTypeParameterChecker(context, rule) {
  const regex = new RegExp(rule);

  return function checkTypeParameters(pnode) {
    const params = pnode.typeParameters && pnode.typeParameters.parameters;

    if (!Array.isArray(params) || params.length === 0) {
      return;
    }
    params.forEach(node => {
      const type = node.type;

      if (type === 'TSTypeParameter' || type === 'TypeParameter') {
        const name = node.name;

        if (name && !regex.test(name)) {
          const data = { name, rule };

          context.report({
            node,
            messageId: 'paramNotMatchRule',
            data
          });
        }
      }
    });
  };
}

const defaultOptions = [
  // Matches: T , TA , TAbc , TA1Bca , T1 , T2
  '^T([A-Z0-9][a-zA-Z0-9]*){0,1}$'
];

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforces naming of generic type variables',
      category: 'TypeScript',
      url: util.metaDocsUrl('generic-type-naming')
    },
    messages: {
      paramNotMatchRule: 'Type parameter {{name}} does not match rule {{rule}}.'
    },
    schema: [
      {
        type: 'string'
      }
    ],
    recommended: 'error'
  },

  create(context) {
    const rule = util.applyDefault(defaultOptions, context.options)[0];
    const checkTypeParameters = createTypeParameterChecker(context, rule);

    return {
      VariableDeclarator: checkTypeParameters,
      ClassDeclaration: checkTypeParameters,
      InterfaceDeclaration: checkTypeParameters,
      TSInterfaceDeclaration: checkTypeParameters,
      FunctionDeclaration: checkTypeParameters,
      TSCallSignature: checkTypeParameters,
      CallSignature: checkTypeParameters
    };
  }
};
