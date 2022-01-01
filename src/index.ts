import {
  ASTVisitor,
  FieldNode,
  GraphQLError,
  GraphQLObjectType,
  ValidationContext
} from 'graphql'

export function createValidation(
  defaultAllow = 1,
  directiveName = 'noAlias',
  errorFn?: typeof createErrorMsg
): {
  typeDefs: string
  validation: (context: ValidationContext) => ASTVisitor
} {
  return {
    typeDefs: `directive @${directiveName}(allow: Int = ${defaultAllow}) on FIELD_DEFINITION`,
    validation(context: ValidationContext): ASTVisitor {
      const ast: ASTVisitor = {
        Field: {
          leave: createFieldValidation(
            context,
            directiveName,
            defaultAllow,
            errorFn ? errorFn : createErrorMsg
          )
        }
      }

      return ast
    }
  }
}

function createFieldValidation(
  context: ValidationContext,
  directiveName: string,
  defaultAllow: number,
  errorFn: typeof createErrorMsg
): (node: FieldNode) => void {
  const schema = context.getSchema()

  const allowedCount: Map<'Query' | 'Mutation', Map<string, number>> = new Map()

  allowedCount.set(
    'Query',
    createMaxAllowedTable(defaultAllow, directiveName, schema.getQueryType())
  )
  allowedCount.set(
    'Mutation',
    createMaxAllowedTable(defaultAllow, directiveName, schema.getMutationType())
  )

  const currentCount: Map<'Query' | 'Mutation', Map<string, number>> = new Map()
  currentCount.set('Query', new Map())
  currentCount.set('Mutation', new Map())

  return (node: FieldNode) => {
    const parentTypeName = context.getParentType()?.name

    if (parentTypeName === 'Query' || parentTypeName === 'Mutation') {
      checkCount(
        context,
        node,
        allowedCount.get(parentTypeName)!,
        currentCount.get(parentTypeName)!,
        errorFn
      )
    }
  }
}
/**
 */
//https://graphql.org/graphql-js/language/#visitor

function checkCount(
  ctx: ValidationContext,
  node: FieldNode,
  maxAllowedPool: Map<string, number>,
  currentCountPool: Map<string, number>,
  errorFn: typeof createErrorMsg
): void {
  const nodeName = node.name.value
  const typeName = ctx.getParentType()!.name
  const maxAllowed = maxAllowedPool.get(nodeName)

  if (maxAllowed) {
    let currentCount = currentCountPool.get(nodeName) ?? 0
    currentCount++
    if (currentCount > maxAllowed) {
      ctx.reportError(errorFn(typeName, nodeName, maxAllowed, node, ctx))

      return
    }

    currentCountPool.set(nodeName, currentCount)
  }
}

function createMaxAllowedTable(
  defaultAllow: number,
  directiveName: string,
  type?: GraphQLObjectType | null
): Map<string, number> {
  const maxAllowed = new Map<string, number>()

  if (type?.astNode?.fields) {
    for (const field of Object.values(type.astNode.fields)) {
      const data = field.directives
        ?.filter((directive) => directive.name.value === directiveName)
        .map((dir) => {
          if (dir.arguments && dir.arguments[0]) {
            return {
              name: field.name.value,
              // @ts-expect-error - wrong types
              allow: parseInt(dir.arguments[0].value.value, 10)
            }
          }

          return {
            name: field.name.value,
            allow: defaultAllow
          }
        })[0]
      if (data) {
        maxAllowed.set(data.name, data.allow)
      }
    }

    return maxAllowed
  }

  return new Map()
}

function createErrorMsg(
  typeName: string,
  fieldName: string,
  maxallowed: number,
  _node: FieldNode,
  _ctx: ValidationContext
): GraphQLError {
  return new GraphQLError(
    `Allowed number of calls for ${typeName}->${fieldName} has been exceeded (max: ${maxallowed})`
  )
}
