import {
  ASTVisitor,
  FieldNode,
  GraphQLError,
  GraphQLObjectType,
  ValidationContext
} from 'graphql'

//https://graphql.org/graphql-js/language/#visitor

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

  //track if the error have already been reported for particular field
  const errorMap: Map<'Query' | 'Mutation', Map<string, boolean>> = new Map()
  errorMap.set('Query', new Map())
  errorMap.set('Mutation', new Map())

  return (node: FieldNode) => {
    const parentTypeName = context.getParentType()?.name

    if (parentTypeName === 'Query' || parentTypeName === 'Mutation') {
      checkCount(
        context,
        node,
        allowedCount.get(parentTypeName)!,
        currentCount.get(parentTypeName)!,
        errorFn,
        errorMap.get(parentTypeName)!
      )
    }
  }
}

/**
 */

function checkCount(
  ctx: ValidationContext,
  node: FieldNode,
  maxAllowedData: Map<string, number>,
  currentCountData: Map<string, number>,
  errorFn: typeof createErrorMsg,
  errorMap: Map<string, boolean>
): void {
  const nodeName = node.name.value
  const typeName = ctx.getParentType()!.name
  const maxAllowed = maxAllowedData.get(nodeName)

  if (maxAllowed) {
    let currentCount = currentCountData.get(nodeName) ?? 0
    currentCount++
    if (currentCount > maxAllowed) {
      // check if already reported for the current field
      if (!errorMap.get(nodeName)) {
        ctx.reportError(errorFn(typeName, nodeName, maxAllowed, node, ctx))
        errorMap.set(nodeName, true)
      }

      return
    }

    currentCountData.set(nodeName, currentCount)
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
