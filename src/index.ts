import {
  ASTVisitor,
  ConstDirectiveNode,
  FieldDefinitionNode,
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
    typeDefs: `directive @${directiveName}(allow: Int = ${defaultAllow}) on OBJECT | FIELD_DEFINITION`,
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

  const allowedCount = createMaxAllowedTable(defaultAllow, directiveName, [
    schema.getQueryType(),
    schema.getMutationType()
  ])
  const currentCount: Map<string, number> = new Map()
  //track if the error have already been reported for particular field
  const errorMap: Map<string, boolean> = new Map()

  return (node: FieldNode) => {
    const parentTypeName = context.getParentType()?.name

    if (parentTypeName === 'Query' || parentTypeName === 'Mutation') {
      checkCount(context, node, allowedCount, currentCount, errorFn, errorMap)
    }
  }
}

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
  const key = `${typeName}-${nodeName}`
  const maxAllowed = maxAllowedData.get(key)

  if (maxAllowed) {
    let currentCount = currentCountData.get(key) ?? 0
    currentCount++
    if (currentCount > maxAllowed) {
      // check if already reported for the current field
      if (!errorMap.get(key)) {
        ctx.reportError(errorFn(typeName, nodeName, maxAllowed, node, ctx))
        errorMap.set(key, true)
      }

      return
    }

    currentCountData.set(key, currentCount)
  }
}

function createMaxAllowedTable(
  defaultAllow: number,
  directiveName: string,
  types: (GraphQLObjectType | undefined | null)[]
): Map<string, number> {
  const maxAllowed = new Map<string, number>()

  for (const graphType of types) {
    const value = graphType
      ? processDirective(
          directiveName,
          defaultAllow,
          // @ts-expect-error - directives array is typed as readonly
          graphType?.astNode?.directives
        )
      : undefined

    if (value) {
      maxAllowed.set(`${graphType?.name}`, value)
    }

    if (graphType?.astNode?.fields) {
      for (const field of Object.values(graphType.astNode.fields)) {
        const value = processDirective(
          directiveName,
          defaultAllow,
          // @ts-expect-error - directives array is typed as readonly
          field.directives
        )
        if (value) {
          maxAllowed.set(`${graphType}-${field.name.value}`, value)
        }
      }
    }
  }

  return maxAllowed
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

function processDirective(
  directiveName: string,
  defaultAllow: number,
  directives?: ConstDirectiveNode[]
): number | undefined {
  return directives
    ?.filter((directive) => directive.name.value === directiveName)
    .map((dir) => {
      if (dir.arguments && dir.arguments[0]) {
        // @ts-expect-error - wrong types
        return parseInt(dir.arguments[0].value.value, 10)
      }

      return defaultAllow
    })[0]
}
